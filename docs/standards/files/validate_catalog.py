#!/usr/bin/env python3
"""Referential-integrity and vocabulary checks for the CCTV catalogue CSVs.
Usage: python3 validate_catalog.py [dir]   (exit code 1 if any ERROR)"""
import csv, sys, os, re
D = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
def rd(n):
    with open(os.path.join(D, n), newline='', encoding='utf-8') as f: return list(csv.DictReader(f))
B, C, P, A, L, S = (rd(x) for x in ('brands.csv','categories.csv','products.csv','accessories.csv','brand_model_accessory_links.csv','sources.csv'))
err, warn = [], []
def pk(rows, col, name):
    seen = set()
    for r in rows:
        if r[col] in seen or not r[col]: err.append(f'{name}: duplicate/blank {col} {r[col]!r}')
        seen.add(r[col])
    return seen
bid, cid, pid, aid = pk(B,'brand_id','brands'), pk(C,'category_id','categories'), pk(P,'product_id','products'), pk(A,'accessory_id','accessories')
pk(L,'link_id','links'); pk(S,'source_id','sources')
surl = {r['url'] for r in S}
V_ST = {'verified_datasheet','verified_listing','partial_snippet'}
V_SRC = {'official_site','official_datasheet','datasheet_mirror','distributor_page','secondary_article'}
for r in B:
    if r['catalog_status'] not in ('products_verified','brand_only'): err.append(f"brand {r['brand_id']}: bad catalog_status")
    if not r['source_url']: err.append(f"brand {r['brand_id']}: no source_url")
for r in C:
    if r['parent_category_id'] and r['parent_category_id'] not in cid: err.append(f"category {r['category_id']}: bad parent")
pmap = {r['product_id']: r for r in P}
for tbl, rows, idc in (('product', P, 'product_id'), ('accessory', A, 'accessory_id')):
    keys = {}
    for r in rows:
        i = r[idc]
        if r['brand_id'] not in bid: err.append(f'{tbl} {i}: unknown brand')
        if r['category_id'] not in cid: err.append(f'{tbl} {i}: unknown category')
        if not r['model_number'].strip(): err.append(f'{tbl} {i}: blank model_number')
        if r['verification_status'] not in V_ST: err.append(f'{tbl} {i}: bad verification_status')
        if r['source_type'] not in V_SRC: err.append(f'{tbl} {i}: bad source_type')
        if not r['source_url']: err.append(f'{tbl} {i}: no source_url')
        elif r['source_url'] not in surl: err.append(f'{tbl} {i}: source_url not in sources.csv')
        if r.get('datasheet_url') and r['datasheet_url'] not in surl: warn.append(f'{tbl} {i}: datasheet_url not registered in sources.csv')
        k = (r['brand_id'], re.sub(r'\s+', '', r['model_number']).upper())
        if k in keys: err.append(f'{tbl} {i}: duplicate of {keys[k]}')
        keys[k] = i
for r in P:
    if r['parent_product_id']:
        par = pmap.get(r['parent_product_id'])
        if not par: err.append(f"product {r['product_id']}: bad parent")
        elif par['brand_id'] != r['brand_id']: err.append(f"product {r['product_id']}: parent brand mismatch")
    for c in ('resolution_mp','channels'):
        if r[c] and not re.fullmatch(r'\d+(\.\d+)?', r[c]): err.append(f"product {r['product_id']}: non-numeric {c}={r[c]!r}")
for r in L:
    p = pmap.get(r['product_id'])
    if not p: err.append(f"link {r['link_id']}: unknown product"); continue
    if r['accessory_id'] not in aid: err.append(f"link {r['link_id']}: unknown accessory")
    if r['brand_id'] != p['brand_id']: err.append(f"link {r['link_id']}: brand mismatch")
    if r['verification_status'] not in V_ST: err.append(f"link {r['link_id']}: bad status")
    if r['source_url'] not in surl: err.append(f"link {r['link_id']}: source_url not in sources.csv")
print(f"brands={len(B)} categories={len(C)} products={len(P)} accessories={len(A)} links={len(L)} sources={len(S)}")
for w in warn: print('WARN ', w)
for e in err: print('ERROR', e)
print('RESULT:', 'FAIL' if err else 'PASS', f'({len(err)} errors, {len(warn)} warnings)')
sys.exit(1 if err else 0)
