namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Component entry for the bilesenCheckedListBox population.
/// DefaultAdet comes from KategoriBilesenleri.Adet for the selected category.
/// Attributes populates the Oznitelik combobox cells in the DataGridView.
/// </summary>
public sealed record ComponentDto(
    int     BilesenID,
    string  BilesenAdi,
    string? Birim,
    int     DefaultAdet,
    IReadOnlyList<string> Attributes
);
