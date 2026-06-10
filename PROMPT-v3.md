# CRM Updates — Round 3: Sipariş Formu 1:1 Legacy Parity

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**. The single source of truth for this round is `SiparisForm.cs` (+ `SiparisForm.Designer.cs`). Open it whenever a behaviour is unclear and mirror its semantics exactly.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here. The target page is `CrmModern.Web/src/pages/orders/NewOrderPage.tsx` with its backend in `OrderController.cs` / `OrderService.cs`.

Roles: `Yonetici` (Admin), `Temsilci` (Sales rep), `Muhasebe` (Accounting), `Fabrika` (Factory), `Lojistik` (Logistics), `Gozlemci` (Observer).

**Goal of this round:** the Teklif/Sipariş Oluştur screen must become a logical 1:1 port of the legacy `SiparisForm` — same data flow, same auto-fill rules, same recipe (reçete/BoM) behaviour — while fitting entirely on screen. PROMPT-v2 §1 shipped a first pass; this round fixes what is still broken and completes the missing pieces.

**Known defects today (verified in code):**
1. Selecting a padel category does **not** populate the recipe. Root causes: `ProductCategoryRepository.GetWithComponentsAsync` (line 19) includes `CategoryComponents → Component` but **never includes `Component.Attributes`**, so every Öznitelik dropdown is empty; and `OrderService.GetComponentsByCategoryAsync` (line 116) returns **only** `KategoriBilesenleri` rows, whereas the legacy form lists **all** components with the recipe ones pre-checked (LEFT JOIN — see §2).
2. The **İlişkilendir** button (`NewOrderPage.tsx:801`) has no `onClick` — it does nothing.
3. The Montaj **Çarp** and Teslimat **Çarp** buttons (`NewOrderPage.tsx:738`, `:757`) have no `onClick` — they do nothing.
4. There is no **Teslimat Çeşidi** (Incoterms) dropdown in the UI even though `teslimatCesiti` exists in the DTO and DB.
5. There is no checked-list of recipe components — the user cannot optionally add/remove components like in the legacy form.

Apply the items below in order. Keep diffs minimal, reuse existing components, no new abstractions unless strictly required. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both must stay green.

---

## 1. ROLE GATE — Teklif/Sipariş Oluştur is Temsilci-only

The create screen and its endpoints must be open to **`Temsilci` only**. This intentionally removes `Yonetici` and `Gozlemci` from the current allow-lists.

### Frontend
- `App.tsx:37` — route `/orders/new`: `RoleGuard roles={['Temsilci']}`.
- `Sidebar.tsx:26` — `nav.createOrderQuote` entry: `roles: ['Temsilci']`.
- `DashboardPage.tsx` — remove the `/orders/new` tile from every role layout except `Temsilci`.
- `/orders/mine` stays as-is (PROMPT-v2 §6 already scopes Temsilci to own orders — verify, don't re-implement).

### Backend (`OrderController.cs`)
Change `[Authorize(Roles = …)]` to `"Temsilci"` on the **create-path** endpoints only:
- `POST /api/orders/quote`
- `POST /api/orders/order`
- `POST /api/orders/{eskiNo}/revise`
- `POST /api/orders/{sourceNo}/clone`
- `POST /api/orders/{no}/expand-recipe`
- `PUT /api/orders/{teklifNo}/convert-to-order`

Leave untouched: list/detail/search endpoints, `submit`, and `approve`/`reject` (Yonetici workflow). Catalog helpers (`GET categories`, `GET categories/{id}/components`, `GET delivery-addresses`) stay `[Authorize]` (any authenticated role) — other screens read them.

**Acceptance:** Yonetici login → no "Teklif/Sipariş Oluştur" in sidebar/dashboard, `/orders/new` redirects away, `POST /api/orders/order` returns 403. Temsilci login → full create flow works and they still see only their own orders/customers everywhere (v2 §6/§7 regression check).

---

## 2. RECIPE (REÇETE) LOADING — legacy `anaUrunComboBox_SelectedIndexChanged` 1:1

This is the core item. Reference handlers in `WindowsFormsApp1/SiparisForm.cs`:
`comboBoxKategori_SelectedIndexChanged` (line 2341), `RefreshDataGrid` (2691), `OznitelikDegistir` (2420), `bilesenCheckedListBox_ItemCheck` (2504), `urunNumericUpDown*_ValueChanged` (2513).

### 2.1 Backend — component list with recipe flags

Rework `GET /api/orders/categories/{kategoriID}/components` (`OrderService.GetComponentsByCategoryAsync`) to mirror the legacy query:

```sql
SELECT bb.BilesenID, bb.BilesenAdi, bb.Birim, kb.Adet
FROM BilesenBilgileri bb
LEFT JOIN KategoriBilesenleri kb
  ON bb.BilesenID = kb.BilesenID AND kb.KategoriID = @KategoriID
```

i.e. return **every** component, not just the recipe ones. Extend `ComponentDto`:

```csharp
record ComponentDto(
    int BilesenID, string BilesenAdi, string? Birim,
    bool InRecipe,          // KategoriBilesenleri row exists for this category
    int  DefaultAdet,       // kb.Adet when InRecipe, else 1
    decimal? DefaultFiyat,  // component master price (unchanged)
    IReadOnlyList<string> Attributes); // OznitelikTablo rows for this BilesenID
```

Implementation notes:
- Don't force everything through `GetWithComponentsAsync`. Load `BilesenBilgileri` (with `Attributes` — add the missing `.Include(c => c.Attributes)` or query `OznitelikTablo` separately) plus the `KategoriBilesenleri` rows for the category, then merge. Whatever shape you pick, **`Attributes` must arrive populated** — that's the current silent failure.
- Keep ordering by `BilesenID` ascending (legacy list order).

### 2.2 Frontend — checked component list above the grid

Per Sipariş 1..5 tab, between the "Sipariş N'in Fiyatı" row and the component table, add a scrollable checklist (fixed height ~14rem, `overflow-y-auto`) replacing the current placeholder preview box:

- One checkbox row per component, label exactly like legacy: `[{BilesenID}, {BilesenAdi} (Adet: {DefaultAdet})]`.
- On category select: list fills with **all** components; rows with `inRecipe === true` arrive **pre-checked** — this is the "padel'i seçince reçete gelsin" requirement.
- Checking a row adds it to the table; unchecking removes it. Components are therefore fully optional per order, with the recipe as the default selection.

### 2.3 Frontend — grid sync semantics (legacy `RefreshDataGrid`)

The component table (`ID / Öznitelik / Bileşen Adı / Birim / Adet / Birim Fiyat / Toplam`) contains exactly the **checked** rows, and syncs like the legacy:

- Row already in table & still checked → **keep the user's edits** (Öznitelik, Birim Fiyat); only recompute Adet.
- Row unchecked → remove from table.
- Row newly checked → append with `adet = DefaultAdet × ürünAdedi`, `birimFiyat = 0`, `toplam = 0` (legacy seeds `Fiyat = "0"`; keep that default — `DefaultFiyat` only pre-fills if you already shipped it in v2 §1b, in which case keep v2 behaviour).
- `ürünAdedi` is the Adet spinner next to "Tekil Fiyat ve Adet". When it changes, every table row's Adet recomputes as `DefaultAdet × ürünAdedi` (legacy `urunNumericUpDown*_ValueChanged`). User edits to a row's Adet survive until the next spinner change.
- Changing the category clears and reloads both the checklist and the table (legacy `ZorlaDegistir = true`).

### 2.4 Öznitelik column — dropdown + auto-defaults (legacy `OznitelikDegistir`)

Each table row's Öznitelik cell is a dropdown of that component's `attributes` (allow empty selection). After loading, apply the legacy auto-default rules based on the selected category name and component name:

| Component name contains | Category | Auto-selected Öznitelik |
|---|---|---|
| `temperred glass by EN and ISO warranty` | `Standard Padel Court` | `10mm` |
| `temperred glass by EN and ISO warranty` | `Panoramic Padel Court` | `12mm` |
| `powder painting` | `Standard Padel Court` | `metalic structure Black 80x60x3mm` |
| `powder painting` | `Panoramic Padel Court` | `metalic structure Black 80x80x3mm` |
| `fence powder paiting` *(legacy typo — match both spellings)* | any | `fence structure 50x50 black` |
| anything else | any | first attribute option, or empty |

If the auto-default value is not among the component's attribute options, inject it as an extra option (legacy adds it to the combo cell directly).

### 2.5 Tekil Fiyat + Çarp (already mostly working — verify)

- Category select pre-fills `Tekil Fiyat` from `UrunKategorileri.Fiyat` (works today via `categories.fiyat`).
- Tab **Çarp** = `tekilFiyat × adet` → "Sipariş N'in Fiyatı" readonly field, and pushes the tab (including the **current checked component rows** with their Öznitelik/Adet/Fiyat) into `form.sets[i]` (current `carp()` already does this — it will pick up the new checklist-driven `components[]` automatically).
- Save path: `OrderService.SaveAsync` already persists set components into `SiparisIslemTablo` (`OrderItem` with `OznitelikAdi`) — verify the Öznitelik chosen in the dropdown lands in `OznitelikAdi`, max length 40.

**Acceptance:**
- Pick `Panoramic Padel Court` in Sipariş 1 → checklist shows all components, recipe items checked; table shows the checked ones with Öznitelik defaults (`12mm` glass, `metalic structure Black 80x80x3mm` painting); Tekil Fiyat pre-filled.
- Uncheck `seaming tape` → row disappears. Check `Floating Floor` → row appears with Adet = recipe×spinner.
- Set spinner to 2 → all row Adet values double.
- Çarp + Siparişi Hazırla → `SiparisIslemTablo` rows contain the chosen OznitelikAdi values.
- Sipariş 2..5 tabs behave identically and independently.

---

## 3. İLİŞKİLENDİR BUTTON — copy customer into delivery block

Legacy `button4_Click` (`SiparisForm.cs:7182`): copies the **Müşteri** panel values into the **Teslimat/Montaj** fields. Wire the existing button (`NewOrderPage.tsx:801`) to do exactly that:

```
tTeslimAlanAdi ← musteriAd        tIlgiliKisi  ← musteriAd
tTelefon       ← mTelefon         tE_Mail      ← mMail
tUlke          ← mUlke            tZipKod      ← mZipKod
tVATNumarasi   ← mVATNumarasi     tAdres       ← mAdres
```

Note: `tTeslimAlanAdi` is currently a Select bound to saved delivery addresses — after İlişkilendir it must display the customer name even when that name is not in `TeslimatBilgisiTablo`. Make the control accept a free value (e.g. keep the Select for picking saved records but render the current `form.tTeslimAlanAdi` as its value/placeholder text), matching legacy where the combo is editable text.

**Acceptance:** pick customer "Abbas Salyas" → click İlişkilendir → all eight delivery fields fill from the customer block; manually editing them afterwards still works; saved order carries the values.

---

## 4. TESLİMAT / MONTAJ BLOCK — complete the missing legacy pieces

### 4.1 Teslimat Çeşidi (Incoterms) dropdown
Add the second dropdown to the right of "Teslim Alan Adı" (see screenshot / legacy `teslimatCesiti1`), bound to `form.teslimatCesiti`, options exactly:

```
EXW, FCA, CPT, CIP, DAT, DAP, DDP, FAS, FOB, MCFR, CIF, CFR, CNF
```

**EXW special rule** (legacy `teslimatCesiti_SelectedIndexChanged`, line 4566): selecting `EXW` auto-selects the saved delivery address named **`Fabrika`** (fills the delivery fields from it via the existing auto-fill) and sets `teslimatFiyat = 0`. If no `Fabrika` record exists in `TeslimatBilgisiTablo`, toast: "Fabrika seçeneği mevcut değil."

### 4.2 Teslim Alan Adı auto-fill — verify against legacy
Legacy `txtTeslimatAd_SelectedIndexChanged` (line 4473) fills İlgili Kişi / Telefon / Alt Telefon / E-Mail / VAT / Ülke / Adres from `TeslimatBilgisiTablo`. The modern handler (`NewOrderPage.tsx:766`) already maps these — verify every field actually arrives (the DTO is camelCase `teslimAlanAdi`, so the `?? d.TeslimAlanAdi` fallbacks are dead but harmless) and that `ZipKod` fills too.

### 4.3 Montaj / Teslimat Çarp buttons
Wire the two dead buttons (legacy `button2_Click` line 7140, `teslimatCarp_Click` line 7161): `fiyat × miktar` written **back into the fiyat field in place**, then Miktar is treated as consumed (legacy leaves miktar as typed; the total formula `montajFiyat × mAdet` would then double-count — so when Çarp is clicked, reset the corresponding Miktar to 1 after writing the product, keeping the on-screen math consistent with legacy results).
- Montaj Çarp: `montajFiyat = montajFiyat × mAdet; mAdet = 1`.
- Teslimat Çarp: `teslimatFiyat = teslimatFiyat × mTeslimat; mTeslimat = 1`.
- Invalid/empty number → toast "Lütfen geçerli bir sayı giriniz." and no change.

### 4.4 Checkbox gating
Montaj / Teslimat checkboxes already enable/disable their rows — keep. When a checkbox is turned off, its contribution to Brüt Toplam must be 0 (already the case in `brutToplam`).

**Acceptance:** Incoterms dropdown renders and persists to `teslimatCesiti`; EXW triggers the Fabrika auto-select + zero price; both Çarp buttons compute in place; totals strip updates live.

---

## 5. VIEWPORT FIT — full form visible at 1920×1080

Re-verify PROMPT-v2 §1a after adding the checklist and Incoterms controls:

- At 1920×1080 / 100% zoom the whole form (all three columns + action bar) is visible with **no page-level scroll in either axis**. Scrolling is allowed only *inside* the component checklist and component table.
- At 1366×768 the action bar (Formu Getir / Teklifi Hazırla / Siparişi Hazırla / Revize Et) stays visible (sticky footer already exists — keep).
- The checklist's fixed height is the adjustment knob — shrink it before anything else.

**Acceptance:** screenshot comparison against the provided legacy screenshots — same block arrangement (Müşteri+Temsilci left, Sipariş tabs center, Cari Bilgi + Teslimat/Montaj right), nothing clipped.

---

## 6. FORMU GETİR — load an existing form (legacy FormGetir)

The "Formu Getir" button currently does `nav(-1)` — wrong. Legacy opens a picker for an existing Teklif/Sipariş and loads it into the form.

- Click → small dialog with a search input (Teklif No / Sipariş No / Müşteri adı) listing the Temsilci's own orders (reuse `getOrders` — backend already scopes Temsilci to own rows per v2 §6).
- Selecting one hydrates the form exactly like the existing revise pre-load (`reviseSource` effect, `NewOrderPage.tsx:112`) **but as a new record**: numbers stay empty, save buttons create fresh Teklif/Sipariş (this is the clone-into-form flow; `POST /{sourceNo}/clone` already exists server-side — prefer hydrating client-side and saving through the normal create path so the user can edit before saving).
- Order items load back into the matching Sipariş 1..5 tabs where possible (group `OrderItem` rows by `KategoriID`; category row → tab header price/adet, component rows → checked entries with their saved Öznitelik/Adet/Fiyat).

**Acceptance:** Temsilci clicks Formu Getir, picks an old order → form fills (customer, sets with components+öznitelik, cari bilgi, teslimat/montaj) → Siparişi Hazırla creates a **new** SiparisNo without touching the source order.

---

## Rules

- **Match existing code conventions.** Tailwind + shadcn for UI; React Query for caching; existing `DecimalInput` for decimal fields; `formatCurrency` for money display.
- **Legacy parity beats elegance.** When in doubt, open `SiparisForm.cs` and copy the behaviour, including quirks (e.g. the `fence powder paiting` typo-match, seeding Birim Fiyat with 0).
- **Backend role gates are mandatory** and must match frontend `RoleGuard` exactly (§1).
- **Schema:** this round needs **no new tables/columns**. If something does come up, extend the idempotent `DatabaseSchemaMigrator` — this project does **not** use EF Migrations.
- **Do not refactor unrelated code.** PROMPT.md round 1 and PROMPT-v2 are shipped; don't re-apply them, only verify where flagged.
- **Build cadence:** after every item, `npm run build` (Web) + `dotnet build CrmModern.slnx` — both green before moving on.
