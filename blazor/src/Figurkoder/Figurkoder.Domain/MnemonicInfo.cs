namespace Figurkoder.Domain
{
    public class MnemonicInfo
    {
        public string Id { get; }
        public string Title { get; }
        public string Description { get; }
        public string First { get; }
        public string Last { get; }
        public bool Numerical { get; }

        public MnemonicInfo(string id, string title, string description, string first, string last, bool numerical)
        {
            Id = id;
            Title = title;
            Description = description;
            First = first;
            Last = last;
            Numerical = numerical;
        }
    }
}
