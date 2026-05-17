namespace CrmModern.Core.DTOs.Purchase;

public sealed record ApprovalActionDto(string? Aciklama);

public sealed record PurchaseRequestFilterDto(
    string?   TalepEden,
    string?   Departman,
    string?   Durum,
    string?   TalepTipi,
    DateTime? BaslangicTarih,
    DateTime? BitisTarih,
    int       Page     = 1,
    int       PageSize = 50);

public sealed record PurchaseRequestPageDto(
    IReadOnlyList<PurchaseRequestListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
