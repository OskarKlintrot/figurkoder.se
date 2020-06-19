using Figurkoder.Infrastructure.Queries;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Figurkoder.IntegrationTests.Infrastructure.Queries
{
    public class MnemonicQueriesFacts
    {
        [Fact]
        public async Task GetMnemonicsInfoAsync_EmbeddedResourcesAvailable_ReturnAll()
        {
            // Arrange
            var repository = new MnemonicQueries();

            // Act
            var all = await repository.GetMnemonicsInfoAsync();

            // Assert
            Assert.Equal(8, all.Count);
            Assert.Equal("1-TwoDigits", all.First().Id);
            Assert.Equal("Siffror", all.First().Title);
            Assert.Equal(string.Empty, all.First().Description);
            Assert.Equal("00", all.First().First);
            Assert.Equal("99", all.First().Last);
            Assert.True(all.First().Numerical);
        }

        [Fact]
        public async Task GetMnemonicAsync_EmbeddedResourcesAvailable_ReturnMnemonic()
        {
            // Arrange
            var repository = new MnemonicQueries();

            // Act
            var mnemonic = await repository.GetMnemonicAsync("1-TwoDigits");

            // Assert
            Assert.NotNull(mnemonic);
            Assert.Equal("Siffror", mnemonic!.Title);
            Assert.Equal(string.Empty, mnemonic.Description);
            Assert.True(mnemonic.Numerical);
            Assert.Equal(100, mnemonic.Pairs.Length);
            Assert.Equal("00", mnemonic.Pairs[0].Key);
            Assert.Equal("99", mnemonic.Pairs[^1].Key);
        }

        [Fact]
        public async Task GetMnemonicAsync_EmbeddedResourcesNotAvailable_ReturnNull()
        {
            // Arrange
            var repository = new MnemonicQueries();

            // Act
            var mnemonic = await repository.GetMnemonicAsync("Not a proper key");

            // Assert
            Assert.Null(mnemonic);
        }
    }
}
