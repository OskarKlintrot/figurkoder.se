using System.Collections.Generic;
using System.Linq;

namespace Figurkoder.Domain
{
    public record Mnemonic(string Title, string Description, Flashcard[] Pairs)
    {
        public bool Numerical => Pairs.All(y => int.TryParse(y.Key, out var _));
    }
}
