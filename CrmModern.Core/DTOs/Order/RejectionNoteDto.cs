namespace CrmModern.Core.DTOs.Order;

/// <summary>
/// Response payload for the "Red Notu" (rejection note) button.
/// Returned when Kontrol = 'Reddet' and the user clicks NotButton.
/// </summary>
public sealed record RejectionNoteDto(string RedNotu);
