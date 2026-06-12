using CrmModern.Core.DTOs.Order;
using CrmModern.Core.DTOs.QualityControl;
using CrmModern.Core.Exceptions;
using CrmModern.Core.Interfaces;
using CrmModern.Core.Interfaces.Services;

namespace CrmModern.Infrastructure.Services;

/// <summary>
/// Kontrol / KontrolRed WinForms ekranları.
/// Onay/red akışı OrderService'in audit-yazan ApproveOrderAsync/RejectOrderAsync'ine
/// delege edilir — Faz 3 ile davranış birebir.
/// </summary>
internal sealed class QualityControlService(IUnitOfWork uow, IOrderService orderService) : IQualityControlService
{
    public async Task<IReadOnlyList<QualityControlListDto>> GetPendingAsync()
    {
        var orders = await uow.Orders.GetPendingQualityControlAsync();
        return orders.Select(MapToListDto).ToList().AsReadOnly();
    }

    public Task<OrderDetailDto> GetByIdAsync(string siparisNo) =>
        orderService.GetByNoAsync(siparisNo);

    public Task<IReadOnlyList<OrderApprovalDto>> GetControlHistoryAsync(string siparisNo) =>
        orderService.GetApprovalHistoryAsync(siparisNo);

    public Task ApproveAsync(string siparisNo, int currentUserId, string? kontrolNot) =>
        // Guard'lar (Kontrol<>'Onay', aşama Teklif/Siparis) OrderService
        // .ApproveOrderAsync içinde tek noktada. PROMPT-v6 §1.1: onay yalnız
        // Kontrol='Onay' yazar — aşama değişmez (v4 §5.1 sapması kalktı).
        orderService.ApproveOrderAsync(siparisNo, currentUserId, kontrolNot);

    public Task RejectAsync(string siparisNo, int currentUserId, string red)
    {
        if (string.IsNullOrWhiteSpace(red))
            throw new BusinessException("Red gerekçesi zorunlu.");

        // Order.Kontrol='Reddet' + Red kolonu + SiparisOnaylari audit;
        // PROMPT-v4 §5.2 guard'ları OrderService.RejectOrderAsync içinde.
        return orderService.RejectOrderAsync(siparisNo, currentUserId, red);
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private static QualityControlListDto MapToListDto(Core.Entities.Order o)
    {
        decimal odenen      = o.OdenenMiktar ?? 0m;
        decimal toplam      = o.ToplamFiyat  ?? 0m;
        decimal pesinOran   = o.PesinYüzde / 100m;
        decimal kaparo      = Math.Max(toplam * pesinOran - odenen, 0m);
        decimal kalanBakiye = toplam - odenen;

        return new QualityControlListDto(
            SiparisNo:        o.SiparisNo,
            MusteriAd:        o.MusteriAd,
            MUlke:            o.MUlke,
            ToplamFiyat:      o.ToplamFiyat,
            KaparoFiyat:      kaparo,
            KalanBakiye:      kalanBakiye,
            PesinYuzde:       o.PesinYüzde,
            TeslimatCesiti:   o.TeslimatÇeşiti,
            ParaTipi:         o.ParaTipi,
            OdemeDurum:       o.OdemeDurum,
            SiparisMiTeklifMi: o.SiparisMiTeklifMi,
            Tarih:            o.Tarih,
            Sirket:           o.Sirket);
    }
}
