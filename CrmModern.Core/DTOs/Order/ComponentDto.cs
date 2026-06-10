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
    // PROMPT-v2 §1b: Birim Fiyat'ın default değeri — BilesenBilgileri.Fiyat.
    // Frontend her satır için düzenlenebilir bir hücrede gösterir.
    int?    DefaultFiyat,
    IReadOnlyList<string> Attributes
);
