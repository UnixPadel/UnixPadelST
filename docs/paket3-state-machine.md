# Paket 3 — Lojistik Sevk State Machine

**Tarih:** 2026-05-21
**Schema değişikliği:** YOK (sinyaller mevcut alanlardan türetilir)

## Türetim Kuralları

Sevkin "durumu" iki kaynaktan hesaplanır:

* `SiparisAlTablo.SiparisMiTeklifMi` (Order aşaması)
* `LojistikTablo` satırının VARLIĞI

```
LojistikTablo:YOK + Order=Hazir         → henüz sevk talebi açılmadı
LojistikTablo:VAR + Order=Hazir         → Muhasebe Onayı Bekliyor
LojistikTablo:VAR + Order=Lojistik      → Sevk Yolda
LojistikTablo:VAR + Order=Tamamlandi    → Tamamlandı
```

## Diyagram

```
                              ┌────────────────────────────────┐
                              │  S0: Order=Hazir + Sevk YOK    │
                              │  (sevk talebi açılmamış)       │
                              └───────────────┬────────────────┘
                                              │
                       Lojistik kullanıcı:    │
                       POST /api/logistics    │
                       — LojistikTablo INSERT │
                       — Order.STarih/LNot UPDATE
                       — Order.SiparisMiTeklifMi DEĞİŞMEZ
                       — UPSERT 'LojistikOnayBekliyor'
                                              ▼
        ┌─────────────────────────────────────────────────────────────┐
        │   S1: Order=Hazir + Sevk VAR  ── "Muhasebe Onayı Bekliyor"  │
        └──────────────────┬──────────────────────────┬───────────────┘
                           │                          │
   Muhasebe: muhasebe-approve                     Muhasebe: muhasebe-reject
   — Order: Hazir→Lojistik                        — LojistikTablo DELETE
   — UPSERT 'LojistikOnaylandi'                   — Order='Hazir' kalır
                           │                       — UPSERT 'LojistikReddedildi'
                           ▼                          ▼
        ┌─────────────────────────────────┐   ┌─────────────────────┐
        │  S2: Order=Lojistik + Sevk VAR  │   │ S0'a geri dönüş      │
        │  "Sevk Yolda"                   │   │ (Hazir + Sevk YOK)   │
        └────────────┬────────────────────┘   └─────────────────────┘
                     │
        Lojistik: complete  ─────────┐               Lojistik: cancel
        — Order='Tamamlandi'         │               — LojistikTablo DELETE
        — TamamlandiTablo INSERT     │               — Order: Lojistik→Hazir
        — UPSERT 'Onaylandi'         │               — UPSERT 'Reddedildi'
                                     ▼                       │
        ┌─────────────────────────────────┐                  │
        │ S3: Order=Tamamlandi + Sevk VAR │                  │
        │  "Tamamlandı"                   │                  │
        └─────────────────────────────────┘                  ▼
                                                    (S0'a geri — Hazir + Sevk YOK)
```

## Geçiş Tablosu

| Geçiş                      | Endpoint                                        | Yetki              | LojistikTablo | Order.SiparisMiTeklifMi | SiparisOnaylari (UPSERT) |
|----------------------------|-------------------------------------------------|---------------------|---------------|--------------------------|---------------------------|
| S0 → S1 (talep aç)         | `POST /api/logistics`                            | Yonetici, Lojistik  | INSERT        | Hazir (değişmez)         | `LojistikOnayBekliyor`    |
| S1 → S2 (muhasebe onay)    | `POST /api/logistics/{sevkId}/muhasebe-approve` | Yonetici, Muhasebe  | aynı           | Hazir → Lojistik          | `LojistikOnaylandi`        |
| S1 → S0 (muhasebe red)     | `POST /api/logistics/{sevkId}/muhasebe-reject`  | Yonetici, Muhasebe  | DELETE        | Hazir (değişmez)         | `LojistikReddedildi`       |
| S2 → S3 (tamamla)          | `POST /api/logistics/{sevkId}/complete`         | Yonetici, Lojistik  | aynı           | Lojistik → Tamamlandi     | `Onaylandi` + TamamlandiTablo |
| S2 → S0 (iptal)            | `POST /api/logistics/{sevkId}/cancel`           | Yonetici, Lojistik  | DELETE        | Lojistik → Hazir          | `Reddedildi`               |

## İnvariantlar

1. LojistikTablo'da satır olduğu sürece, Order'ın yapılabilecek geçerli aşamaları: `Hazir | Lojistik | Tamamlandi`. Diğer aşamalar bir bug işaretidir.
2. `LojistikOnayBekliyor` durumu sadece S1'de (Order=Hazir + satır VAR) görünür.
3. `muhasebe-reject` ve `cancel`, LojistikTablo DELETE'i yapar; aralarındaki fark Order'ın hangi aşamadan döndüğüdür.
4. Frontend "İşlem" sütunu, S2'de iken (Lojistik) Tamamla/İptal gösterir; S1'de iken (Hazir) gösterimi gizler — bu işlemler Muhasebe ekranındaki Onayla/Reddet'e aittir.
