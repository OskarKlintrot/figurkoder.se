using Figurkoder.Domain;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Figurkoder.Application.Queries
{
    public interface IMnemonicQueries
    {
        Task<Mnemonic?> GetMnemonicAsync(string id);
        Task<ICollection<MnemonicInfo>> GetMnemonicsInfoAsync();
    }
}