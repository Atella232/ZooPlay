import { mkdir, writeFile } from 'node:fs/promises';
import { games } from '../src/data/games.ts';

function seededOrder(items, seed) {
  const result = [...items];
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const rotation = seededOrder(games, 0x5a006c79);
const values = rotation.map((game, index) => `  (${quote(game.id)}, ${quote(game.name)}, ${quote(game.category)}, ${quote(game.metric)}, ${quote(game.unit)}, ${quote(game.direction)}, ${quote(game.benchmark)}, ${game.durationSec}, ${quote(game.confidence)}, ${index + 1})`).join(',\n');
const sql = `-- Generated from src/data/games.ts. Do not edit rows by hand.\ninsert into public.game_catalog (id, name, category, metric, unit, direction, benchmark, duration_sec, rule_source, rotation_index) values\n${values}\non conflict (id) do update set\n  name = excluded.name, category = excluded.category, metric = excluded.metric, unit = excluded.unit,\n  direction = excluded.direction, benchmark = excluded.benchmark, duration_sec = excluded.duration_sec,\n  rule_source = excluded.rule_source, rotation_index = excluded.rotation_index;\n`;

await mkdir(new URL('../supabase/', import.meta.url), { recursive: true });
await writeFile(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log(`Wrote ${rotation.length} catalog rows to supabase/seed.sql`);
