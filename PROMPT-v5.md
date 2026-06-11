# CRM Updates — Round 5: Kontrol yerleşimi (legacy ekran düzeni) + Fabrika maliyet karartması + canlı Siparişlerim + Tahsilat renk temizliği

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**. For §1 the layout reference is the legacy **Kontrol** screen (`Kontrol.Designer.cs`): a screenshot of it was provided by the user and its arrangement is binding.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here.

PROMPT-v4 shipped (commit `69067c4`): `/quality-control` is the elshan.rasulov-only Kontrol screen (`QualityControlPage.tsx`, 779 lines), approve→`Planlama` rule is live, Siparişlerim has the elshan global view. **Do not re-apply v4** — this round is corrective feedback on the shipped result plus three independent items.

The items keep the user's numbering (there is no item 4). They are independent — implement and verify each in order. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both must stay green.

---

## 1. KONTROL EKRANI YERLEŞİMİ — too cramped; rebuild to the legacy panel arrangement

**Problem:** the shipped layout (filter strip on top, grid in the middle at `h-[36vh]`, detail squeezed into a 3-column bottom area + a 11rem bottom strip) is far too cramped — every block fights for space simultaneously.

**Fix:** rearrange `QualityControlPage.tsx` to the legacy screen's structure: **detail panels on TOP (tabbed, so only one block needs space at a time), master grid at the BOTTOM with the full page width and the majority of remaining height.** No behaviour changes — all queries, mutations, filter semantics, legacy quirks from v4 stay exactly as shipped; this is a re-skin.

### 1.1 Target structure (top → bottom)

**Top region** (fixed height, roughly 40–45% of viewport, `shrink-0`) — four cards side by side, left → right:

1. **Filtreme** (fixed width ~260px) — the existing filter controls, restacked **vertically** in legacy order: Sipariş No, Müşteri Adı, Temsilci Adı, Ülke, Kontrol Durumu (default `Kontrol`), Ödeme Durumu, Aşama, then a "Tarih Aralığı" sub-header with Baş / Son date pickers, then **Reset** + **Ara** buttons side by side. All existing filter logic (`buildSearchParams`, SiparişNo-overrides-all, `T`→`S`, Iptal guard, min-Tarih default) is reused untouched.

2. **Detay sekmeleri** (flexible width, the widest card) — a tab strip (existing `ui/tabs` component) with tabs **exactly in this order**: `Cari | Muhasebe Geçmişi | Müşteri | Teslimat | Satış Temsilcisi | Detay`. Default tab: **Cari**. Tab contents are the already-built v4 blocks, redistributed:
   - **Cari** — "Cari Bilgiler": Sipariş Toplam, Para Birimi, Kaparo Bakiye (shown as `%{pesinYuzde}` + amount, like the legacy two-part field), Sipariş Bakiye, Ödenen Bakiye (the editable `DecimalInput`), then the **Cari Güncelle** and **Revize Et** buttons stacked beneath (both live in this tab per the screenshot — move Revize Et out of the action grid).
   - **Muhasebe Geçmişi** — the existing transactions table (internal scroll).
   - **Müşteri** — the existing Müşteri block fields.
   - **Teslimat** — the existing Teslimat Detayları block (fields + Montaj/Teslimat checkboxes + fiyatlar + Teslimat Çeşidi).
   - **Satış Temsilcisi** — the existing Satış Temsilcisi block fields.
   - **Detay** — the DetayTablo list **and** the Ürün & Bileşen table stacked vertically (both internal scroll; the legacy quirk — blank Fiyat on component rows — stays).

3. **Kontrol** (fixed width ~300px) — heading "Kontrol": Sipariş No (read-only), **Not** = `siparisNotu` (read-only, multiline, generous height — this is the big textarea in the screenshot), then a 2×3 button grid: `Satıcı Ek | Muhasebe Ek`, `Excel'e yaz | Form'u getir`, `Reddet | Onayla`. Five of these exist in v4; **Form'u getir is new**: legacy `buttonFormGetir_Click` (Kontrol.cs:3548) opens the read-only order form viewer — modern equivalent: open the existing `OrderDetailModal` for the selected SiparisNo (no selection → the standard "Lütfen sipariş seçiniz." toast).

4. **Fabrika** (fixed width ~260px) — heading "Fabrika": Aşama (select), **Bitiş** (date — the v4 `asamaTarih`), Not (the `asamaNot` input, rendered as a multiline textarea per the screenshot), **Kaydet**. Same `updateStage` mutation, untouched.

**Bottom region** (`flex-1 min-h-0`) — the master grid at **full page width**, internal scroll only. Columns unchanged.

### 1.2 Behaviour notes
- **Panels are always visible** (legacy keeps them on screen even with nothing selected): when no row is selected, fields show `—`/empty and the action buttons are disabled (or fire the select-first toast) — replace the current "select a row" full-area placeholder.
- Selecting a grid row populates the panels; keep the v4 reset semantics on Reset/mutation success.
- **Remove the yellow row highlighting entirely** (user: "Sarıları önemseme") — delete the `OdemeDurum != 'Beklemede' → bg-yellow-200` branch in `rowClassName` (QualityControlPage.tsx:511-514). Keep the selected-row outline. The legacy quirk is hereby retired; also drop its mention from any code comment.
- **Viewport:** 1920×1080 @100% → zero page-level scroll in both axes; only the grid, tab bodies, Detay/Ürün&Bileşen/Muhasebe lists scroll internally. At 1366×768 the four top cards may compress but the action buttons stay reachable.

**Acceptance:** side-by-side with the provided legacy screenshot — same four top panels in the same order with the same controls, tabbed middle card, full-width grid at the bottom, no yellow rows, no page scrollbars, and every v4 action still works (Onayla→Planlama, Reddet+neden, Cari Güncelle, Aşama Kaydet, ekler, Excel, yeni Form'u getir).

---

## 2. FABRİKA MALİYET KARARTMASI — Fabrika rolü hiçbir aşamada hiçbir maliyet/fiyat görmesin

**Hard requirement (user, verbatim intent):** nobody with the `Fabrika` role — and nothing rendered inside the Fabrika area — may ever see any order-related money value, at any stage. This must be enforced **server-side**; hiding buttons client-side is not sufficient.

Money fields in scope (the blackout set): `ToplamFiyat`, `BrutToplamFiyat`, `MontajFiyat`, `TeslimatFiyat`, `Indirim`, `Kdv`, `PesinYüzde`, `OdenenMiktar`, kaparo/kalan bakiye (derived), per-item `Fiyat`, and any currency totals computed from them.

### 2.1 Backend — strip at the source
- `OrderController.GetByNo` (`GET /api/orders/{no}`) and any other order-detail path reachable by Fabrika (check `FactoryController`, `SearchController`, reporting): when the caller's role claim is `Fabrika`, **null out every blackout-set field on the DTO before returning** (items included — `items[].fiyat = null`). Implement once in a small helper (e.g. `OrderDtoSanitizer.StripPricesForFactory(dto)`) and apply it in every endpoint that can serve Fabrika; do not fork the DTO shape.
- `FactoryOrderListDto` already carries no money fields — keep it that way (regression guard: add a comment on the record).
- `GET /api/orders/{no}/excel`: the proforma contains prices. Confirm the gate excludes `Fabrika` (it is `Yonetici,Muhasebe` + elshan today) and that the FactoryPage Excel button being hidden for Fabrika (`isFabrika` check, FactoryPage.tsx:29-31, :107-109) is backed by that 403 — frontend hiding alone is not acceptable.
- `GET /api/orders/{no}/material-cost` is `Yonetici,Muhasebe` — verify, leave.
- **Audit the remaining Fabrika-reachable surface** and close anything that leaks money to the role: `GET /api/search` results (if rows carry `toplamFiyat`, strip for Fabrika), dashboard/reporting endpoints feeding `DashboardPage`/`DashboardCharts` (Fabrika's dashboard layout must contain no revenue KPI/chart — remove the tiles for that role if present), `GET /api/quality-control/{no}/history` (timeline — money-free; verify), `/orders/my` (Fabrika role isn't in the route guard — verify backend also rejects or scopes).

### 2.2 Frontend — defense in depth
- `OrderDetailModal` (opened from FactoryPage row click / Form button and from MyOrders): when `useAuth` role is `Fabrika`, do not render the price strip (`PriceBox` row — Brüt Toplam / İndirim / Toplam / Montaj / Teslimat, OrderDetailModal.tsx:97-103) nor the item `Fiyat` column (:129). Render the rest (customer, delivery, items without prices, stage timeline) unchanged. With §2.1 the values would be null anyway — the UI must not show empty price boxes either.
- Sweep every component reachable by a Fabrika login (`/factory`, `/purchase/*`, `/search`, `/dashboard`, `/updates`) for `formatCurrency`/fiyat renders of **order** money and gate them on role.

**Scope note:** purchase-request `urunMaliyeti` on `/purchase/*` is the cost the Fabrika user **types in themselves** when requesting a purchase — blacking it out would break the form. It stays visible **only inside the purchase module**; everything order-related is blacked out. If the user wants purchase costs hidden too, that is a separate decision — flag it, don't implement.

**Acceptance:** login with a `Fabrika` user → factory list shows no money column; opening any order's Form modal shows no price strip and no Fiyat column; the raw API response for `GET /api/orders/{no}` contains nulls for every blackout-set field; Excel download returns 403; search results and dashboard show no order money anywhere. Login as Yonetici → everything still visible (no regression).

---

## 3. SİPARİŞLERİM — statü değişimleri kendiliğinden yansısın

**Problem:** `MyOrdersPage` fetches `['my-orders']` once with the global default `staleTime: 30_000` (main.tsx:14-21) and no polling — a Temsilci keeping the tab open does not see Kontrol/QC approvals, Fabrika stage moves, or logistics transitions until they manually reload.

**Fix (keep it lightweight — no websockets/polling infra beyond React Query):**
- On the `['my-orders']` query set: `refetchInterval: 30_000`, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: 'always'`, `staleTime: 0`. The page is a small list — a 30s poll is cheap and guarantees every status change (`SiparisMiTeklifMi` + `Kontrol`) appears within half a minute, including changes made by **other** users/sessions.
- In-app immediacy: every mutation in this client that changes an order's status must also `invalidateQueries({ queryKey: ['my-orders'] })` — QC approve/reject/stage-save (`refreshAll` in QualityControlPage), factory `moveToProduction`/`markReady`, accounting `approve-and-move-to-planning`, logistics transitions, and the convert-to-order/revise flows on MyOrdersPage itself. Grep for `useMutation` across `src/pages` and add the invalidation where an order status is touched.
- Both status dimensions stay visible per row (Aşama + Kontrol badge — shipped in v4 §6.1; verify, don't rebuild).

**Acceptance:** Temsilci A leaves Siparişlerim open → elshan approves A's order in Kontrol → within ≤30s (or instantly on tab refocus) the row shows Aşama=`Planlama`, Kontrol=`Onay` with no manual refresh. Same for a Fabrika `Uretim` move.

---

## 5. MUHASEBE TAHSİLAT — satır renklendirmesini kaldır (default beyaz)

`AccountingPage.tsx` colours rows by `muhasebeDurumu` via `rowColourClass` (lines 53-59: Onaylandı→green, Reddedildi→rose, Onay Bekliyor→amber, mirroring legacy `SiparisAlDataGridRenklendir`). **The user wants this gone — all rows default (white) background.**

- Delete `rowColourClass` and its usage in the table's `rowClassName`; keep selected-row styling and hover behaviour from the shared `DataTable` defaults.
- The status stays readable through its existing column/badge — no replacement visual is needed.
- Scope is the **Tahsilat** screen only: leave `AccountingHistoryPage.tsx:507` (kar/zarar `isLoss` red/emerald card tint) and status badges elsewhere untouched.

**Acceptance:** Muhasebe Tahsilat list renders every row with the default background regardless of `muhasebeDurumu`; durum is still visible as text/badge; history page unchanged.

---

## Rules

- **Match existing code conventions.** Tailwind + shadcn (`ui/tabs` for §1), React Query, shared `DataTable`/`OrderDetailModal`, `formatCurrency`/`formatDate`, i18n keys (tr + en) for every new string — including the new `Form'u getir` button and tab labels.
- **§1 is layout-only.** All v4 behaviour, endpoints, gates and quirks persist except the two explicitly retired: yellow rows (§1.2) — and note Revize Et merely *moves* into the Cari tab.
- **§2 is backend-first.** A client with the Fabrika JWT must be unable to obtain order money values from any endpoint, regardless of UI. Frontend hiding is the second layer, never the only one.
- **No schema changes expected.** If anything surfaces, use the idempotent `DatabaseSchemaMigrator` — this project does **not** use EF Migrations.
- **Do not refactor unrelated code.** Rounds 1–4 are shipped; verify-only where flagged.
- **Build cadence:** after every item, `npm run build` (Web) + `dotnet build CrmModern.slnx` — both green before moving on.
