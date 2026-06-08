# CRM Modern – Change Request

Apply the following changes. Keep diffs minimal, reuse existing components, no new abstractions unless required.

## GLOBAL
- **Main panel welcome**: replace `Hoş geldiniz, burcu.karaman (Muhasebe)` with `Hoş geldiniz, {FullName from DB}` for every user.
- **Main panel charts**: render role-specific charts per logged-in user role.
- Convert every decimal input to `TextBox` — explicitly: KDV, Peşin (Cash), İndirim (Discount), and **Purchase → New → Cost**. Any field accepting a decimal must be a TextBox.
- **Satın Alma Taleplerim (My Purchase Requests)**: each requester sees ONLY their own requests.

## ADMIN (Yönetici)
- Restore the previous version's full dashboard (charts) **for Admin only**. It was removed by mistake. Source-code zip of previous version can be provided if needed.
- Remove **Onay → Ön Onay** and **Onay → Ödeme Detayı** sections.

## ACCOUNTING (Muhasebe)
- **Muhasebe Geçmiş**: fix the broken Excel export button.
- Remove **Lojistik** for this role.
- **Satın Alma · Taleplerim**: the "Ekle" button redirects to dashboard — remove the button.
- **Ödeme Detayı (Muhasebe)** in `SatinAlmaTakipForm`, Stage 2 dynamic panel: keep only the text `Ödeme Detayı`.
- **Ödeme Detayı → İşlem Tarihi**: default to current date+time (DateTime.Now) on load.
- **Satın Alma · Tüm Talepler**: investigate and fix "muhasebede kayıt bulunamadı" message.
- **Satın Alma · Tüm Talepler → Departman**: change to a SelectBox (dropdown).
- Port the **legacy CRM Accounting screen** layout 1:1 into current CRM: Muhasebe Geçmişi, Detay, Müşteri, Teslimat, Satış Temsilcisi, etc. Top form + bottom table must match.
- Add the **legacy "Muhasebe İşlem Geçmişi" filters** to the new Muhasebe Geçmiş screen.

## OBSERVER (Gözlemci)
- Add **Customer Add/Edit** screen.
- Add **Quote/Order create** screen.
- **Lojistik Geçmiş** table: add a column showing the operator's full name (Ad Soyad).

## REPRESENTATIVE (Temsilci)
- Add **Customer Add** screen.
- Add **My Orders** screen showing orders created by this user — mirror the legacy `Siparişlerim.cs` (Form Göster, Siparişe Çevir, Red Notu, Revize actions).
- **New Order**: block saving an empty order (validate at least one line item).

## REMOVE
- Delete this text wherever it appears: `Talep "Bekliyor" durumunda kaydedilir, ön onay için omur.caliskan'a düşer.`

## Rules
- Match existing code conventions, styling, naming.
- Do not refactor unrelated code.
- Only add comments where intent is non-obvious.
