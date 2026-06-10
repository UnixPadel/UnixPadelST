namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Product category entry for the anaUrunComboBox dropdowns.
/// Fiyat is the default price loaded into setFiyatTextBox on selection.
/// PROMPT-v3 §2.5: frontend `categories.fiyat` okur — JSON adı `fiyat` olmalı
/// (eski `BaseFiyat` adı `baseFiyat` serileşip prefill'i sessizce kırıyordu).
/// </summary>
public sealed record ProductCategoryDto(
    int     KategoriID,
    string  KategoriAdi,
    decimal Fiyat
);
