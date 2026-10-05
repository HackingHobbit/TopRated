// Which game / franchise a TCG-category product belongs to. Stored on
// products.game so the shop's "Pokémon", "Magic", etc. links filter on a real
// field instead of searching names (most Pokémon products are named by set —
// "Destined Rivals ETB" — and never say "Pokémon").
//
// detectGame() is a best guess from the product name, used when a product is
// first added (Clover sync) and for the one-time backfill. Staff can correct
// it in the admin product editor; a saved value is never re-guessed.
// Client-safe (no server imports): the shop sidebar and menus use GAMES.

export const GAMES = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'magic', label: 'Magic: The Gathering' },
  { id: 'one-piece', label: 'One Piece' },
  { id: 'lorcana', label: 'Disney Lorcana' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!' },
  { id: 'my-little-pony', label: 'My Little Pony' },
  { id: 'riftbound', label: 'Riftbound' },
  { id: 'my-hero-academia', label: 'My Hero Academia' },
  { id: 'marvel', label: 'Marvel' },
  { id: 'disney', label: 'Disney' },
  { id: 'star-wars', label: 'Star Wars' },
  { id: 'other', label: 'Other' },
] as const;

export type GameId = (typeof GAMES)[number]['id'];

const LABELS = new Map<string, string>(GAMES.map((g) => [g.id, g.label]));

export function gameLabel(id: string | null | undefined): string {
  return (id && LABELS.get(id)) || '';
}

// Pokémon sets, product types and Pokémon names seen in the catalog. Products
// are usually named by set ("Pitch Blk Booster Box"), and the names carry
// Clover typos, so several entries cover common misspellings.
const POKEMON = new RegExp(
  [
    'pok[eé]mon', 'poke tins?', 'pikachu', 'chari?zr?a?r?d', '\\betb\\b', 'elite trainer', '\\bex\\b',
    '\\b151\\b', '30th celebrations?', 'scarlet', 'violet', 'sword', 'shield', 'paldea', 'unova',
    'ascended hero', 'chaos (promo|rising)', 'destined rivals', 'prism(a)?tic', 'pitch (black|blk)',
    'perfect order', 'ph?an?tas(a)?mal', 'fantasmal', 'white flare', 'black bolt', 'mega? evolutions?',
    'mega (dream|hero|charizard|kangaskhan|latias|lucario|zygarde|venusaur|battle)', 'temporal forces',
    'paradox ri', 'obsid(i|a)a?n flame', 'twilight ma', 'stellar crown', 'shrou(d|t)ed fable',
    'surging sparks', 'journey together', 'brilliant stars', 'champions path', 'battle (league|academy|partners)',
    'first partner', 'blooming waters', 'gengar', 'greninja', 'lugia', 'snorlax', 'moltres', 'zaci(a|z)n',
    'bellib', 'gardivor', 'knock out', 'tech stickers?', 'miraidon', 'umbr(e|i)on', 'calyrex', 'mewtwo',
  ].join('|'),
  'i'
);

const RULES: [GameId, RegExp][] = [
  // Order matters: MTG crossovers ("MTG Marvel Age") must win over Marvel,
  // and Lorcana over Disney.
  ['magic', /\b(magic|mtg)\b/i],
  ['lorcana', /lorcana/i],
  ['one-piece', /one ?piece|\bop-?\d|\bopc-?\d|\beb-?0|\bebc\b|\bprb-?\d/i],
  ['yugioh', /yu-?gi-?oh/i],
  ['riftbound', /riftbound/i],
  ['my-little-pony', /little pony|pinky pie|friendship eternal/i],
  ['my-hero-academia', /hero academia/i],
  ['pokemon', POKEMON],
  ['marvel', /marvel|spider-?man|black panther|wakanda|infinity/i],
  ['disney', /disney|\bneon\b/i],
  ['star-wars', /star ?wars/i],
];

export function detectGame(name: string): GameId {
  for (const [game, re] of RULES) if (re.test(name)) return game;
  return 'other';
}
