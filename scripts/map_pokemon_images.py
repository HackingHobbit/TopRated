#!/usr/bin/env python3
"""Map Pokemon items in db.json to canonical product images from the public
1niceroli/ptcg-assets GitHub repo (https://github.com/1niceroli/ptcg-assets).

Updates scripts/image_map.json in-place, preserving any existing entries.
Probes raw.githubusercontent.com to make sure each URL actually returns a PNG
before recording it.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / 'data' / 'db.json'
IMAGE_MAP = ROOT / 'scripts' / 'image_map.json'

BASE = 'https://raw.githubusercontent.com/1niceroli/ptcg-assets/main'

# Map descriptive set names → ptcg-assets set IDs.
# Order matters: longer names first so "Mega Evolution Phantasmal Flames"
# matches "Phantasmal Flames" → me2 before falling through to me1.
SET_MAP = [
    ('Phantasmal Flames', 'me2'),
    ('Ascended Heros', 'me2pt5'),
    ('Ascended Heroes', 'me2pt5'),
    ('Mega Evolution', 'me1'),
    ('Prismatic Evolutions', 'sv8pt5'),
    ('Surging Sparks', 'sv8'),
    ('Stellar Crown', 'sv7'),
    ('Journey Together', 'sv9'),
    ('Destined Rivals', 'sv10'),
    ('White Flare', 'zsv10pt5'),
    ('Black Bolt', 'zsv10pt5'),
    ('Shrouded Fable', 'sv6pt5'),
    ('Shrouted Fable', 'sv6pt5'),
    ('Twilight Masquerade', 'sv6'),
    ('Temporal Forces', 'sv5'),
    ('Paldean Fates', 'sv4pt5'),
    ('Paradox Rift', 'sv4'),
    ('151', 'sv3pt5'),
    ('Obsidian Flames', 'sv3'),
    ('Obsidain Flame', 'sv3'),
    ('Paldea Evolved', 'sv2'),
    ('Scarlet And Violet', 'sv1'),  # generic fallback
]

# Which file in the set directory to use, based on product format keywords.
# Files that we've already probed and confirmed for the relevant sets.
FORMAT_FILES = [
    ('booster bundle', 'booster-bundle.png'),
    ('booster pack', 'booster-bundle.png'),
    ('single pk', 'booster-bundle.png'),
    ('single pack', 'booster-bundle.png'),
    ('etb', 'elite-trainer-box.png'),
    ('elite trainer', 'elite-trainer-box.png'),
    ('mega', 'display.png'),
    ('hobby box', 'display.png'),
    ('booster box', 'display.png'),
    ('box', 'display.png'),
    ('collection', 'display.png'),
    ('tin', 'display.png'),
    ('bundle', 'booster-bundle.png'),
]


def head_ok(url: str) -> bool:
    """HEAD-check URL; return True if 200 + image/*."""
    try:
        r = subprocess.run(
            [
                'curl', '-sI', '-m', '4',
                '-o', '/dev/null',
                '-w', '%{http_code} %{content_type}',
                url,
            ],
            capture_output=True, text=True, timeout=6,
        )
        code, _, ctype = r.stdout.partition(' ')
        return code == '200' and ctype.startswith('image/')
    except Exception:
        return False


def map_one(product: dict) -> str | None:
    name = product['name']
    nl = name.lower()
    # Must look Pokemon-ish (subCategory TCG and some Pokemon set or term)
    if product['subCategory'] != 'TCG':
        return None
    if not any(s.lower() in nl for s, _ in SET_MAP) and 'pokemon' not in nl:
        return None

    # Find set id
    set_id = None
    for set_name, sid in SET_MAP:
        if set_name.lower() in nl:
            set_id = sid
            break
    if set_id is None:
        return None

    # Find file by format keyword
    file_name = None
    for kw, fn in FORMAT_FILES:
        if kw in nl:
            file_name = fn
            break
    if file_name is None:
        file_name = 'display.png'  # safe default

    # Some sets only have certain files — fall back chain.
    candidates = [file_name]
    if file_name != 'display.png':
        candidates.append('display.png')
    if 'booster-bundle.png' not in candidates:
        candidates.append('booster-bundle.png')

    for fn in candidates:
        url = f'{BASE}/{set_id}/{fn}'
        if head_ok(url):
            return url
    return None


def main() -> int:
    products = json.loads(DB.read_text())['products']
    if IMAGE_MAP.exists():
        image_map = json.loads(IMAGE_MAP.read_text())
    else:
        image_map = {}

    # Preserve metadata keys
    hosts = set(image_map.get('_hosts', []))
    notes = image_map.get('_notes', '')

    added = 0
    skipped = 0
    for p in products:
        cid = p['id']
        if cid in image_map and not cid.startswith('_'):
            # Already mapped by a previous run
            continue
        url = map_one(p)
        if url:
            image_map[cid] = url
            hosts.add('raw.githubusercontent.com')
            added += 1
        else:
            skipped += 1

    image_map['_hosts'] = sorted(hosts)
    if notes:
        image_map['_notes'] = notes

    IMAGE_MAP.write_text(json.dumps(image_map, indent=2))
    pokemon_total = sum(
        1 for p in products if 'pokemon' in p['name'].lower()
           or any(s.lower() in p['name'].lower() for s, _ in SET_MAP)
    )
    print(f'Added {added} Pokemon image URLs')
    print(f'Skipped {skipped} (already mapped or no match)')
    print(f'Pokemon-eligible products in db.json: {pokemon_total}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
