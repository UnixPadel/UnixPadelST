namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Product category entry for the anaUrunComboBox dropdowns.
/// BaseFiyat is the default price loaded into setFiyatTextBox on selection.
/// </summary>
public sealed record ProductCategoryDto(
    int     KategoriID,
    string  KategoriAdi,
    decimal BaseFiyat
);
