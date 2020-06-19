using Figurkoder.Application.Queries;
using Figurkoder.Domain;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;

namespace Figurkoder.Infrastructure.Queries
{
    public class MnemonicQueries : IMnemonicQueries
    {
        private static readonly AsyncLazy<IDictionary<string, Mnemonic>> _mnemonics
            = new AsyncLazy<IDictionary<string, Mnemonic>>(LoadMnemonicsAsync);

        public async Task<ICollection<MnemonicInfo>> GetMnemonicsInfoAsync()
        {
            var mnemonics = await _mnemonics.Value;

            return mnemonics
                .Select(x => new MnemonicInfo(
                    id: x.Key,
                    title: x.Value.Title,
                    description: x.Value.Description,
                    first: x.Value.Pairs[0].Key,
                    last: x.Value.Pairs[^1].Key,
                    numerical: x.Value.Pairs.All(y => int.TryParse(y.Key, out var _))))
                .ToList();
        }

        public async Task<Mnemonic?> GetMnemonicAsync(string id)
        {
            var mnemonics = await _mnemonics.Value;

            return mnemonics.TryGetValue(id, out var mnemonic)
                ? mnemonic
                : null;
        }

        private static async Task<IDictionary<string, Mnemonic>> LoadMnemonicsAsync()
        {
            var assembly = typeof(MnemonicQueries).Assembly;

            var mnemonics = new Dictionary<string, Mnemonic>();

            await foreach (var item in GetMnemonicsAsync(assembly, assembly
                .GetManifestResourceNames()
                .Where(x => x.StartsWith("Figurkoder.Infrastructure.Data.") && x.EndsWith(".json"))
                .OrderBy(x => x.Split('.')[^2])))
            {
                mnemonics.Add(item.Id, item.Mnemonic);
            }

            return mnemonics;

            static async IAsyncEnumerable<(string Id, Mnemonic Mnemonic)> GetMnemonicsAsync(Assembly assembly, IEnumerable<string> resourceNames)
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    ReadCommentHandling = JsonCommentHandling.Skip
                };

                foreach (var name in resourceNames)
                {
                    using var stream = assembly.GetManifestResourceStream(name);

                    var mnemonic = await JsonSerializer.DeserializeAsync<MnemonicDto>(stream, options);

                    yield return (
                        name.Split('.')[^2],
                        new Mnemonic(mnemonic.Title, mnemonic.Description, mnemonic.Pairs.Select(x => KeyValuePair.Create(x[0], x[1])).ToArray())
                    );
                }
            }
        }

        private class MnemonicDto
        {
            public string Title { get; set; } = null!;
            public string Description { get; set; } = null!;
            public string[][] Pairs { get; set; } = null!;
        }
    }
}
