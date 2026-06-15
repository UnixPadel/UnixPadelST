namespace CrmModern.Core.DTOs.Order;

/// <summary>Round-8 §7 — yerinde düzenleme isteği: yeni içerik + zorunlu gerekçe.</summary>
public sealed record AmendOrderRequest(CreateOrderDto Order, string Gerekce);

/// <summary>Round-8 §7 — yumuşak silme isteği: zorunlu gerekçe.</summary>
public sealed record DeleteOrderRequest(string Gerekce);
