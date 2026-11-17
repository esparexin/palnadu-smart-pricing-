# Non-Production Import Verification Report (Post-Reconciliation)

**Date:** 2026-11-17  
**Repository:** `esparexin/palnadu-smart-pricing-`  
**Authoritative Scope:** CCTV Surveillance Equipment Catalogue Pre-Production Staging Verification  
**Policy Applied:** Decision 1 Option B (Strict 19 Canonical Brands), Evidence-Based Title Normalization, 7-Category Realignment

---

## 1. Environment Identity & Target Authentication

Forensic read-only verification was executed across the database environments:

| Parameter             | Staging / Non-Production Environment (`palnadu_smart_pricing`) | Automated Test Runner DB (`palnadu_smart_pricing_test`)             | Configured Production Target (`pooled.db.prisma.io`)                                                                                |
| :-------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Connection URL**    | `postgres://postgres:***@127.0.0.1:5432/palnadu_smart_pricing` | `postgres://postgres:***@127.0.0.1:5432/palnadu_smart_pricing_test` | `postgres://f184e89bea04944506956f04161933e5e88a8da7e4af9d6d538289a78971b0bf:***@pooled.db.prisma.io:5432/postgres?sslmode=require` |
| **Host / IP**         | `172.17.0.2:5432` (Docker Alpine aarch64)                      | `172.17.0.2:5432` (Docker Alpine aarch64)                           | `10.0.14.101:5432` (Prisma Accelerate Cloud Hosted x86_64)                                                                          |
| **Engine Version**    | PostgreSQL 17.12 on aarch64-unknown-linux-musl                 | PostgreSQL 17.12 on aarch64-unknown-linux-musl                      | PostgreSQL 17.2 on x86_64-pc-linux-musl                                                                                             |
| **Database Identity** | Dedicated local staging container                              | Disposable test database for unit test runner                       | Remote Hosted Production Target                                                                                                     |
| **Total Brands**      | **19** (Strictly canonical)                                    | 138 (Test artifacts)                                                | **0** (Untouched)                                                                                                                   |
| **Total Categories**  | **7** (Strictly approved)                                      | 96 (Test artifacts)                                                 | **1** (Default seed)                                                                                                                |
| **Total Products**    | **280** (Approved Option B models)                             | 113 (Test artifacts)                                                | **0** (Untouched)                                                                                                                   |
| **Total Variants**    | **280** (1:1 primary SKU mapping)                              | 50 (Test artifacts)                                                 | **0** (Untouched)                                                                                                                   |
| **Import Batches**    | **1** (Batch `cctv_approved_280_import_ready.csv`)             | 0                                                                   | **0** (Untouched)                                                                                                                   |

> [!IMPORTANT]
> **Production Safety Invariant Confirmed:** The production database at `pooled.db.prisma.io` contains **0 products, 0 variants, 0 brands, and 0 import batches**. Production remains completely unmutated.

---

## 2. Reconciled Staging Inventory Audit

Forensic inspection of `palnadu_smart_pricing` records following execution of the approved data decisions:

### 2.1 Reconciled Canonical Brands (Exactly 19 Brands)

The 20-brand discrepancy in the initial test database was reconciled by purging unapproved brands (`Bosch Security Systems`, `Tiandy`, `IMOU`), seeding `Panasonic` and `Trueview`, and consolidating `TP-Link Tapo` and `TP-Link VIGI` under `TP-Link`:

1. **CP PLUS** (`cp-plus`): 186 products
2. **Axis Communications** (`axis`): 13 products
3. **Dahua** (`dahua`): 12 products
4. **Sony** (`sony`): 10 products
5. **Hanwha Vision** (`hanwha-vision`): 7 products
6. **Secureye** (`secureye`): 6 products
7. **EZVIZ** (`ezviz`): 6 products
8. **i-PRO** (`i-pro`): 5 products
9. **Hikvision** (`hikvision`): 5 products
10. **TP-Link** (`tp-link`): 5 products (consolidated Tapo & VIGI)
11. **Uniview** (`uniview`): 5 products
12. **Hi-Focus** (`hi-focus`): 5 products
13. **Reolink** (`reolink`): 4 products
14. **Godrej Security Solutions** (`godrej`): 4 products
15. **Vivotek** (`vivotek`): 4 products
16. **Honeywell** (`honeywell`): 2 products
17. **Sparsh** (`sparsh`): 1 products
18. **Trueview** (`trueview`): 0 products (2 raw rows rejected due to missing model numbers)
19. **Panasonic** (`panasonic`): 0 products (independent i-PRO WV-* cameras separated)

**Total Canonical Brands in Staging:** **19**  
**Total Non-Canonical Brands:** **0**

### 2.2 Reconciled Commercial Categories (Exactly 7 Categories)

The 8th category `Surveillance Equipment` was eliminated by segregating the unmapped IMOU models into `cctv_unmapped_brands_pending.csv` and reclassifying `SF106P` under `CCTV Accessories & Infrastructure`:

1. **Network Cameras** (`network-cameras`): 132 products
2. **CCTV Accessories & Infrastructure** (`cctv-accessories-infrastructure`): 55 products
3. **Network Video Recorders** (`network-video-recorders`): 53 products
4. **Digital Video Recorders** (`digital-video-recorders`): 25 products
5. **Video Door Phones & Intercom** (`video-door-phones-intercom`): 7 products
6. **Smart & Wireless Cameras** (`smart-wireless-cameras`): 4 products
7. **Analog HD Cameras** (`analog-hd-cameras`): 4 products

**Total Commercial Categories in Staging:** **7**  
**Total Non-Compliant Categories:** **0**

---

## 3. Product & Variant Integrity Verification

- **Total Staged Products:** 280
- **Total Staged Variants:** 280
- **Mapping:** Exactly 1:1 primary SKU mapping.
- **Product Statuses:**
  - `draft`: 280 (100%)
  - `published`: 0 (0%)
- **Duplicate SKUs:** 0 duplicate SKUs.
- **Duplicate Slugs:** 0 duplicate slugs.
- **Foreign Key Consistency:**
  - Orphan variants: 0
  - Orphan images: 0
  - Orphan category mappings: 0
  - Orphan brand references: 0

---

## 4. Public Visibility & Hidden-Price Verification

Programmatic execution of public catalogue query functions against the staging database:

```ts
const prods = await listPublicProducts(dbClient.db, { limit: 50, offset: 0 });
const cats = await listPublicCategories(dbClient.db);
const brands = await listPublicBrands(dbClient.db);
```

**Results:**

- `Public Products Visible`: **0**
- `Public Categories Visible`: **0**
- `Public Brands Visible`: **0**
- `Published Products in DB`: **0**

**Price Confidentiality:** All products remain in `draft` status. Public endpoints cannot expose indicative prices, MRP, or discounts for unapproved catalogue records.
