#!/usr/bin/env python3
"""Apply the Clover product-image package to local DB and Supabase.

The desktop package uses images/NNN_<CLOVER_ID>.jpg, so IDs are matched
exactly rather than by product-name similarity.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = Path('/Users/josephbeaman/Desktop/clover-product-images')
IMAGE_DIR = PACKAGE / 'images'
DB_PATH = ROOT / 'data' / 'db.json'
IMAGE_MAP_PATH = ROOT / 'scripts' / 'image_map.json'
ENV_PATH = ROOT / '.env.local'


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                values[key.strip()] = value.strip()
    values.update({key: value for key, value in os.environ.items() if value})
    return values


def image_records() -> dict[str, Path]:
    records: dict[str, Path] = {}
    for path in sorted(IMAGE_DIR.glob('*.jpg')):
        match = re.match(r'^\d+_([A-Z0-9]+)\.jpg$', path.name)
        if match:
            records[match.group(1)] = path
    return records


def upload_and_patch(pid: str, path: Path, url: str, key: str) -> str:
    storage_path = f'clover/{pid}.jpg'
    blob = path.read_bytes()
    storage_url = f'{url}/storage/v1/object/product-images/{storage_path}'
    upload = urllib.request.Request(
        storage_url,
        data=blob,
        method='POST',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
        },
    )
    with urllib.request.urlopen(upload, timeout=120):
        pass

    public_url = f'{url}/storage/v1/object/public/product-images/{storage_path}'
    patch_url = f'{url}/rest/v1/products?id=eq.{urllib.parse.quote(pid)}'
    patch = urllib.request.Request(
        patch_url,
        data=json.dumps({'image': public_url, 'image_representative': False}).encode(),
        method='PATCH',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
    )
    with urllib.request.urlopen(patch, timeout=60):
        pass
    return public_url


def main() -> None:
    if not PACKAGE.exists():
        raise SystemExit(f'Image package not found: {PACKAGE}')

    records = image_records()
    db = json.loads(DB_PATH.read_text())
    products = db.get('products', [])
    product_ids = {product['id'] for product in products}
    missing_images = product_ids - records.keys()
    unmatched_images = records.keys() - product_ids
    if missing_images:
        raise SystemExit(
            f'Exact mapping check failed: missing images={len(missing_images)}'
        )
    if unmatched_images:
        print(
            f'Skipping {len(unmatched_images)} export image(s) with no current '
            f'catalog record: {sorted(unmatched_images)}'
        )

    env = load_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    service_key = env.get('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not service_key:
        raise SystemExit('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

    image_map = json.loads(IMAGE_MAP_PATH.read_text()) if IMAGE_MAP_PATH.exists() else {}
    total = len(products)
    for index, product in enumerate(products, 1):
        pid = product['id']
        public_url = upload_and_patch(pid, records[pid], supabase_url, service_key)
        product['image'] = public_url
        product['imageRepresentative'] = False
        image_map[pid] = public_url
        if index % 25 == 0 or index == total:
            print(f'Applied {index}/{total}')

    DB_PATH.write_text(json.dumps(db, indent=2) + '\n')
    IMAGE_MAP_PATH.write_text(json.dumps(image_map, indent=2) + '\n')
    print(f'Updated {total} local products and Supabase products.image records.')


if __name__ == '__main__':
    main()
