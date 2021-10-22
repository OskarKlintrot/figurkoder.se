using Figurkoder.Domain;

namespace Figurkoder.Application.Queries;

public interface IMnemonicQueries
{
    Task<Mnemonic?> GetMnemonicAsync(string id);
    Task<ICollection<MnemonicInfo>> GetMnemonicsInfoAsync();
}
