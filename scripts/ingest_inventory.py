#!/usr/bin/env python3
"""Ingest the Clover XLSX inventory export and produce data/db.json.

Run:  python3 scripts/ingest_inventory.py

The script is idempotent: re-running with the same xlsx produces the same
db.json. Image URLs default to deterministic loremflickr placeholders keyed
by product family — they are then overridden by a curated image map for
items where we have a real product image URL.
"""
from __future__ import annotations

import json
import re
import sys
import warnings
from dataclasses import asdict, dataclass, field
from pathlib import Path

import pandas as pd

warnings.filterwarnings(
    'ignore', message='Workbook contains no default style'
)

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / 'Downloaded_File.xlsx'
DB = ROOT / 'data' / 'db.json'
IMAGE_MAP = ROOT / 'scripts' / 'image_map.json'


# ---------- type mapping ----------

# Map Clover "Categories" field → top-level UI category. Mirror what the
# Navbar dropdown and shop filter expect.
TOP_CATEGORY = {
    'NFL': 'sports',
    'NBA': 'sports',
    'MLB': 'sports',
    'NHL': 'sports',
    'Soccer': 'sports',
    'Combat': 'sports',
    'Combat ': 'sports',
    'Racing': 'sports',
    'Signed Jersey': 'memorabilia',
    'Signed Jersey ': 'memorabilia',
    'TCG': 'tcg',
    'Accessories': 'accessories',
    'Beverages': 'beverages',
    'Entertainment': 'entertainment',
}


# ---------- name cleanup ----------

TYPO_FIXES = {
    'Jeresy': 'Jersey',
    'Staduim': 'Stadium',
    'Cactucs': 'Cactus',
    'Evoltuion': 'Evolution',
    'Downtoen': 'Downtown',
    'Topp Series': 'Topps Series',
    'Upperdeck': 'Upper Deck',
    'Starwars': 'Star Wars',
    'Yerbamate': 'Yerba Mate',
    'Wnba': 'WNBA',
    'Nba': 'NBA',
    'Nfl': 'NFL',
    'Mlb': 'MLB',
    'Nhl': 'NHL',
    'Ufc': 'UFC',
    'Wwe': 'WWE',
    'Etb': 'ETB',
    'Mtg': 'MTG',
    'Tcg': 'TCG',
    'F1': 'F1',
}


def _year_prefix(two_digit: str) -> str:
    """Pick the century prefix for a 2-digit year. 30+ → 1900s, else 2000s.
    The store carries inventory from 1989 (vintage) through 2026 (pre-orders),
    so this cutoff handles every realistic year in the catalog."""
    n = int(two_digit)
    return '19' if n >= 30 else '20'


def clean_name(raw: str) -> str:
    n = str(raw).strip()
    # Normalize year prefixes — handles both vintage (89-94 etc.) and modern.
    # "25'" → "2025", "94'" → "1994"
    n = re.sub(
        r"\b(\d{2})\'",
        lambda m: f"{_year_prefix(m.group(1))}{m.group(1)}",
        n,
    )
    # "25-26" → "2025-26", "94-95" → "1994-95"
    n = re.sub(
        r"\b(\d{2})-(\d{2})\b",
        lambda m: f"{_year_prefix(m.group(1))}{m.group(1)}-{m.group(2)}",
        n,
    )
    # Title-case lightly while preserving uppercase brand acronyms.
    # We apply typo fixes via regex with word boundaries so they don't
    # touch unintended substrings.
    for wrong, right in TYPO_FIXES.items():
        n = re.sub(rf"\b{re.escape(wrong)}\b", right, n, flags=re.IGNORECASE)
    # Collapse whitespace
    n = re.sub(r'\s+', ' ', n).strip()
    return n


# ---------- category inference for the 13 rows with missing Categories ----------

CATEGORY_HINTS: list[tuple[str, str]] = [
    # Patterns checked top-to-bottom; first match wins. Prefer specific
    # brand cues over general sport names.
    (r'\b(absolute|donruss|prizm|mosaic|select|phoenix|optic|certified|panini)\b.*\b(downtown|stained glass|jumbo|football|nfl)\b', 'NFL'),
    (r'\b(donruss|prizm|mosaic|select|phoenix|optic)\b.*\b(downtown|nfl)\b', 'NFL'),
    (r'\b(absolute|phoenix)\b', 'NFL'),
    (r'\b(donruss|prizm)\b.*\b(wnba|liv golf)\b', 'NBA'),
    (r'\bdonruss\b.*\b(hobby|optic)\b', 'NFL'),
    (r'\btopps series\b', 'MLB'),
    (r'\btopps slab case\b', 'Accessories'),
    (r'\bbowman( chrome)?\b', 'MLB'),
    (r'\b(topps chrome (cactus jack|wwe|ufc))\b', 'Combat'),
    (r'\bwhite flare\b|\b(meg(a)? evolution etb)\b|\bascended hero\b', 'TCG'),
]


def infer_category(name: str) -> str | None:
    nl = name.lower()
    for pat, cat in CATEGORY_HINTS:
        if re.search(pat, nl):
            return cat
    return None


# ---------- family classification (for cluster-level images) ----------

BRAND_FAMILIES = [
    'Topps Chrome', 'Topps', 'Bowman Chrome', 'Bowman',
    'Donruss', 'Prizm', 'Mosaic', 'Select', 'Phoenix', 'Absolute',
    'Optic', 'Certified', 'Panini',
    'Upper Deck', 'O-Pee-Chee',
    'Pokemon', 'One Piece', 'Marvel', 'My Little Pony', 'Disney',
    'MTG', 'Lorcana', 'Star Wars',
    'Ultra Pro', 'BCW', 'Dragon Shield',
    'Yerba Mate',
]


def family_of(name: str) -> str:
    n = name.lower()
    for b in BRAND_FAMILIES:
        if b.lower() in n:
            return b
    return 'Other'


# ---------- format classification (for description generation) ----------

FORMAT_HINTS = [
    ('Booster Box', 'booster box'),
    ('Hobby Case', 'hobby case'),
    ('Hobby Box', 'hobby box'),
    ('Blaster Box', 'blaster box'),
    ('Blaster', 'blaster'),
    ('Mega Box', 'mega box'),
    ('Mega', 'mega'),
    ('Jumbo', 'jumbo'),
    ('Retail', 'retail'),
    ('ETB', 'elite trainer box'),
    ('Tin', 'tin'),
    ('Collection', 'collection box'),
    ('Booster', 'single booster pack'),
    ('Calendar', 'countdown calendar'),
    ('Case', 'sealed case'),
    ('Top Loader', 'top loaders'),
    ('Toploader', 'top loaders'),
    ('Sleeve', 'card sleeves'),
    ('Bundle', 'bundle'),
    ('Jersey', 'memorabilia'),
    ('Signed', 'signed item'),
]


def format_of(name: str) -> str:
    n = name.lower()
    for label, kw in FORMAT_HINTS:
        if kw in n:
            return label
    return ''


# ---------- description generation ----------

def make_description(name: str, category: str | None, family: str, fmt: str) -> str:
    base = name
    if category and category not in name:
        sport_label = {
            'NFL': 'NFL football',
            'NBA': 'NBA basketball',
            'MLB': 'MLB baseball',
            'NHL': 'NHL hockey',
            'Soccer': 'soccer',
            'Combat': 'combat sports',
            'Combat ': 'combat sports',
            'Racing': 'motorsports',
            'TCG': 'trading card game',
            'Signed Jersey': 'memorabilia',
            'Signed Jersey ': 'memorabilia',
            'Accessories': 'hobby supplies',
            'Beverages': 'beverages',
            'Entertainment': 'entertainment',
        }.get(category, category.lower())

        if fmt:
            return f"{base}. {family} {sport_label} — {fmt.lower()} format."
        return f"{base}. {family} {sport_label}."
    if fmt:
        return f"{base} ({fmt.lower()})."
    return base + "."


# ---------- image strategy ----------

# loremflickr keyword per (top-level-category, subcategory). Deterministic
# stable URL via the ?lock= query string (using the Clover ID hash).
LOREMFLICKR_KEYWORDS = {
    ('sports', 'NFL'): 'football,nfl,trading-card-box',
    ('sports', 'NBA'): 'basketball,nba,trading-card',
    ('sports', 'MLB'): 'baseball,mlb,trading-card',
    ('sports', 'NHL'): 'hockey,nhl,trading-card',
    ('sports', 'Soccer'): 'soccer,football,trading-card',
    ('sports', 'Combat'): 'boxing,ufc,trading-card',
    ('sports', 'Combat '): 'boxing,ufc,trading-card',
    ('sports', 'Racing'): 'racing,motorsport,trading-card',
    ('tcg', 'TCG'): 'pokemon,tcg,booster,box',
    ('accessories', 'Accessories'): 'cards,hobby,supplies,box',
    ('beverages', 'Beverages'): 'beverage,drink,can',
    ('memorabilia', 'Signed Jersey'): 'jersey,sports,memorabilia',
    ('memorabilia', 'Signed Jersey '): 'jersey,sports,memorabilia',
    ('entertainment', 'Entertainment'): 'music,band,memorabilia',
}


def stable_lock(s: str) -> int:
    # Deterministic positive int from a string, used as the loremflickr
    # ?lock= so each Clover product gets a stable image.
    h = 0
    for c in s:
        h = (h * 131 + ord(c)) & 0x7FFFFFFF
    return h


def placeholder_image(top: str, sub: str, key: str) -> str:
    kw = LOREMFLICKR_KEYWORDS.get(
        (top, sub),
        LOREMFLICKR_KEYWORDS.get((top, sub.strip()), 'trading-cards,collectibles'),
    )
    return f'https://loremflickr.com/600/800/{kw}?lock={stable_lock(key)}'


def load_image_overrides() -> dict[str, str]:
    if IMAGE_MAP.exists():
        try:
            return json.loads(IMAGE_MAP.read_text())
        except Exception as e:
            print(f'WARN: could not parse {IMAGE_MAP}: {e}', file=sys.stderr)
    return {}


# ---------- main ----------

@dataclass
class Product:
    id: str
    name: str
    description: str
    price: float
    image: str
    category: str
    subCategory: str
    isSealed: bool
    isSale: bool = False
    isFeatured: bool = False
    isNewRelease: bool = False
    isOutOfStock: bool = False
    isLimited: bool = False
    isPreOrder: bool = False


def main() -> int:
    df = pd.read_excel(XLSX, sheet_name='Items')
    overrides = load_image_overrides()

    products: list[Product] = []
    skipped: list[str] = []

    for idx, row in df.iterrows():
        name_raw = row['Name']
        price = row['Price']

        # Skip the blank row and the unpriced gift card
        if pd.isna(name_raw) or pd.isna(price) or str(name_raw).strip() == '':
            skipped.append(f'row {idx}: missing name or price')
            continue

        # Clover ID is our primary key. Fall back to a name-hash if missing.
        cid = row.get('Clover ID')
        if pd.isna(cid):
            cid = f'gen-{stable_lock(str(name_raw))}'
        cid = str(cid).strip()

        name = clean_name(str(name_raw))

        # Categories from xlsx; fall back to name-based inference.
        sub_raw = row.get('Categories')
        sub = str(sub_raw).strip() if not pd.isna(sub_raw) else None
        if not sub:
            sub = infer_category(name)
        if not sub:
            sub = 'Accessories'  # fallback bucket for the few unmappable rows

        top = TOP_CATEGORY.get(sub, TOP_CATEGORY.get(sub.strip(), 'other'))

        fmt = format_of(name)
        family = family_of(name)

        # Quantity → stock flag
        qty_raw = row.get('Quantity')
        qty = 0 if pd.isna(qty_raw) else int(qty_raw)
        is_out_of_stock = qty <= 0

        # "Sealed" flag — applies to actual sealed card products, not
        # accessories/beverages/jerseys. ProductCard will hide the
        # Sealed/Single badge entirely for non-card top categories.
        is_sealed = top in ('sports', 'tcg')

        # Limited if the name says so OR stock is very low and price high.
        is_limited = bool(re.search(r'limited|gold label|vintage|case$', name.lower()))

        # Pre-order if name references future years (2026+).
        is_pre_order = bool(re.search(r'\b202[6-9]\b', name))

        # Featured: high-price hobby boxes (good "hero" candidates).
        # Pure heuristic so the homepage has something to show.
        is_featured = is_sealed and not is_out_of_stock and price >= 150

        # New release: year matches 2024-25 prefix.
        is_new_release = bool(re.search(r'\b202[45]\b', name))

        description = make_description(name, sub, family, fmt)
        image = overrides.get(cid) or placeholder_image(top, sub, cid)

        products.append(
            Product(
                id=cid,
                name=name,
                description=description,
                price=float(price),
                image=image,
                category=top,
                subCategory=sub,
                isSealed=is_sealed,
                isSale=False,
                isFeatured=is_featured,
                isNewRelease=is_new_release,
                isOutOfStock=is_out_of_stock,
                isLimited=is_limited,
                isPreOrder=is_pre_order,
            )
        )

    payload = {'products': [asdict(p) for p in products]}
    DB.write_text(json.dumps(payload, indent=2))

    # Summary
    top_counts: dict[str, int] = {}
    sub_counts: dict[str, int] = {}
    for p in products:
        top_counts[p.category] = top_counts.get(p.category, 0) + 1
        sub_counts[p.subCategory] = sub_counts.get(p.subCategory, 0) + 1

    print(f'Wrote {len(products)} products to {DB.relative_to(ROOT)}')
    print(f'Skipped {len(skipped)} rows: {skipped[:5]}{"…" if len(skipped) > 5 else ""}')
    print(f'\nTop-level categories: {top_counts}')
    print(f'Subcategories: {sub_counts}')
    n_overridden = sum(1 for p in products if p.id in overrides)
    print(
        f'\nImage overrides applied: {n_overridden}/{len(products)} '
        f'({n_overridden / len(products):.0%})'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
