# CCTV Catalogue Pre-Production Readiness & Reconciliation Report (Final)

**Repository:** `esparexin/palnadu-smart-pricing-`  
**Date:** 2026-11-17  
**Authoritative Scope:** CCTV Surveillance Equipment Catalogue Pre-Production Readiness  
**Approved Decisions Applied:** Strict 19 Canonical Brands (Option B), Evidence-Based Title Normalization, Category Realignment

---

## Executive Summary

Following the owner's review and confirmation of the three data decisions:

1. **Decision 1 (Brands — Option B):** The approved 19 canonical brands are strictly retained. The 93 models from unmapped brands (Bosch Security Systems: 76, Tiandy: 10, IMOU: 7) have been segregated into [`docs/standards/cctv_unmapped_brands_pending.csv`](file:///Users/admin/Desktop/palnadu-smart-pricing-/docs/standards/cctv_unmapped_brands_pending.csv) and excluded from the approved catalogue import.
2. **Decision 2 (Product Names — Approved):** Evidence-based normalization was applied across all approved records. All 114 generic titles were resolved into 100% unique, descriptive names incorporating the brand, manufacturer model code, and verified category descriptor (e.g., `"CP PLUS CP-UNR-4K2041-V2 Network Video Recorder"`).
3. **Decision 3 (Category — Approved):** The category classification for `IMOU SF106P` was corrected from `Surveillance Equipment` to `CCTV Accessories & Infrastructure`, strictly preserving the 7 approved commercial categories.
4. **Decision 4 (Production Import — Paused):** The production database at `pooled.db.prisma.io` remains **100% untouched** (0 products, 0 variants, 0 brands, 0 import batches).
5. **Discrepancy Reconciled:** The previous 20-brand state in the local test database was purged and re-seeded. Staging now holds **exactly 19 canonical brands** and **0 unapproved brands**.

---

## 1. Approved Catalogue Dataset (`cctv_approved_280_import_ready.csv`)

- **Total Approved Records:** **280 models**
- **Canonical Brands Represented:** **17 active brands** + 2 approved brands with 0 models in this pass (`Panasonic` and `Trueview`).
- **Brand Distribution (280 Models):**
  - CP PLUS (`cp-plus`): 186 models
  - Axis Communications (`axis`): 13 models
  - Dahua (`dahua`): 12 models
  - Sony (`sony`): 10 models
  - Hanwha Vision (`hanwha-vision`): 7 models
  - Secureye (`secureye`): 6 models
  - EZVIZ (`ezviz`): 6 models
  - i-PRO (`i-pro`): 5 models
  - Hikvision (`hikvision`): 5 models
  - TP-Link (`tp-link`): 5 models (consolidated Tapo & VIGI)
  - Uniview (`uniview`): 5 models
  - Hi-Focus (`hi-focus`): 5 models
  - Reolink (`reolink`): 4 models
  - Godrej Security Solutions (`godrej`): 4 models
  - Vivotek (`vivotek`): 4 models
  - Honeywell (`honeywell`): 2 models
  - Sparsh (`sparsh`): 1 model
- **Approved Categories Breakdown (Exactly 7 Categories):**
  - Network Cameras: 132 models
  - CCTV Accessories & Infrastructure: 55 models
  - Network Video Recorders: 53 models
  - Digital Video Recorders: 25 models
  - Video Door Phones & Intercom: 7 models
  - Smart & Wireless Cameras: 4 models
  - Analog HD Cameras: 4 models

---

## 2. Segregated Pending Dataset (`cctv_unmapped_brands_pending.csv`)

Per Decision 1 Option B, 93 models are excluded from staging and held in a dedicated pending file awaiting future owner review:

- **Bosch Security Systems** (`bosch-security-systems`): 76 models
- **Tiandy** (`tiandy`): 10 models
- **IMOU** (`imou`): 7 models (including `SF106P` realigned to `CCTV Accessories & Infrastructure`)

---

## 3. Image Provenance & Publication Candidates

- **Publication Review List (`cctv_published_candidates.csv`):** Exactly 5 CP PLUS models with verified dual manufacturer image URLs satisfying the PR #49 invariant ($2 \le n \le 8$ images):
  1. `CP-UNC-DA21L3C-LQ2` — CP PLUS CP-UNC-DA21L3C-LQ2 2MP Dual Light Dome Camera - 30Mtr. (2 images)
  2. `CP-UNC-DA21L3C-Q2` — CP PLUS CP-UNC-DA21L3C-Q2 2MP Network IR Dome Camera - 30Mtr. (2 images)
  3. `CP-UNC-TA21L3C-Q` — CP PLUS CP-UNC-TA21L3C-Q 2MP Network IR Bullet Camera - 30Mtr. (2 images)
  4. `CP-UNC-TA21L3C-Q2` — CP PLUS CP-UNC-TA21L3C-Q2 2MP Network IR Bullet Camera - 30Mtr. (2 images)
  5. `CP-UNC-TA21L6C-Q` — CP PLUS CP-UNC-TA21L6C-Q 2MP Network IR Bullet Camera - 60Mtr. (2 images)
- **Draft Candidates (`cctv_draft_candidates.csv`):** 275 approved models with $< 2$ images, staged strictly as `draft` for image enrichment.

---

## 4. Staging Verification Results

A complete, clean-slate import test was executed in the local staging environment (`palnadu_smart_pricing`):

- **Brands:** Exactly 19 canonical brands seeded. 0 unapproved brands.
- **Categories:** Exactly 7 approved commercial categories.
- **Products:** 280 products imported, 100% `draft`.
- **Variants:** 280 variants created (1:1 primary SKU mapping).
- **Public Storefront Visibility:** `listPublicProducts()`, `listPublicCategories()`, and `listPublicBrands()` all returned **0 items** (zero leakage).
- **Hidden Price Invariant:** Verified. No price, discount, or cost leakage occurs.
- **Foreign Key Integrity:** 0 orphan variants, 0 orphan images, 0 orphan category links.

---

## 5. Pre-Production Checklist & Next Step

| Verification Gate                          |  Result  | Notes                                                |
| :----------------------------------------- | :------: | :--------------------------------------------------- |
| **Strict 19 Canonical Brands (Option B)**  | Verified | 93 models segregated into pending dataset            |
| **Evidence-Based Title Normalization**     | Verified | 280 unique, descriptive titles; zero invented specs  |
| **7-Category Realignment**                 | Verified | IMOU SF106P realigned; 8th category eliminated       |
| **Local 20-Brand Discrepancy Resolved**    | Verified | Database purged and re-seeded with exactly 19 brands |
| **Staging Import of 280 Models**           | Verified | 280 products, 280 variants, 81 images, 0 errors      |
| **Zero Public Visibility / Hidden Prices** | Verified | All 280 products draft; public APIs return 0         |
| **Production Target Verification**         | Verified | Remote DB (`pooled.db.prisma.io`) holds 0 records    |

### Current State:

Staging verification is **100% complete and green**. Production database execution remains strictly paused awaiting your explicit command.
