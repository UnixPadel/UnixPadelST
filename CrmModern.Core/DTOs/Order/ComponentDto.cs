namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Component entry for the bilesenCheckedListBox population.
/// PROMPT-v3 §2.1 — legacy LEFT JOIN semantics: the list contains EVERY
/// component (BilesenBilgileri); InRecipe marks the ones that have a
/// KategoriBilesenleri row for the selected category (arrive pre-checked).
/// DefaultAdet comes from KategoriBilesenleri.Adet when InRecipe, else 1.
/// Attributes populates the Oznitelik combobox cells in the DataGridView.
/// </summary>
public sealed record ComponentDto(
    int     BilesenID,
    string  BilesenAdi,
    string? Birim,
    bool    InRecipe,
    int     DefaultAdet,
    // PROMPT-v2 §1b: Birim Fiyat'ın default değeri — BilesenBilgileri.Fiyat.
    // Frontend her satır için düzenlenebilir bir hücrede gösterir.
    int?    DefaultFiyat,
    IReadOnlyList<string> Attributes
);
