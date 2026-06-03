#!/usr/bin/env python3
"""Push data/db.json into a Supabase project's `products` table.

Run after applying supabase/migrations/0001_init.sql:

    export SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
    export SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOi...'  # service role, NOT anon
    python3 scripts/migrate_to_supabase.py

The script is idempotent — it uses an UPSERT keyed on product id, so
re-running re-syncs whatever's in db.json without creating duplicates.

Reads the same db.json that the site uses, so the flow is:
  1) Edit Downloaded_File.xlsx (the Clover export)
  2) Re-run scripts/ingest_inventory.py     → rebuilds data/db.json
  3) Re-run scripts/migrate_to_supabase.py  → pushes db.json to Postgres

Service role key is required (not the anon key) because RLS would block
mass inserts from an anonymous client. Keep the service role key in your
shell or a .env file you do NOT commit.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / 'data' / 'db.json'

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')


def die(msg: str) -> None:
    print(f'ERROR: {msg}', file=sys.stderr)
    sys.exit(1)


def post_upsert(table: str, rows: list[dict], headers: dict[str, str]) -> None:
    """Bulk upsert via the PostgREST endpoint with on_conflict=id."""
    if not rows:
        return
    body = json.dumps(rows).encode('utf-8')
    url = f'{SUPABASE_URL}/rest/v1/{table}?on_conflict=id'
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        die(f'{table} upsert failed: {e.code} {e.read().decode()[:400]}')
    except urllib.error.URLError as e:
        die(f'{table} upsert network error: {e.reason}')


def main() -> int:
    if not SUPABASE_URL or not SERVICE_KEY:
        die(
            'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment. '
            'See SUPABASE_SETUP.md for where to find them.'
        )

    if not DB.exists():
        die(f'{DB} not found — run scripts/ingest_inventory.py first.')

    db = json.loads(DB.read_text())
    products = db['products']

    # ------------------------------------------------------------------
    # 1) Make sure every subCategory in db.json exists in categories.
    #    The migration seeds the 13 known categories already, but if the
    #    xlsx adds a new one we want to discover it here.
    # ------------------------------------------------------------------
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',  # makes POST behave as UPSERT
    }

    top_map = {
        'sports': ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'Combat', 'Racing', 'Golf'],
        'tcg': ['TCG'],
        'accessories': ['Accessories'],
        'beverages': ['Beverages'],
        'memorabilia': ['Signed Jersey'],
        'entertainment': ['Entertainment'],
    }
    sub_to_top = {sub: top for top, subs in top_map.items() for sub in subs}

    seen_subs = sorted({p['subCategory'] for p in products if p.get('subCategory')})
    category_rows = [
        {
            'id': sub,
            'name': sub,
            'top_level': sub_to_top.get(sub, 'accessories'),
        }
        for sub in seen_subs
    ]
    post_upsert('categories', category_rows, headers)
    print(f'Upserted {len(category_rows)} categories.')

    # ------------------------------------------------------------------
    # 2) Push products. Map camelCase → snake_case column names.
    # ------------------------------------------------------------------
    product_rows = [
        {
            'id': p['id'],
            'name': p['name'],
            'description': p.get('description', ''),
            'price': p['price'],
            'image': p['image'],
            'category_id': p.get('subCategory'),
            'is_sealed': p.get('isSealed', False),
            'is_sale': p.get('isSale', False),
            'is_featured': p.get('isFeatured', False),
            'is_new_release': p.get('isNewRelease', False),
            'is_out_of_stock': p.get('isOutOfStock', False),
            'is_limited': p.get('isLimited', False),
            'is_pre_order': p.get('isPreOrder', False),
        }
        for p in products
    ]

    # Upsert in batches so we don't hammer PostgREST with a 5MB payload.
    BATCH = 100
    for i in range(0, len(product_rows), BATCH):
        chunk = product_rows[i : i + BATCH]
        post_upsert('products', chunk, headers)
        print(f'Upserted products {i + 1}-{i + len(chunk)} of {len(product_rows)}')

    print(f'\nDone. {len(product_rows)} products live in Supabase.')
    print('\nNext: create your first admin user in the Supabase dashboard, then')
    print("run this in the SQL editor to grant them admin role:")
    print("  update public.profiles set role = 'admin' where email = 'you@example.com';")
    return 0


if __name__ == '__main__':
    sys.exit(main())
