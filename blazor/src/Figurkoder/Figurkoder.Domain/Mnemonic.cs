using System.Collections.Generic;
using System.Linq;

namespace Figurkoder.Domain
{
    public class Mnemonic
    {
        public string Title { get; }
        public string Description { get; }
        public KeyValuePair<string, string>[] Pairs { get; }
        public bool Numerical => Pairs.All(y => int.TryParse(y.Key, out var _));

        public Mnemonic(string title, string description, KeyValuePair<string, string>[] pairs)
        {
            Title = title;
            Description = description;
            Pairs = pairs;
        }
    }
}
