# CRM Updates — Round 8: full English localization pass, responsive scaling, detailed purchase requests, order edit/delete-before-approval with audit, rep performance report, proforma fixes, and assorted UX refinements

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here.

Shipped state (v0.2.11, tag `v0.2.11`):

- **Three-stage approval chain live:** elshan Onayla → `Kontrol='Onay'` (stage stays `Siparis`) → Burcu/elshan Cari Onay (`/accounting/approval`) → `Planlama` → simge.cakir Üretime Al/Hazır → Burcu/elshan Lojistik Onay → `/logistics/ready`.
- **elshan.rasulov global access (v7 §1):** central bypass in `RoleGuard.tsx` and `Sidebar.tsx` (`kullaniciAdi === 'elshan.rasulov'` → render/show everything). Backend `AccountingController.AccountingApprovers = { burcu.karaman, elshan.rasulov }`.
- **Purchase override (v7 §2):** `POST /api/purchase/{id}/override-approve` (elshan-only), one-click short-circuit to `Onaylandı` with `Override` audit; `AllPurchaseRequestsPage` shows an "Onayla" action for elshan.
- **QC screen (v7 §4):** three top region cleaned to two cards (tabbed Detay | Kontrol action card); the left vertical Filtreme card was replaced by a compact horizontal filter bar directly above the master grid; the "Muhasebe Geçmişi" tab was removed.
- **Shipment dialog (v7 §5):** carrier defaults to "Diğer" (free text), transport type is now an Incoterms `Select` sourced from `src/lib/constants.ts` (`INCOTERMS`), a read-only payment-type field sits under transport type, "Ek Not" removed.
- **Order form (v7 §6):** `Ödeme Şekli` Select moved to the Temsilci card under `Not`; auto-generated detail lines live (`STANDART_SARTLAR` seed, `Teslimat Şekli:` upsert, montaj toggle, `Ödeme Şekli:` upsert).
- **Deploy topology:** Frontend = Electron (`UnixPadelST-Releases`, electron-updater), published by GitHub Actions on `v*` tag push. API = Render.com (`https://unixpadelst-jcxy.onrender.com`), auto-deployed on push to `main`.

### i18n architecture (read before touching any "make English" item)

- Locale files: `CrmModern.Web/src/i18n/locales/tr.json` and `en.json`. Components localize via `useTranslation()` + `t('namespace.key')`.
- **Many screens still contain hardcoded Turkish strings** (column headers, labels, button text, placeholders, dropdown option labels, toast text) that never switch to English. The bulk of Round 8 is closing this gap.
- **CRITICAL INVARIANT — never localize stored enum values.** The DB persists Turkish discriminators: order stage `SiparisMiTeklifMi ∈ {Teklif, Siparis, Planlama, Uretim, Hazir, Lojistik, Tamamlandi, Iptal}`, `Kontrol ∈ {Kontrol, Onay, Reddet}`, `OdemeDurum ∈ {Ödendi, Beklemede}`, purchase `Durum ∈ {Bekliyor, Onay Bekliyor, Ön Onaylandı, Muhasebe Tamamlandı, Onaylandı, Reddedildi}`, `SiparisOnaylari.OnayDurumu`, etc. Backend logic, filters, and audit rows depend on these literals. **Localize only the display label, never the value sent to / stored in the DB.** Filter `<Select>` options must keep the Turkish `value=` and translate only the visible label.

Items keep the user's intent. Implement in roughly the listed order; §1 (scaling) and §2 (localization) are cross-cutting and should land early because every later screen touches them. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both green before moving on.

---

## 1. RESPONSIVE SCALING — tables and buttons collide at windowed sizes

**Problem:** at non-maximized / smaller window widths, tables overflow and action buttons wrap/overlap (especially the wide grids: Kontrol, Accounting, Accounting Approval, Search, Factory, Logistics, Purchase All).

**Do:**
- Make `DataTable` (`src/components/DataTable.tsx`) horizontally scroll-safe: wrap the `<table>` in an `overflow-x-auto` container with a sensible `min-w` so columns never crush into each other; the page should not shift layout, the table should scroll internally instead. Apply `density="compact"` defaults consistently on the wide grids.
- Audit every page's action-button rows (e.g. row `actions` columns, dialog footers, top filter bars). Replace fixed multi-column rows that overflow with `flex flex-wrap gap-2` so buttons wrap cleanly; give grids responsive breakpoints (`grid-cols-2 md:grid-cols-4 lg:grid-cols-6/8`) instead of fixed column counts.
- Top-region cards that sit side-by-side (QC, Accounting Approval) must wrap (`flex-wrap` / `xl:flex-nowrap`) at narrow widths rather than squeezing.
- No content should be clipped or unreachable at common window sizes (e.g. 1280×720, 1440×900, maximized 1920×1080). Vertical page scroll is acceptable; horizontal page scroll is not (only in-table horizontal scroll is acceptable).

**Acceptance:** at 1280×720 and a half-screen window, no button overlaps another and no table column is unreadable; wide grids scroll horizontally inside their own container while the surrounding layout stays put.

---

## 2. COMPLETE ENGLISH LOCALIZATION PASS (the big one)

Goal: in English mode, **no hardcoded Turkish remains** anywhere in the listed screens — column headers, field labels, buttons, placeholders, toasts, empty-states, and **dropdown option labels** (while keeping Turkish DB values per the §0 invariant).

### 2.1 Central stage/status localization
- `SiparisMiTeklifMi` (stage), `Kontrol`, `OdemeDurum`, and purchase `Durum` currently render their raw Turkish value (e.g. via `StatusBadge` / `PurchaseStatusBadge` and inline `render`). Add a single shared mapping (e.g. `src/lib/status.ts`) that maps each Turkish value → i18n key, and have `StatusBadge`/`PurchaseStatusBadge` and every inline stage/status cell use it. English labels suggested:
  - Stage: Teklif→Quote, Siparis→Order, Planlama→Planning, Uretim→Production, Hazir→Ready, Lojistik→Logistics, Tamamlandi→Completed, Iptal→Cancelled.
  - Kontrol: Kontrol→Pending Control, Onay→Approved, Reddet→Rejected.
  - OdemeDurum: Ödendi→Paid, Beklemede→Pending.
  - Purchase Durum: Bekliyor→Waiting, Onay Bekliyor→Awaiting Approval, Ön Onaylandı→Pre-Approved, Muhasebe Tamamlandı→Accounting Done, Onaylandı→Approved, Reddedildi→Rejected.
- TR locale keeps the Turkish labels; EN locale uses the above. The badge value passed in stays the Turkish literal.

### 2.2 Per-screen English checklist (each must be 100% English in EN mode)
For each, move hardcoded strings into `tr.json`/`en.json` and reference via `t()`:
- **Accounting · Logistics Approvals** (`accounting/LogisticsApprovalsPage.tsx`) — table headers/labels (item: "table names stay Turkish").
- **Accounting · Collections** (the collections/balance grid, `accounting/AccountingPage.tsx` and/or balance page) — table headers/labels.
- **Accounting · History** (`accounting/AccountingHistoryPage.tsx`) — full English; plus functional changes in §15.
- **Accounting · Approval** (`accounting/AccountingApprovalPage.tsx`) — full English; plus the specific relabel in §14.
- **Purchase · All Requests** (`purchase/AllPurchaseRequestsPage.tsx`) — the inline column headers (`'ID'`, `'Ürün'`, `'Maliyet'`, `'Talep Eden'`, `'Departman'`, `'Tip'`, `'Durum'`, `'Aşama'`, `'Tarih'`, `'Temizle'`, pagination text "Toplam/Sayfa/Önceki/Sonraki", `computeAsama` returns) → i18n.
- **Approval · Payment Details** (`approval/PaymentDetailsPage.tsx`) — full English.
- **Approval · Final Approval** (`approval/FinalApprovalPage.tsx`) — full English.
- **Approval · Pre-Approval** (`approval/PreApprovalPage.tsx`) — sweep for leftover Turkish while here.
- **Search** (`pages/.../SearchPage.tsx`) — everything including filter dropdown option labels.
- **Logistics · History** (`logistics/LogisticsHistoryPage.tsx`) and **Logistics · Ready** (`logistics/LogisticsReadyPage.tsx`) — full English (LogisticsReadyPage still has hardcoded `'Sipariş No'`, `'Müşteri'`, `'Ülke'`, `'Aşama'`, `'İşlem'`, `'Detay'`, `'Sevkiyat Oluştur'`, dialog labels, `'İptal'`, `'Sevk et'`, the success/error toasts).
- **Create Order / Quote** (`orders/NewOrderPage.tsx`) — full English; this one is large and also drives the proforma (see §4). Hardcoded section titles (`Cari Bilgi`, `Temsilci`, `Teslimat / Montaj`, `Müşteri/Teslimat`), field labels (`Toplam Fiyat`, `Peşin`, `Kapora Miktarı`, `Şirket`, `İndirim`, `KDV`, `Not`, `Ek`, etc.), placeholders, and toasts.

### 2.3 Dropdown option labels
Filter and form `<Select>` options across all the above (customer, country, stage, control-status, payment-status, department, type, currency, etc.) must show English labels in EN mode while keeping Turkish `value=`. Where the option list is data-driven (customers, countries, users) the label is data and stays as-is; only the fixed enum lists are localized.

**Acceptance:** switch the app to English and walk every screen above — there is no Turkish text in any header, label, button, placeholder, toast, empty-state, or fixed dropdown option. Switching back to Turkish still shows correct Turkish. No DB value or filter behavior changed.

---

## 3. QUALITY CONTROL — swap Approve/Reject, raise the master grid

`quality-control/QualityControlPage.tsx`:
- In the **Kontrol** action card, **swap the positions of `Onayla` (Approve) and `Reddet` (Reject)** in the 2-column action grid (currently Reddet then Onayla → make it the order the user wants; confirm: Approve first, Reject second, OR mirror — implement Approve on the left/top, Reject on the right/bottom).
- **Raise the master grid** so the orders table is more visible without breaking the current splitter/two-card layout: reduce the default top-region height (tighten paddings / cap detail tab heights) so the grid's default share of the viewport is larger. Keep the draggable splitter and the v7 §4 filter bar exactly where they are; just shift the default split upward.

**Acceptance:** Approve/Reject are in the swapped positions; on first load the master grid shows clearly more rows than before, with the top cards intact and the splitter still draggable.

---

## 4. CREATE ORDER / QUOTE — full English + English proforma + everything-added-is-reflected

`orders/NewOrderPage.tsx` and the proforma/Excel generator.
- Full English UI per §2.2 (this screen specifically called out by the user).
- **Generated notes/clauses must be English in EN mode.** Today the auto detail lines (`STANDART_SARTLAR`, `Teslimat Şekli:`, `Ödeme Şekli:`, `SART_MONTAJ`, `SART_HAKLAR`) are persisted as Turkish DATA in `DetayTablo`. To make English proformas, introduce a language-aware generation: store standard clauses as **structured term codes** (or generate the localized text from the creator's current UI language) so the proforma can render them in English. Free-text the user types stays verbatim.
- **Everything added during creation appears on the proforma.** Whatever lines/options the user adds (detail clauses, delivery term, payment term, assembly, discount/KDV, etc.) must be reflected in the produced proforma — no silent drops.
- The produced proforma's static text (headers, "OFFER INCLUDE BELOW DETAILS", labels) is English.

**Acceptance:** creating an order/quote in English produces an all-English proforma whose body contains every clause/detail/option entered during creation; switching to Turkish produces the Turkish equivalent. DB-stored discriminators unchanged.

> Open decision: confirm whether proformas should follow the **creator's UI language at creation time** (snapshot) or always render in the **viewer's current language** (requires structured/coded clauses). Structured codes are recommended; flag if you want the simpler snapshot approach.

---

## 5. CREATE ORDER / QUOTE — payment method + itemized standard terms under the rep note (refine v7 §6)

Reinforce and complete v7 §6 — user marks this **very important**:
- In the **Temsilci** card, directly under `Not`, the **Ödeme Şekli** drops in (already moved in v7 §6 — verify). Selecting it must **directly determine whether the project is vadeli (term) or peşin (cash)** and push the corresponding line into the details.
- The standard terms must render as **separate, individual list items** (not one blob): "Prices valid for 2 weeks.", "VAT not included.", "Shipping not included.", "Assembly not included.", and a **"All rights reserved" style clause** (`SART_HAKLAR`). Each is its own line.
- **Assembly toggle:** when Montaj/Assembly is selected, the "Assembly not included." line is removed; unselecting restores it (current `SART_MONTAJ` behavior — verify and keep).
- These lines flow into both the on-screen details list and the proforma (ties into §4).

**Acceptance:** new blank form shows the standard clauses as separate lines incl. the rights-reserved clause; choosing payment method adds a single synced `Ödeme Şekli:` line and sets vadeli/peşin; toggling assembly adds/removes its line; all of it lands on the proforma.

---

## 6. CREATE ORDER / QUOTE — currency "Diğer" must include selectable Sterlin

In the Cari Bilgi currency control, the radio set is Euro/Dolar/TL and the "Diğer" (Other) `Select` currently contains only `Sterlin` but it isn't actually selectable like the others. Make **Sterlin selectable** from the "Diğer" dropdown exactly like Euro/Dolar/TL (selecting it sets `paraTipi='Sterlin'` and drives `formatCurrency` symbol `£`). `PARA_TIPLERI_DIGER = ['Sterlin']` already exists — wire it so selection works and persists.

**Acceptance:** selecting Sterlin from "Diğer" sets the currency to Sterlin everywhere (totals, proforma) with the £ symbol, identical to the other currencies.

---

## 7. ORDERS — edit/delete a created order until QC approval, with mandatory reason + visible audit

A created order can be **deleted or updated only until it is approved in Kontrol** (`Kontrol='Onay'`); once approved, editing/deleting is blocked. **A reason is mandatory** for the action, and if an order was edited or deleted it must be **marked next to it** (badge + reason visible in the relevant lists).

**Backend:**
- New endpoints (e.g. `PUT /api/orders/{no}/amend` and `DELETE /api/orders/{no}` or `POST /api/orders/{no}/cancel`) guarded so they only succeed while `Kontrol != 'Onay'` (still in editable state); otherwise `BusinessException`.
- Require a non-empty reason (`Aciklama`/`Gerekce`); reject empty.
- Prefer **soft-delete** (mark cancelled/deleted with reason + actor + timestamp) over hard delete so the audit survives; updates record an audit entry with the reason.
- Persist the audit. Reuse the existing audit table `EklemeGecmisi` (AuditEntry) or `SiparisOnaylari` if it fits; otherwise add a step to `DatabaseSchemaMigrator` (idempotent — **no EF migrations**, per project convention) for the new column(s)/table. Likely fields: a status/flag (e.g. `Silindi`/`Guncellendi`), reason, who, when.
- Authorization: order owner (Temsilci) and/or Yonetici/elshan — confirm exact gate.

**Frontend:** in MyOrders / order lists, surface "Edit" and "Delete" actions only while editable; both open a dialog requiring a reason. Deleted/updated orders show a clear badge ("Updated" / "Deleted") with the reason on hover/inline.

**Acceptance:** an order pre-Kontrol-approval can be edited or deleted only with a written reason; after `Kontrol='Onay'` both are blocked with a clear message; edited/deleted orders display a badge + the reason; the action is audited.

> Open decision: hard delete vs. soft-delete (recommended). Confirm whether a deleted order should disappear from lists or remain visible with a "Deleted" badge (the wording "yanında belirtilsin" implies it stays visible).

---

## 8. PROFORMA — "OFFER INCLUDE BELOW DETAILS" missing the `#DETAY` block

In the Cari onay → "Excel'e yaz" proforma, the section header **"OFFER INCLUDE BELOW DETAILS"** is rendered but the `#DETAY` placeholder (the `DetayTablo` detail lines) is not populated. Fix the proforma/Excel generator so the order's detail lines (the same ones from §4/§5: standard clauses, delivery term, payment term, etc.) are written under that header. Verify the same generator is used by Kontrol/Accounting/Factory "Excel" buttons and that all of them include the details.

**Acceptance:** a generated proforma lists every detail line under "OFFER INCLUDE BELOW DETAILS"; no orphan `#DETAY` placeholder remains; tested on a real order with multiple detail lines.

---

## 9. PURCHASE — detailed new-request form (units, qty × unit price, or total discount)

`purchase/NewPurchaseRequestPage.tsx` is too simple. Typical items: glue (tutkal), plexi (pleksi), netting (file), wire (tel), strap (spanzet), Mouse, etc., and **the unit varies per item**. Pricing can be **either** a discount on a total price **or** per-unit: quantity × unit price.

**Do:**
- Add a **unit** field (free text or a dropdown of common units: adet/piece, kg, m, m², roll, box, …) per item.
- Support both pricing modes per line: (a) `quantity × unitPrice` (auto-computes line total) and (b) a `total` with an optional `discount` (% or amount). Make the mode explicit and the computed total read-only.
- Consider **multiple line items** per request (a child table) since a single request often bundles several materials; otherwise at minimum enrich the single-item form with unit + qty + unitPrice + discount + computed total.
- **Schema:** add the new columns (and/or a `SatinAlmaTalepKalem` line-items table) via a `DatabaseSchemaMigrator` step (idempotent; **no EF migrations**). Update `PurchaseRequest` DTOs/entity, `PurchaseService`, and the three-stage flow so the new fields persist and display in Pre-Approval / Payment / Final / All Requests and the override path.
- Keep the existing three-stage approval + override (v7 §2) working with the richer payload.

**Acceptance:** a purchase request can capture several materials each with its own unit, and per line either qty×unitPrice or a discounted total; totals compute correctly; the data persists and is visible through every approval stage and in All Requests; existing approval flows still work.

> Open decision: single enriched line vs. multi-line items table. Multi-line is recommended (matches "tutkal, pleksi, file, tel…" bundles); confirm.

---

## 10. CUSTOMERS — fit table to screen + delete button (elshan only)

- **Fit the customers table to the screen** (the customers list grid) using the §1 responsive/`DataTable` treatment so it doesn't overflow.
- Add a **Delete customer** button **only for `elshan.rasulov`** (username gate, per the established pattern: `getUser()?.kullaniciAdi === 'elshan.rasulov'` on the frontend, and a backend gate on the delete endpoint restricted to that username — not a role). Deleting must be safe (confirm dialog; consider soft-delete or guard against deleting customers with existing orders — flag the rule).

**Backend:** add `DELETE /api/musteri/{id}` (or similar) gated to `elshan.rasulov` (`User.FindFirstValue(ClaimTypes.Name)`), in `MusteriController`/`MusteriService`.

**Acceptance:** the customers grid fits the screen; only elshan sees and can use a Delete action; the endpoint returns 403 for anyone else; deletion behaves safely (no orphaned orders / clear error).

> Open decision: hard delete vs. soft-delete and what to do when the customer has orders. Recommend block-or-soft-delete; confirm.

---

## 11. FACTORY — rep filter shows only Temsilci-role users + cari-approval date surfaced (start date fixed)

`factory/FactoryPage.tsx` and the factory chain:
- **Representative filter:** the Temsilci dropdown currently uses `getUsersLookup` (all users). Restrict it to users whose role is **Temsilci** only. Either filter client-side by role or add a role-filtered lookup; mirror this wherever a "Temsilci" filter exists.
- **Cari-approval date:** when Elshan/Burcu gives Cari onay, the **start date stays fixed** but the **approval date is updated** and travels to the factory. Concretely: keep `STarih` (start date) untouched at cari approval; surface the **cari-approval timestamp** (the `SiparisOnaylari` `MuhasebeOnaylandi` `OnayTarih`, established in v7 §3) on the factory order DTO/list so the factory sees when it was approved without overwriting the original start date.

**Acceptance:** the factory rep filter lists only Temsilci-role users; after cari approval the factory row shows the approval date while the start date is unchanged.

---

## 12. LOGISTICS READY — payment reflects the carrier agreement & amount paid (not the customer payment type)

In `logistics/LogisticsReadyPage.tsx`, the "Ödeme" info represents the **logistician's agreement with the carrier company**, not the customer's payment. Revise so it shows **how they agreed and how much they paid** the carrier (firm + agreed amount/terms captured in the shipment dialog: `firmaAdi`, `fiyat`, plus any agreement note). This **supersedes the v7 §5 customer-payment-type read-only field** on this screen — replace that field with the carrier-agreement/amount display in both the grid column and the create-shipment dialog.

**Acceptance:** Logistics Ready shows the carrier firm and the agreed/paid amount (and terms if captured) instead of the customer's Peşin/Vadeli type; the create-shipment flow captures and displays this; amounts are correct.

---

## 13. REPORTING — daily/weekly/monthly representative performance (Yönetici-only)

Add a **detailed rep performance report** visible **only to Yonetici** (role gate on route + nav + backend). For each representative: orders created, how many progressed (by stage), conversion (quote→order), approved/rejected counts, totals — grouped by **daily / weekly / monthly** periods.

**Backend:** new `ReportingController`/`ReportingService` endpoint(s) aggregating `SiparisAlTablo` by `KullaniciID` (Temsilci users) and period; `[Authorize(Roles="Yonetici")]`.

**Frontend:** new page + nav entry (Yonetici-only via `RoleGuard`), with a period selector (day/week/month) and per-rep breakdown (table + maybe a chart reusing `DashboardCharts`). Fully English + Turkish i18n.

**Acceptance:** a Yonetici sees a per-rep performance report with day/week/month toggles and meaningful metrics (created / progressed / approved / rejected / conversion / totals); non-Yonetici cannot see the nav item or reach the route (redirect) and the endpoint returns 403.

---

## 14. ACCOUNTING · APPROVAL — relabel "Approve Cari" / "Awaiting Cari Approval"

On `accounting/AccountingApprovalPage.tsx`, the half-translated labels "Approve Cari" and "Awaiting Cari Approval" must read cleanly. Provide proper localized strings via i18n: **TR** → "Cari Onayla" / "Cari Onay Bekliyor"; **EN** → "Approve Account" / "Awaiting Account Approval" (or the term you prefer for "Cari"). The user specifically asked these be properly Turkish in TR mode — ensure the TR locale is clean and natural.

**Acceptance:** the two labels render as natural language in both locales (no "Approve Cari" Turklish); button still triggers the same cari-approval mutation.

---

## 15. ACCOUNTING · HISTORY — full English + "Representative" + only Temsilci-role rows

`accounting/AccountingHistoryPage.tsx`:
- Full English per §2.2.
- Rename the "Sales Rep" column/label to **"Representative"**.
- **Only include rows for users with the Temsilci role** in the representative dimension (filter out non-Temsilci users from that column/grouping). Confirm whether this means filtering the rows or just the rep dropdown — implement so the representative shown is always a Temsilci.

**Acceptance:** Accounting History is fully English, the rep column is labeled "Representative", and only Temsilci-role representatives appear.

---

## Conventions & Rules

- **Match existing code conventions:** Tailwind + shadcn, React Query, shared `DataTable` (`density="compact"` on wide grids), `OrderDetailModal`, `formatCurrency`/`formatDate`, username/role gate patterns (`useAuth().getUser()?.kullaniciAdi` frontend; `User.FindFirstValue(ClaimTypes.Name)` / `[Authorize(Roles=…)]` backend). Every new/changed UI string gets both `tr` and `en` i18n entries.
- **Never localize stored values** — display labels only; `<Select>` options keep Turkish `value=` (see §0).
- **Schema changes go through `DatabaseSchemaMigrator`** (idempotent), **never EF migrations** (§7, §9, possibly §11/§10 audit columns).
- **Username gates** stay constant-string based; do not implicitly let "Yonetici" pass where the spec names a specific username (e.g. elshan-only delete in §10, override in v7 §2). elshan's global bypass (v7 §1) is frontend visibility only — backend mutation gates are widened explicitly per endpoint.
- **Money-blackout invariant (v5 §2) preserved:** no parasal field leaks to Factory-role DTOs; §11's approval-date surfacing carries no amounts.
- **Don't regress v1–v7 behavior;** no unrelated refactors. Where Round 8 supersedes earlier behavior it's called out (§12 supersedes the v7 §5 customer-payment field on Logistics Ready).
- **Live verification (where applicable):** for backend/data changes (§7, §8, §9, §11) verify against the prod DB via the `.tmp-dbq` scratch console (user-secrets `crm-modern-api-secrets`); do **not** mutate real customer data without explicit confirmation.
- **Build cadence:** after each item, `npm run build` (Web) + `dotnet build CrmModern.slnx` — both green before proceeding.

## Release

When all items are done: bump `CrmModern.Web/package.json` to **0.2.12** (write **without BOM** — do not use `Set-Content`; use an encoding-preserving edit), commit, and push tag `v0.2.12` → GitHub Actions publishes the Electron release. API ships to Render automatically on push to `main`.

## Open decisions to confirm before/while implementing
1. **§4 proforma language:** snapshot at creator's language vs. render in viewer's language (structured clause codes). Recommended: structured codes.
2. **§7 orders:** hard delete vs. soft-delete; deleted orders disappear vs. stay with a "Deleted" badge (wording implies stay-visible). Exact authorization (owner / Yonetici / elshan).
3. **§9 purchase:** single enriched line vs. multi-line items table (recommended). Unit list: free text vs. fixed dropdown.
4. **§10 customers:** hard vs. soft delete; behavior when the customer has existing orders.
5. **§14:** preferred English term for "Cari" (Account / Current Account / Receivable).
6. **§15:** filter rows by Temsilci vs. only the rep dropdown.
