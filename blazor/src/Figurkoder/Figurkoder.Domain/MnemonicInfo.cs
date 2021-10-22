namespace Figurkoder.Domain;

public record MnemonicInfo(
    string Id,
    string Title,
    string Description,
    string First,
    string Last,
    bool Numerical);
