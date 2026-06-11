# CRM Updates — Round 4: Kontrol Ekranı (Sipariş/Teklif Onay Merkezi) — elshan.rasulov only

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**. The sources of truth for this round are `Kontrol.cs` (+ `Kontrol.Designer.cs`) and `KontrolRed.cs` (+ `KontrolRed.Designer.cs`). Large parts of `Kontrol.cs` are commented out — **only active (uncommented) code counts as spec**. Open the Designer whenever block arrangement or a caption is unclear and mirror it.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here.

**A partial port already exists.** `/quality-control` (`QualityControlPage.tsx`, `QualityControlController.cs`, `QualityControlService.cs`, `IOrderRepository.GetPendingQualityControlAsync`) is the existing modern counterpart of the legacy Kontrol form — currently gated `[Authorize(Roles="Yonetici")]`, with a pending grid + approve/reject delegating to `OrderService.ApproveOrderAsync` / `RejectOrderAsync` (audit rows in `SiparisOnaylari`). **This round upgrades that page in place** — do not create a parallel page; extend/rebuild `QualityControlPage` and its controller/service.

**Goal of this round:** bring the Kalite Kontrol screen to logical 1:1 parity with the active legacy behaviour: a pending-control order grid with a filter bar, a full read-only detail panel for the selected order (satıcı / müşteri / teslimat / cari / Detay / ürün-bileşen / muhasebe geçmişi), and the action set (Onayla, Reddet+neden, Revize Et, Cari Güncelle, Aşama+Not Kaydet, Ek indirme, Excel). The whole page must fit on screen at 1920×1080 with **no page-level scroll**.

**One intentional deviation from legacy (new business rule, §5.1):** approving a Teklif/Sipariş must move it straight to the **`Planlama`** stage so it immediately lands in the Fabrika queue — legacy stopped at `Siparis`.

**Layout source of truth:** the provided legacy screenshot (top strip = Filtreme | tabbed detail | Kontrol | Fabrika panels, bottom = full-width grid — §9). The legacy yellow row colouring visible in it is **explicitly dropped**.

**Cross-cutting items also in this round:** Fabrika cost isolation (§7 — hard rule), Muhasebe Tahsilat row colours removed (§8), Siparişlerim auto-refresh on status changes (§6.1).

**Access rule (hard requirement):** the entire Kontrol section — route, sidebar entry, dashboard tile, and every backend endpoint it calls for **mutations** — is open **only to the username `elshan.rasulov`**. This is username-based, not role-based (same pattern as `/approval/pre` → `omur.caliskan`). No role may see or use it, including `Yonetici`.

Apply the items below in order. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both must stay green.

---

## 1. ACCESS GATE — username `elshan.rasulov` only

The Kalite Kontrol section moves from `Yonetici` (role) to **`elshan.rasulov` (username)** — no role may use it anymore, including `Yonetici`.

### Frontend
- `App.tsx:49` — route `/quality-control` currently has **no guard**: wrap it → `<RoleGuard usernames={['elshan.rasulov']}><QualityControlPage /></RoleGuard>` — **no `roles` prop** (RoleGuard treats `usernames` as OR; with no roles given only the username passes — verify `RoleGuard.tsx:11-17` behaves that way when `roles` is undefined, fix if it defaults to allow).
- `Sidebar.tsx:30` — the `/quality-control` entry is `roles: ['Yonetici']` today: change to `usernames: ['elshan.rasulov']` with no roles (mirror the `/approval/pre` entry, which is usernames-only for `omur.caliskan`).
- `DashboardPage.tsx`: remove any Kalite Kontrol tile from role layouts; show it only when `user.kullaniciAdi === 'elshan.rasulov'`.
- i18n: page already has `nav.qualityControl`; add tr+en strings for everything new on the page.

### Backend
Follow the existing username-constant pattern (`OrderController.OrderCreateExceptionUser`, `PurchaseController.FinalApproverUser`):

- In `QualityControlController`: drop the class-level `[Authorize(Roles = "Yonetici")]`, add `private const string ControlUser = "elshan.rasulov";` + a username-claim check helper (copy the `PurchaseController` approach). **All endpoints of this controller — including the reads (`GET pending`, `GET {siparisNo}`) — return 403 for anyone else.** Exception: `GET {siparisNo}/history` is deliberately `[Authorize]`-wide today (used by other screens' timeline) — leave it.
- `POST /api/orders/{no}/approve` and `/reject` on `OrderController` (currently `Roles="Yonetici"`): grep the frontend for callers; if only the QC page path uses the QC controller variants and these two are unused, re-gate them to `ControlUser` too (they are the same service methods — they must not remain a `Yonetici` backdoor). Document what you found in the PR description.
- **Reads on other controllers** used by the page (order detail, accounting transactions, attachments, excel, material-cost) keep their current gates **but must also admit `elshan.rasulov`** — add the username exception where he is currently excluded (e.g. `GET /{no}/excel` is `Yonetici,Muhasebe` today). Do not widen any gate beyond "+ elshan".

**Acceptance:** login as Yonetici → no sidebar entry, `/quality-control` redirects away, `GET /api/quality-control/pending` and `POST /api/quality-control/{no}/approve` return 403. Login as `elshan.rasulov` → full page works regardless of his role.

---

## 2. MASTER GRID — pending-control orders (legacy `SiparisAlTabloDataGridView` / `KontorlDataGridLoad`, Kontrol.cs:685, :2520)

Default load = orders waiting for control:

```sql
SELECT SiparisAlID, SiparisNo, MusteriAd, MUlke, ToplamFiyat,
       GREATEST((ToplamFiyat * (PesinYüzde / 100)) - COALESCE(OdenenMiktar, 0), 0) AS KaparoFiyat,
       ToplamFiyat - COALESCE(OdenenMiktar, 0)                                     AS KalanBakiye,
       PesinYüzde, COALESCE(TeslimatÇeşiti, 'Veri Yok') AS TeslimatÇeşiti,
       ParaTipi, OdemeDurum, SiparisMiTeklifMi, Kontrol,
       DATE_FORMAT(Tarih, '%d/%m/%Y') AS Tarih, Sirket
FROM SiparisAlTablo
WHERE Kontrol = 'Kontrol'
ORDER BY SiparisAlID DESC
```

Implementation: `GET /api/quality-control/pending` + `QualityControlListDto` already produce exactly this shape (`QualityControlService.MapToListDto` computes kaparo with `Math.Max` and kalanBakiye) — **reuse it as the default load**. One legacy mismatch to fix: the DTO's `KalanBakiye` is not clamped; the grid displays raw `toplam − odenen` like legacy (negative allowed here — the `max(…,0)` clamp applies only in the detail panel cari block, §4.1). For the **filtered** load (§3) extend the existing `GET /api/orders` + `OrderFilterDto` pipeline (check what the search page already supports — reuse, don't duplicate).

Grid spec (use the shared `DataTable` component):
- Columns + headers exactly: Sipariş Numarası, Müşteri Adı, Ülke, Toplam Sipariş, Kaparo Bakiyesi, Kalan Bakiye, Peşin Yüzde, Teslimat Çeşidi, Para Tipi, Ödeme Durumu, Aşama (`SiparisMiTeklifMi`), Tarih (`dd/MM/yyyy`), Şirket. `SiparisAlID` and `Kontrol` are not shown.
- Money columns formatted `N2` via `formatCurrency`.
- **No row colouring.** Legacy painted rows yellow when `OdemeDurum !== 'Beklemede'` (`siparisAlDataGrid_CellFormatting`, :2273) — dropped by user decision. All rows default white; only the selected-row highlight remains.
- Row click selects the order and loads the detail panel (§4).
- Grid body scrolls **internally** (fixed height); the page itself never scrolls.

---

## 3. FILTER BAR — legacy `araButtonInTab_Click_1` (Kontrol.cs:3641) + `DataGrid()` reset (:378)

One compact row above the grid ("Filtreme" group in the Designer):

| Control | Source | Legacy behaviour |
|---|---|---|
| Sipariş No (text) | — | If it starts with `T`, replace with `S` before querying (`LIKE %…%`). **When non-empty, ALL other filters are ignored** — legacy puts everything else in the `else` branch. |
| Müşteri Adı (select) | `MusteriBilgileri` ordered by name | `LIKE %…%` on `MusteriAd` |
| Ülke (select) | `UlkelerBilgileri` ordered by name | equality on `MUlke` |
| Temsilci (select) | `KullaniciBilgileri`, label `Ad Soyad` | equality on `KullaniciID` |
| Ödeme Durumu (select) | static: Ödendi / Beklemede | equality |
| Aşama (select) | static list incl. Teklif / Siparis / Planlama / Uretim / Hazir / Lojistik / Tamamlandi / Iptal | equality on `SiparisMiTeklifMi` |
| Kontrol Durumu (select) | static: Kontrol / Onay / Reddet — **default `Kontrol`** | equality; **skipped when Aşama = `Iptal`** (legacy `islemDurum != "Iptal"` guard) |
| Tarih aralığı (two date pickers) | Baş = `MIN(Tarih)` from SiparisAlTablo, Bitiş = today+1 (legacy `DataGrid()`) | `Tarih BETWEEN` (applied only when start ≤ end) |

Buttons: **Ara** (runs the filtered query), **Reset** (restores defaults above and reloads the pending list, clears the detail panel — legacy `resetButton_Click` → `DataGrid()`). Empty result → toast "Hiçbir sonuç bulunamadı."

Backend: extend `OrderFilterDto` only with what is genuinely missing (it already supports several of these from the search page — check `SearchPage.tsx`/`SearchController` first and reuse).

---

## 4. DETAIL PANEL — row click loads the full order (legacy `CellClick()`, Kontrol.cs:2018)

Selecting a grid row fetches the complete order and renders it in the **tabbed detail panel** (second panel of the top strip, §9). Reuse `GET /api/orders/{no}` — **verify its DTO carries every field below and extend it where missing** (it was built for other pages). Until a row is selected the panel shows an empty-state hint.

### 4.1 Tab strip — exactly as in the screenshot: **Cari | Muhasebe Geçmişi | Müşteri | Teslimat | Satış Temsilcisi | Detay**

- **Cari** (default tab) — titled "Cari Bilgiler", money as `N2`:
  - Para birimi symbol prefix on amounts: Euro→`€`, Dolar→`$`, TL→`₺`, Sterlin→`£` (legacy :2076-2099).
  - Sipariş Toplam = `ToplamFiyat`; Para Birimi = `ParaTipi`.
  - Kaparo Bakiye row shows `%{PesinYüzde}` next to the amount: `max(pesinTutar − OdenenMiktar, 0)` where `pesinTutar = ToplamFiyat × PesinYüzde / 100`.
  - Sipariş Bakiye = `max(ToplamFiyat − OdenenMiktar, 0)`.
  - Ödenen Bakiye = `OdenenMiktar` — *editable* numeric field (digits only), because of Cari Güncelle (§5.4).
  - Buttons inside this tab: **Cari Güncelle** (§5.4) and **Revize Et** (§5.3).
- **Muhasebe Geçmişi** — the payments grid (§4.4).
- **Müşteri** — İsim (`MusteriAd`), Telefon (`MTelefon`), Ülke (`MUlke`), Zip Kodu (`MZipKod`), E-Mail (`MMail`), VAT Numarası (`MVATNumarasi`), Adres (`MAdres`).
- **Teslimat** — Teslim Alan Adı (`TTeslimAlanAdi`), İlgili Kişi (`TIlgiliKisi`), Ülke (`TUlke`), Telefon (`TTelefon`), Alternatif Telefon (`TAltTelefon`), E-Mail (`TE_Mail`), VAT Numarası (`TVATNumarasi`), Adres (`TAdres`); Montaj checkbox = `Montaj === 'Var'`, Teslimat checkbox = `Teslimat === 'Var'`, Montaj Fiyatı, Teslimat Fiyatı, Teslimat Çeşidi.
- **Satış Temsilcisi** — Temsilci Adı (`Ad Soyad` of the `KullaniciID` owner), Telefon (`STelefon`), Fax (`SFax`), Web (`SWeb`), E-Mail (`SE_Mail`), VAT Numarası (`SVatNumarasi`), Ülke (`SUlke`), Adres (`SAdres`).
- **Detay** — the Detay list (§4.2) and the Ürün & Bileşen grid (§4.3) stacked, each with internal scroll.

All fields read-only (muted inputs) except Ödenen Bakiye.

### 4.2 Detay list — **pulled from the Teklif** (legacy :2181)
`DetayTablo` rows are written when the **Teklif** is created; the Kontrol screen shows them per order:

```sql
SELECT Detay FROM DetayTablo WHERE SiparisNo = @SiparisNo
```

Single-column list titled **Detay**. Lookup key: the order's `SiparisNo`; if that returns zero rows and the order has a distinct `TeklifNo`, retry with `TeklifNo` (covers quotes converted to orders — legacy normalises `T…`→`S…` at search time for the same reason). The `Order.Details` navigation (`OrderDetail` entity) already maps `DetayTablo` — expose it on the detail DTO if it isn't there yet.

### 4.3 Ürün & Bileşen grid (legacy :2204)
```sql
SELECT uk.KategoriAdi, si.OznitelikAdi, bb.BilesenAdi, bb.Birim, si.Adet, si.Fiyat
FROM SiparisIslemTablo si
LEFT JOIN UrunKategorileri uk ON si.KategoriID = uk.KategoriID
LEFT JOIN BilesenBilgileri bb ON si.BilesenID = bb.BilesenID
WHERE si.SiparisNo = @SiparisNo
```
Columns: Kategori, Öznitelik, Bileşen Adı, Birim, Adet, Fiyat. Legacy quirk to keep: on rows where `BilesenAdi` is non-empty (component rows), the **Fiyat cell renders blank** — price is only meaningful on category rows.

### 4.4 Muhasebe Geçmişi (legacy `MuhasebeBilgisiniGetir`, :1952)
Payments for the selected order — reuse `GET /api/accounting/orders/{siparisNo}/transactions` (exists in `AccountingController`; add the elshan read exception per §1). Columns: Müşteri Adı, Ülke, Temsilci, Para Türü, Ödenen Bakiye (`N2`), Tarih — ordered by Tarih DESC. Internal scroll.

Both inner grids (Detay, Ürün&Bileşen, Muhasebe) scroll internally with fixed heights.

---

## 5. ACTIONS — Kontrol panel + Fabrika panel (placement per screenshot)

Actions live in two dedicated panels of the top strip (§9), not in a generic strip:

- **Kontrol panel** (third panel): Sipariş No (read-only, fills on row select), **Not** (read-only textarea = `SiparisNotu`), and six buttons in a 2×3 grid: **Satıcı Ek**, **Muhasebe Ek** (§5.6) / **Excel'e yaz** (§5.7), **Form'u getir** (§5.8) / **Reddet** (§5.2), **Onayla** (§5.1).
- **Fabrika panel** (fourth panel): **Aşama** select, **Bitiş** date picker, **Not** input, **Kaydet** (§5.5).
- **Cari tab** hosts **Cari Güncelle** (§5.4) and **Revize Et** (§5.3) — see §4.1.

All mutations require a selected order (`SiparisNo`); otherwise toast "Lütfen sipariş seçiniz." Every successful mutation refreshes the grid (React Query invalidate) and clears/reloads the detail panel, mirroring legacy `DataGrid()` after each action.

### 5.1 Onayla — **NEW RULE: approval sends the order to Planlama / Fabrika**
Legacy (`kontrolOnayla_Click`, :2608) set `Kontrol='Onay'` and only promoted `Teklif`→`Siparis`, leaving the record waiting for a separate accounting step to reach `Planlama`. **This round changes that on purpose:** approving a Teklif **or** Sipariş in Kalite Kontrol moves it directly to the factory queue:

```sql
UPDATE SiparisAlTablo
SET Kontrol = 'Onay',
    SiparisMiTeklifMi = 'Planlama'
WHERE SiparisNo = @SiparisNo AND Kontrol <> 'Onay'
  AND SiparisMiTeklifMi IN ('Teklif','Siparis')
```

- Already approved / not found / past `Siparis` stage → error toast ("Kayıt bulunamadı veya zaten Onay durumunda."). Success → "Başarıyla onaylandı!".
- Implement inside `OrderService.ApproveOrderAsync` (called by `QualityControlService.ApproveAsync`) — keep the existing `SiparisOnaylari` audit row; only the stage target changes from the `Teklif→Siparis` CASE to `'Planlama'`.
- **Fabrika visibility check:** `FactoryService` treats `Planlama` as its entry stage (`MoveToProduction` requires it). Verify the Fabrika page's pending list (`FactoryPage` / its `GET` endpoint) picks the order up immediately after approval — that is the acceptance test, not just the DB value.
- **Side-effect audit:** `AccountingService.ApproveMuhasebeAndMoveToPlanning` (`PUT /api/accounting/orders/{no}/approve-and-move-to-planning`) used to be the `Siparis→Planlama` promoter. With QC now landing on `Planlama` directly, that endpoint must stay harmless for already-`Planlama` orders (idempotent or clear error — check and adjust its guard; do not delete it, Muhasebe screens still call it).

**Acceptance:** approve a `Teklif` in Kalite Kontrol → row leaves the QC grid; DB shows `Kontrol='Onay'`, `SiparisMiTeklifMi='Planlama'`; Fabrika login sees it in their queue without any Muhasebe action in between.

### 5.2 Reddet (legacy `kontrolReddet_Click` :2662 + `KontrolRed.cs`)
Opens a dialog (pattern: `PreApprovalPage` reject dialog) with the SiparisNo shown and a **mandatory** "Red nedeni" textarea. Confirm →
```sql
UPDATE SiparisAlTablo
SET Red = @Red, Kontrol = 'Reddet'
WHERE SiparisNo = @SiparisNo AND Kontrol <> 'Onay'
  AND SiparisMiTeklifMi IN ('Teklif','Siparis')
```
0 rows → toast "İşlem yapılamadı! Sipariş zaten Onay durumunda olabilir veya Teklif/Sipariş değil." Reuse/align the existing `reject` endpoint (`RejectOrderDto` already carries the note — verify it writes `Red` and respects both WHERE guards).

### 5.3 Revize Et (legacy `revizeEtButton_Click`, :4139)
Navigates to the existing create form in revise mode for the selected `SiparisNo` — reuse exactly the mechanism MyOrdersPage/NewOrderPage already use (`reviseSource` / `POST /{eskiNo}/revise` flow). **Backend note:** the revise endpoint is gated `Temsilci + elshan` since v3 §1 — elshan already passes; do not widen it.

### 5.4 Cari Güncelle (legacy `button2_Click_2`, :4216)
New endpoint `PUT /api/orders/{no}/paid-amount` (ControlUser only): body `{ odenenMiktar: decimal }` →
```sql
UPDATE SiparisAlTablo SET OdenenMiktar = @OdenenMiktar WHERE SiparisNo = @SiparisNo
```
Frontend: the editable Ödenen Bakiye field (§4.1) + "Cari Güncelle" button. Invalid number → toast "Geçerli bir ödenen bakiye girin." After success the cari block recomputes (kaparo/kalan).

### 5.5 Aşama Kaydet — Fabrika panel (legacy `fabrikaButton_Click_1`, :4007)
The screenshot's **Fabrika** panel: Aşama select, **Bitiş** date picker (= `STarih`, default today), Not input (= `KontrolNot`), Kaydet. New endpoint `PUT /api/orders/{no}/stage` (ControlUser only): body `{ asama: string, sTarih: DateTime, kontrolNot: string }`. Semantics:
- Order must exist (404 otherwise).
- `kontrol = (asama == 'Iptal') ? 'Reddet' : 'Onay'`.
- ```sql
  UPDATE SiparisAlTablo
  SET SiparisMiTeklifMi = @Asama, Kontrol = @Kontrol, STarih = @STarih, KontrolNot = @KontrolNot
  WHERE SiparisNo = @SiparisNo
  ```
- **Schema check:** `Order.cs` has `STarih` but no `KontrolNot` property — check whether the column exists in the live DB (legacy writes it, so it should). Map it on the entity; if the column is genuinely missing, add it via the idempotent `DatabaseSchemaMigrator` (NOT EF Migrations).
- UI: Aşama select (Teklif/Siparis/Planlama/Uretim/Hazir/Lojistik/Tamamlandi/Iptal), date picker (default today), Not text input, Kaydet button. Empty Aşama → toast "Aşama boş olamaz."

### 5.6 Satıcı Ek / Muhasebe Ek download (legacy `ekButton_Click_1` :3602, `button1_Click` :3564)
Two buttons calling the existing `GET /api/orders/{no}/attachments/{type}` (types: order `Ek` and `MuhasebeEk` — check the controller's accepted `type` values and reuse). Missing blob → toast "Ek dosya bulunamadı." Browser download, filename `siparis_ek_{no}.zip` / `muhasebe_ek_{no}.zip`.

### 5.7 Excel'e Yaz (legacy `excelYazOzet_Click`, :2680)
Button calling the existing `GET /api/orders/{no}/excel` (extend its gate with elshan per §1) and downloading the file. Do **not** re-implement the legacy Office-Interop writer — the modern endpoint's output is the accepted equivalent.

### 5.8 Form'u getir (legacy `buttonFormGetir_Click`, :3548)
Legacy opens the read-only `FormGetir` viewer for the selected `SiparisNo`. Modern equivalent: open the existing **`OrderDetailModal`** component for the selected order (it already renders the full order form read-only — check which page uses it today and reuse as-is). No new endpoint.

### Out of scope (commented-out / dead in legacy — do NOT port)
`muhasebeOnayla_Click`, charts, kullanıcı/müşteri/depo CRUD handlers, `TeslimatBilgileriDataGrid`, `MuhasebeEkEkle` upload (upload already exists elsewhere in modern), `teklifAlButton` (create flow lives in `/orders/new`).

---

## 6. SİPARİŞLERİM — lifetime status tracking + elshan global view

Two guarantees on `/orders/mine` (`MyOrdersPage.tsx` ↔ `GET /api/orders/my` ↔ `OrderService.GetMyOrdersAsync`):

### 6.1 Temsilci always sees their own orders' current status
A Temsilci must be able to follow every order they created through its **entire lifecycle** — `Teklif → Siparis → Planlama → Uretim → Hazir → Lojistik → Tamamlandi` plus `Kontrol` state (`Kontrol / Onay / Reddet`) — at all times:

- `GetMyOrdersAsync` already returns all of the user's rows unfiltered (stage filter is opt-in) — **verify nothing upstream or in the UI drops later-stage rows** (e.g. a default `asama` filter, a `Kontrol='Kontrol'`-only query, or pagination hiding them). The list must show orders at every stage including `Tamamlandi` and rejected ones.
- The grid must surface both status dimensions per row: **Aşama** (`SiparisMiTeklifMi`) and **Kontrol** (use the existing `OrderKontrolBadge` / `StatusBadge` components — check what MyOrdersPage renders today and add whichever is missing).
- **Auto-refresh (hard requirement):** every status change must reach the open Siparişlerim screen without a manual reload. Statuses change from other sessions (elshan approves, Fabrika moves to Uretim…), so cache invalidation alone is not enough — configure the list query with `refetchOnWindowFocus: true` **and** a `refetchInterval` of ~30s while the page is mounted (plus invalidate on any in-app mutation that touches orders). No SignalR/websocket infrastructure — polling at this cadence is the accepted mechanism.
- A rejected order must let the owner see the red nedeni (the `getRejectionNote` flow already exists on this page — verify it still works for rejections coming from the new QC gate).

### 6.2 `elshan.rasulov` sees ALL orders in Siparişlerim
elshan must be able to track **every order in the system** from the same screen:

- **Backend:** in the `/api/orders/my` path, if the JWT username is `elshan.rasulov`, return **all** orders instead of scoping to `KullaniciID` (same username-constant pattern as §1; implement the branch in the controller or service, not the repository). Everyone else stays strictly own-rows — this must not loosen the Temsilci scoping shipped in v2 §6.
- **Frontend:** `App.tsx:41` route `/orders/mine` is `roles={['Yonetici','Temsilci','Gozlemci']}` — add `usernames={['elshan.rasulov']}`; same on the `Sidebar.tsx:29` entry. Since the list can now span all reps, show the **Temsilci (owner)** column when (and only when) the viewer is elshan — `OrderListDto` already carries `KullaniciID`; surface the owner's Ad Soyad (extend the DTO with the owner name if it's not already resolvable client-side).

**Acceptance:** Temsilci A creates an order → elshan approves it (§5.1) → Fabrika moves it to Uretim → Temsilci A's Siparişlerim shows it with Aşama=`Uretim`, Kontrol=`Onay` without A doing anything. Temsilci A never sees Temsilci B's orders. elshan's Siparişlerim lists both A's and B's orders with an owner column.

---

## 7. FABRİKA — COST ISOLATION (HARD RULE, applies everywhere)

**Nobody in the Fabrika area — the Fabrika role, the Fabrika pages, any factory-facing endpoint — may EVER see anything cost-related, at any stage.** This covers every monetary field: `ToplamFiyat`, `BrutToplamFiyat`, `KaparoFiyat`/`KalanBakiye`, `OdenenMiktar`, `PesinYüzde`, `Indirim`, `Kdv`, `MontajFiyat`, `TeslimatFiyat`, `ParaTipi`-attached amounts, `SiparisIslemTablo.Fiyat` (component/category prices), material cost (`maliyet`), and all accounting data.

Enforce on **both** sides:

- **Backend (authoritative):**
  - Audit `FactoryController`/`FactoryService` and `FactoryOrderListDto` — they must contain **zero** monetary fields. Remove any that exist.
  - Audit every endpoint a `Fabrika` token can reach (anything `[Authorize]`-wide is reachable: e.g. `GET /api/orders/{no}`, `GET /api/orders`, search, QC history, attachments). For each: either exclude `Fabrika` from the gate, or **strip all monetary fields server-side when the caller's role is `Fabrika`** (null them in the DTO mapping — a `User.IsInRole("Fabrika")` branch at the service/controller mapping layer). Pick per endpoint whichever doesn't break the factory workflow, but no money may cross the wire to a Fabrika session.
  - `GET /{no}/material-cost` and `GET /{no}/excel` (proforma contains prices — PROMPT-v2 §2 already hides it from Fabrika) must reject `Fabrika` outright — verify, don't assume.
- **Frontend:** `FactoryPage` (and anything a Fabrika login can open) renders no price columns, no currency totals, no cari blocks. If a shared component (e.g. `OrderDetailModal`, `OrderStageTimeline`) is reachable from a Fabrika session, it must hide its monetary sections for that role.

**Acceptance:** login as a `Fabrika` user → walk every screen they can reach and every API call in devtools: not a single monetary value appears in any response body or on screen, at any order stage. This is a security-style check — server-side stripping is mandatory; UI hiding alone fails the item.

---

## 8. MUHASEBE / TAHSİLAT — remove row colours

`AccountingPage.tsx` colours rows by `muhasebeDurumu` (`rowColourClass`, line ~52: green `Onaylandı` / rose `Reddedildi` / amber `Onay Bekliyor`, applied at the `DataTable rowClassName`, line ~395). **Remove this entirely:** delete `rowColourClass` and its usage so all rows render default white; keep only the selected-row ring highlight and hover style. Status stays visible through the existing badge/column — no information loss, just no row paint. Check the other accounting screens (`AccountingHistoryPage`, `LogisticsApprovalsPage`, `CustomerBalancePage`) for the same pattern and clean any that colour rows by durum too.

**Acceptance:** Tahsilat list shows every row on white background regardless of muhasebe durumu; status badges still render.

---

## 9. LAYOUT & VIEWPORT FIT — match the provided screenshot

The legacy screenshot is the layout spec. Two horizontal bands:

- **Top strip (~45% of viewport height), four panels left → right:**
  1. **Filtreme** — the §3 filter fields stacked (Sipariş No, Müşteri Adı, Temsilci Adı, Ülke, Kontrol Durumu, Ödeme Durumu, Aşama), "Tarih Aralığı" sub-header with Baş/Son date pickers, then **Reset** + **Ara** buttons side by side.
  2. **Tabbed detail panel** (widest) — tab strip `Cari | Muhasebe Geçmişi | Müşteri | Teslimat | Satış Temsilcisi | Detay` (§4.1).
  3. **Kontrol panel** — heading "Kontrol", Sipariş No (read-only), Not textarea, six action buttons in a 2-column grid (§5).
  4. **Fabrika panel** — heading "Fabrika", Aşama select, Bitiş date, Not, Kaydet (§5.5).
- **Bottom band (remaining ~55%):** the master grid (§2) full-width with internal scroll.

Rules:
- **1920×1080 @100% zoom: zero page-level scroll in both axes.** Scrolling allowed only inside the master grid, the Muhasebe Geçmişi grid, and the Detay tab's two lists.
- The tabbed panel is what keeps it uncramped — never render more than one detail block at a time. Don't try to show all blocks simultaneously like the old three-column draft.
- At 1366×768 the four top panels stay side by side (tighten paddings; the Filtreme panel may compact its labels) — no wrapping into a second row.
- Compact field rendering: label-left/input-right rows like the screenshot, dense Tailwind (`text-xs`/`text-sm`), consistent with NewOrderPage density. Read-only fields as muted inputs, not plain text.
- **No yellow/status row painting anywhere on this page** (user decision — see §2).

**Acceptance:** side-by-side screenshot comparison with the provided image at 1920×1080 — same four top panels in the same order, same tab strip, grid below, nothing clipped, no page scrollbars.

---

## 10. Rules

- **Match existing code conventions.** Tailwind + shadcn, React Query, shared `DataTable`, `PageHeader`, `Dialog`, `useToast`, `formatCurrency`/`formatDate`, `DecimalInput` for money entry. i18n keys for every new string (tr + en).
- **Legacy parity beats elegance** — including quirks: blank Fiyat on component rows, `T`→`S` normalisation, SiparisNo-overrides-all-filters, the `Iptal`-skips-Kontrol-filter guard, `max(…, 0)` clamps in cari math. The **sanctioned deviations** are: §5.1 (approve → `Planlama`, straight to Fabrika), §6.2 (elshan sees all orders in Siparişlerim), §7 (Fabrika never sees costs — stricter than legacy), and the dropped row colourings (§2 yellow rule, §8 muhasebe durum colours).
- **Reuse before creating:** approve/reject/attachments/excel/accounting-transactions endpoints exist — re-gate and align semantics rather than duplicating. New endpoints only where listed (§5.4, §5.5, possibly the kontrol list filter).
- **Username gate is mandatory on both sides** — frontend `RoleGuard usernames` AND backend username claim check. Frontend-only hiding is not acceptable.
- **Schema:** expected zero new tables; only the possible `KontrolNot` column mapping (§5.5) via `DatabaseSchemaMigrator` if missing.
- **Do not refactor unrelated code.** Rounds 1–3 are shipped; don't re-apply them.
- **Build cadence:** after every item, `npm run build` (Web) + `dotnet build CrmModern.slnx` — both green before moving on.
