// One-time (re-runnable) backfill of products.game for TCG products that
// don't have one yet. Never overwrites a value staff have set.
// Run: node scripts/backfill_product_games.mjs [--apply]   (dry run without --apply)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { detectGame } from '../lib/games.ts';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const { data, error } = await supabase.from('products').select('id, name').eq('category_id', 'TCG').is('game', null);
if (error) throw new Error(error.message);

const byGame = new Map();
for (const p of data) {
  const g = detectGame(p.name);
  byGame.set(g, [...(byGame.get(g) ?? []), p.id]);
}
for (const [g, ids] of byGame) {
  console.log(`${g}: ${ids.length}`);
  if (apply) {
    const { error: uErr } = await supabase.from('products').update({ game: g }).in('id', ids).is('game', null);
    if (uErr) throw new Error(`${g}: ${uErr.message}`);
  }
}
console.log(apply ? 'Applied.' : 'Dry run — pass --apply to write.');
