# CCTV / Surveillance Catalogue — seed release (2026-11-17)

Seed dataset, **not** the full market. Every row traces to a URL retrieved in this session. Nothing is filled from memory.

## Files

| File                            | Rows are                                                             | Key          |
| ------------------------------- | -------------------------------------------------------------------- | ------------ |
| brands.csv                      | brands seen in retrieved sources                                     | brand_id     |
| categories.csv                  | master taxonomy (47 nodes, 2 levels+) with in-release counts         | category_id  |
| products.csv                    | cameras, recorders, dash cams; variants point to `parent_product_id` | product_id   |
| accessories.csv                 | mounts, junction boxes, power, PoE, storage, illuminators, etc.      | accessory_id |
| brand_model_accessory_links.csv | product ↔ accessory, with relationship type + source                 | link_id      |
| sources.csv                     | every URL used, typed                                                | source_id    |
| brand_discovery_queue.csv       | **unverified leads** (background knowledge) to research next         | —            |
| coverage_report.csv             | per-brand counts and next action                                     | brand_id     |
| validate_catalog.py             | FK / vocabulary / duplicate checks (`python3 validate_catalog.py`)   | —            |

## Vocabularies

- `verification_status` (products, accessories, links)
  - `verified_datasheet` — spec values read from a manufacturer datasheet or spec page
  - `verified_listing` — model number + title seen on an official/distributor listing; specs limited to what the title or series page states
  - `partial_snippet` — only search-result excerpts seen; treat as lead, re-check before import
- `brands.catalog_status`: `products_verified` | `brand_only` (name seen in a source, no product data)
- `source_type`: `official_site` | `official_datasheet` | `datasheet_mirror` (manufacturer datasheet hosted by a third party) | `distributor_page` | `secondary_article`
- `relationship_type` (links): `datasheet_optional_accessory`, `official_listed_accessory`, `official_recommended_accessory`, `official_included_accessory`

## Conventions

- `model_number` is the string as published (e.g. `DS-2CD2043G2-I(2.8mm)`, `SATATYA CIBR20VL12CWS P2`). Do not normalise before import; match case-insensitively.
- Variant rows (lens, colour) carry only the fields that differ; inherit the rest from the parent row.
- Blank = not verified, never "none". Units: `ir_range_m` metres; `resolution_mp` megapixels.
- Country, parent company, lifecycle: filled only where a retrieved source states it.
- No prices are included (not requested). Add `mrp_inr` / `price_source` columns on import if the pricing app needs them.

## Known gaps / caveats

- hikvision.com blocks automated page fetches (bot challenge); Hikvision rows use search excerpts + datasheet mirrors.
- CP Plus: listing-level data only (model + official title); several older model pages now 404, so check lifecycle.
- Axis P1465-LE: axis.com links a discontinuation statement for the P146x-LE family. Confirm before stocking.
- Matrix `... P2` suffix models are kept as published; relationship to the non-P2 model is unconfirmed.
- WD Purple: capacity/cache per SKU is from the official variant map; full spec lines were read for 4TB/256MB and the 64MB-cache page only.
