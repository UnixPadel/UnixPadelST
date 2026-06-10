# CRM Updates — Round 2

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, read-only. Open the relevant `.cs` file whenever a behaviour is unclear and mirror its semantics.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes below land here.

Roles: `Yonetici` (Admin), `Temsilci` (Sales rep), `Muhasebe` (Accounting), `Fabrika` (Factory), `Lojistik` (Logistics), `Gozlemci` (Observer).

Apply the items below. Keep diffs minimal, reuse existing components, no new abstractions unless strictly required. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both must stay green.

---

## 1. ORDER / COST CREATE SCREEN — fit + component loading

The Sipariş / Teklif Oluştur screen (`pages/orders/NewOrderPage.tsx`) has two related defects.

### 1a. Viewport fit
On a standard 1920×1080 display at 100% zoom, the 3-column layout overflows horizontally and the sticky action bar disappears below the fold. Make the page render fully inside the app shell at that resolution without horizontal scroll. The center column's component table is the worst offender — use `min-w-0` on the grid columns and `overflow-x-auto` only on the inner table.

### 1b. Component picker is broken
When the user picks an **Ana Ürün** (category) in any Sipariş 1..5 tab, the components belonging to that category must populate the lower table with columns `ID / Öznitelik / Bileşen Adı / Birim / Adet / Birim Fiyat / Toplam`. Currently nothing happens.

- Reference legacy `WindowsFormsApp1/SiparisForm.cs` — the handler `anaUrunComboBox_SelectedIndexChanged` (and the BoM-loading logic right after it) is the source of truth. It queries components for the selected `KategoriID` and binds them to `urunVeBilesenDataGrid`.
- Modern wiring: call `getComponentsByCategory(kategoriID)` (already in `api/orders.ts`) on Ana Ürün change. Populate a local `components[]` per tab. Each row is editable: `Adet` (default 1), `Birim Fiyat` (default from component master), `Toplam` (computed: `Adet × Birim Fiyat`).
- When the user clicks **Çarp**, push the populated `components[]` into `form.sets[i].components`.

**Acceptance criteria:**
- Page fits 1920×1080 with no horizontal scroll; action bar visible without scrolling on a 13" laptop (1366×768) too.
- Picking a category immediately shows its components. User can adjust per-row values. Çarp persists them into the form payload sent to `POST /api/orders/order` (or `/quote`).
- Existing `expandRecipe` post-save behaviour is preserved.

---

## 2. FACTORY — zero cost visibility

The `Fabrika` role must not see any monetary value, anywhere in the app.

**Specifically hide for Fabrika:**
- Columns: `ToplamFiyat`, `Maliyet`, `Kar`, `KaparoFiyat`, `KalanBakiye`, `OdenenMiktar`, `Brüt Toplam`, `İndirim`, `KDV`, any currency totals strip.
- Page elements: factory dashboard revenue cards (already off via `ROLE_LAYOUT.Fabrika.revenue = false` — verify); the material-cost panel on order detail; currency-distribution charts.
- Endpoints: `GET /api/orders/{no}/material-cost` already restricted to `Yonetici,Muhasebe,Fabrika` — **remove `Fabrika`** from that allow-list and update any UI consumer to hide the call for Fabrika.
- Order detail modal (`OrderDetailModal.tsx`): when role is Fabrika, render a sanitized view without any `formatCurrency` calls.

**Apply two layers:** backend `[Authorize(Roles = …)]` gates *and* frontend conditional render. Both must agree; either alone is insufficient.

**Acceptance:** Fabrika user logs in → can browse Fabrika / Üretim / Hazır screens, see SiparisNo / MusteriAd / aşama / tarih, but no money anywhere (no symbols `€ $ ₺ £`, no totals).

---

## 3. DEFAULT-EMPTY DECIMAL INPUTS — order header

`pages/orders/NewOrderPage.tsx` currently initialises `indirim: 0, kdv: 0, pesinYuzde: 0` and renders `"0"` in the textboxes. Change to **blank** by default.

- Local form state: `indirim`/`kdv`/`pesinYuzde` become `number | null` (or `''`), rendered blank.
- Existing `DecimalInput` already accepts `''` — just stop seeding zeros.
- Backend `CreateOrderDto` (C# record): make these `decimal?`. Service layer (`OrderService`) coerces null to `0m` only at total-computation time.
- On save, send `null` (or omit) when the user didn't fill it — preserves the user's "I didn't decide yet" semantics.

**Acceptance:** Open New Order → İndirim, KDV, Peşin fields are visually empty; typed values still validate as digits + `.` + `,` (Phase 1 rule); save succeeds with any combination of empty / filled fields.

---

## 4. PURCHASE REQUEST — empty cost field

`pages/purchase/NewPurchaseRequestPage.tsx` seeds `urunMaliyeti: 0` and pre-fills `"0"` in the **Maliyet** textbox. Change to blank by default.

- Same pattern as §3 — state holds `null` / empty.
- Existing submit guard already prevents save when the value is missing/zero; verify the user can't accidentally submit a zero-cost request.

**Acceptance:** Open New Purchase Request → Maliyet field is empty. Save attempt with empty Maliyet shows the validation error already in place.

---

## 5. LOGISTICS — invoicing + padel checklists

New module: Lojistik faturalama + uploadable/editable padel checklist'leri.

### 5.1 Invoice (Fatura) creation
- Per-shipment invoice. Form mirrors a Proforma layout: customer / company / line items (transport cost, padel units shipped) / totals / signature block.
- **Three-company branding:** `ARS`, `FOXER`, `UNIXPADEL`. Each has its own logo + header block + footer block + bank details. Selection dropdown drives which template renders. Templates stored in `Invoice Templates` table with HTML / asset references; render to PDF via a server-side templating engine (ClosedXML for xlsx export already in the project — pair it with a PDF library like QuestPDF).
- **Output:** downloadable PDF; persist invoice to DB.

### 5.2 Padel checklists
- Per-padel-type checklist: `Panoramik`, `Flat Floor`, `Standart`, plus space for new types added later by Admin.
- Each checklist is an ordered list of named items (e.g. "Cam kontrolü", "Vida bağlantıları", "Boya bütünlüğü") with `Tamam` / `Eksik` / `Açıklama` per item.
- **Template editor (Yonetici / Muhasebe):** add / remove / reorder items, edit names, set company branding. Bulk upload via XLSX (single sheet, columns: order / item name / required).
- **Fill-in (Lojistik):** check off items per shipment, add `Açıklama` per item if `Eksik`.
- Persisted alongside the invoice.

### 5.3 Lojistik role permissions
- **Can:** add a shipment (existing flow), generate an invoice from an existing template, fill in a checklist for a shipment, view past invoices and checklists.
- **Cannot:** edit invoice/proforma template structure, edit checklist template items.

### 5.4 Past-invoice viewing
- New sidebar entry: `Lojistik · Faturalar`.
- List with filters: Tarih range, Şirket, Müşteri, SiparisNo. Click → preview PDF + download.

### 5.5 Backend additions
- Entities: `InvoiceTemplate`, `Invoice`, `ChecklistTemplate`, `ChecklistTemplateItem`, `ChecklistInstance`, `ChecklistInstanceItem`. EF Core migration.
- Endpoints (with Auth):
  - `GET /api/logistics/invoice-templates` (any auth)
  - `PUT /api/logistics/invoice-templates/{sirket}` (`Yonetici,Muhasebe`)
  - `POST /api/logistics/{sevkId}/invoice` (`Yonetici,Muhasebe,Lojistik`)
  - `GET /api/logistics/invoices` (`Yonetici,Muhasebe,Lojistik,Gozlemci`)
  - `GET /api/logistics/invoices/{id}/pdf` (same)
  - `GET /api/logistics/checklist-templates` (any auth)
  - `PUT /api/logistics/checklist-templates/{type}` (`Yonetici,Muhasebe`)
  - `POST /api/logistics/{sevkId}/checklist` (`Yonetici,Muhasebe,Lojistik`)
  - `GET /api/logistics/{sevkId}/checklist` (any auth involved in the shipment)

---

## 6. SALES REPS — own orders only

Temsilci role must only see orders they personally created.

- Backend: `GET /api/orders` (and `GET /api/orders/totals`) — when `User.IsInRole("Temsilci")`, force-add `WHERE KullaniciID = CurrentUserId` to the underlying query.
- `/api/orders/my` already does this; the change is to the general listing endpoints used by All Orders / Search / Dashboard counts.
- Search: `/api/search` — when the caller is Temsilci, restrict order hits to their own.
- Other roles unaffected.

**Acceptance:** Temsilci A logs in → sees zero orders created by Temsilci B in any list, dashboard KPI, or search result. Yonetici / Muhasebe / Gozlemci see everything as before.

---

## 7. SALES REPS — own customers only

A customer is "owned" by the rep who first registered them.

- **Schema migration:** add `CreatedByKullaniciID INT NULL` to `MusteriBilgileri`. One-time backfill: for each historical customer, set this to the `KullaniciID` of the earliest order in `SiparisAlTablo.MusteriAd = MusteriBilgileri.MusteriAd`. Rows with no historical order stay `NULL` (Admin-only visibility downstream — see below).
- **Set on create:** `MusteriController.Create` writes the current JWT user's ID into `CreatedByKullaniciID`.
- **Listing gate:** `GET /api/musteri` — for `Temsilci`, return only rows where `CreatedByKullaniciID = CurrentUserId`. For all other roles, return everything.
- **Order create dropdown:** the `Müşteri` dropdown on `NewOrderPage` already calls `getCustomers()` — backend gate covers it automatically.

**Acceptance:** Temsilci A in Customers list sees only customers they created. Their New Order dropdown is correspondingly scoped. Yonetici / Muhasebe / Gozlemci see all customers.

---

## 8. PERFORMANCE DASHBOARD — Admin-only

New screen: `Performans` — daily / weekly / monthly sales rep performance. Visible to **`Yonetici` only**.

### Metrics per rep
- Order count (in the selected window)
- Revenue, summed per currency (Euro / Dolar / TL / Sterlin)
- Average deal size (revenue / order count)
- Quote-to-order conversion rate (`Siparis` count / (`Siparis` + `Teklif`) count, same window)
- Top 5 customers by revenue (in the window)

### UI
- Window selector: `Günlük` / `Haftalık` / `Aylık` (default: current month).
- Date-range picker for custom range.
- Rep filter (single-select; default: all reps).
- Sortable table; click a rep row → drill-down showing their orders in the window.

### Backend
- `GET /api/reporting/rep-performance?from=...&to=...&kullaniciId=...` (`Yonetici` only).
- Returns aggregated metrics per rep, plus a `summary` block with totals.

### Frontend
- New `pages/reporting/RepPerformancePage.tsx`.
- Sidebar entry: `Performans` (Yonetici only).
- Admin dashboard tile: `/reporting/rep-performance` added to `ROLE_LAYOUT.Yonetici.tiles`.

---

## 9. ACCOUNTING — invoice + checklist surface

The same module from §5 needs a Muhasebe-facing surface.

- `AccountingPage.tsx` row action set extended: `Fatura Görüntüle` / `Yeni Fatura` / `Checklist`. Same backend endpoints as §5, no new controller.
- Muhasebe role: can view/edit invoice + checklist **templates** (full editor — items / branding / layout), can view filled invoices and checklists.
- Lojistik: fill-in only (per shipment) — already covered in §5.3.

**Acceptance:** Muhasebe user can edit a template for `Panoramik` checklist, save it, and a subsequent Lojistik fill-in uses the new structure.

---

## 10. ACCOUNTING HISTORY — installment breakdown + cost recipe

`pages/accounting/AccountingHistoryPage.tsx` currently shows a single `Tutar` column. Replace with installment breakdown + per-row "Maliyet Reçetesi" button. The whole change is visible to **`Yonetici` + `Muhasebe` only**.

### 10.1 Installment columns
- For each order, render transactions sequentially as separate columns: `1. Peşinat`, `2. Peşinat`, `3. Peşinat`, … each showing amount + small-print date below.
- Append a column `Fark (1.→2.)` computing `2.Peşinat − 1.Peşinat`. Hide this cell on rows where the order has fewer than 2 transactions.
- Cap visible installments at the configurable max for the page width (e.g. up to 4 columns); overflow goes into an expandable popover.

**Backend:** extend `TransactionPageDto.Items` with `installmentIndex` (int, 1-based, per `SiparisNo`, ordered by `Tarih asc`). The frontend computes `Fark` from the items.

### 10.2 "Maliyet Reçetesi" button (per row)
- New leftmost button on each row → opens a `Maliyet Reçetesi` dialog computing profit / loss for that order.
- Inputs (read-only, sourced from the existing `AccountingOrderListDto` + Muhasebe-tipi SatinAlmaTalep):
  - `ToplamFiyat`
  - `OdenenMiktar`
  - `Maliyet` (from the Muhasebe purchase request)
  - `İndirim` (from order)
  - `KDV` (from order)
- Computed outputs:
  - `Brüt Kar = ToplamFiyat − Maliyet`
  - `Net Kar = ToplamFiyat × (1 − indirim%) × (1 − kdv%) − Maliyet`
  - `Marj % = Net Kar / ToplamFiyat × 100`
  - `Tahsilat Oranı = OdenenMiktar / ToplamFiyat × 100`
- Visual: positive `Net Kar` → green panel; negative → red panel with `Zarar` label.
- Edit affordance for `Maliyet` inside the dialog (saves through the same upsert endpoint from PROMPT.md round 1, `POST /api/accounting/orders/{no}/maliyet`).
- On dialog close, invalidate `accounting-orders` query so the parent grid reflects the new Kar value.

### 10.3 Role gate
- Both the installment columns AND the Maliyet Reçetesi button are visible to **`Yonetici` + `Muhasebe` only**. Gozlemci (currently in the AccountingHistory allow-list) sees the simpler legacy column set without the breakdown — they're observers, not auditors.

**Acceptance:**
- Table renders installments correctly for rows with 0 / 1 / many transactions.
- `Maliyet Reçetesi` dialog opens, computes correctly, and live-updates parent grid on `Maliyet` save.
- Logged in as Gozlemci → installments and the button are absent.

---

## Rules

- **Match existing code conventions.** Tailwind + shadcn for UI; EF Core for data; React Query for caching; existing `DecimalInput` for any decimal field; `formatCurrency(amount, paraTipi)` for any monetary display — never hand-roll symbol concatenation.
- **Backend role gates are mandatory.** Frontend `RoleGuard` must match the backend `[Authorize(Roles = …)]` exactly. If the two disagree, either you have a security gap (frontend gate alone) or a confusing UX (backend rejection on a button that wasn't gated).
- **For any new entity / column:** create an EF Core migration. Do not modify a deployed schema in place.
- **Do not refactor unrelated code.**
- **Comment only where intent is non-obvious** (legacy parity quirks, security-tightening rationale).
- **Build cadence:** after every item, run both `npm run build` (Web) and `dotnet build CrmModern.slnx` (.NET). Both green before you push.
- **PROMPT round 1 (`PROMPT.md`) is already shipped.** Don't re-apply anything from that doc; reference it only when its work overlaps a new item.
