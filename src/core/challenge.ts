import { games, type GameManifest } from '../data/games';

export const TIME_ZONE = 'Europe/Madrid';
export const LAUNCH_DATE = '2026-09-29';
export const SEASON_LENGTH = 21;

export interface DailyChallenge {
  date: string;
  dayOfSeason: number;
  seasonNumber: number;
  game: GameManifest;
  catalogDay: number;
}

function madridDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function dateAtMadridTime(date = new Date()): string {
  return madridDate(date);
}

export function dayOffset(date: string, epoch = LAUNCH_DATE): number {
  const [y, m, d] = date.split('-').map(Number);
  const [ey, em, ed] = epoch.split('-').map(Number);
  const utcDate = Date.UTC(y, m - 1, d);
  const utcEpoch = Date.UTC(ey, em - 1, ed);
  return Math.floor((utcDate - utcEpoch) / 86_400_000);
}

function seededOrder<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const CATALOG_ORDER = seededOrder(games, 0x5a006c79);

export function getDailyChallenge(date = dateAtMadridTime()): DailyChallenge {
  const offset = Math.max(0, dayOffset(date));
  const game = CATALOG_ORDER[offset % CATALOG_ORDER.length];
  return {
    date,
    dayOfSeason: (offset % SEASON_LENGTH) + 1,
    seasonNumber: Math.floor(offset / SEASON_LENGTH) + 1,
    game,
    catalogDay: (offset % CATALOG_ORDER.length) + 1,
  };
}

export interface RankedScore {
  score: number;
  seasonPoints?: number;
}

export function compareScores(a: number, b: number, direction: GameManifest['direction']): number {
  return direction === 'higher' ? b - a : a - b;
}

export function rankScores<T extends RankedScore>(scores: T[], direction: GameManifest['direction']): T[] {
  return [...scores].sort((a, b) => compareScores(a.score, b.score, direction));
}

export function assignSeasonPoints<T extends RankedScore>(scores: T[], direction: GameManifest['direction']): (T & { seasonPoints: number })[] {
  const sorted = rankScores(scores, direction) as (T & { seasonPoints: number })[];
  const count = sorted.length;
  let start = 0;
  while (start < count) {
    let end = start + 1;
    while (end < count && sorted[end].score === sorted[start].score) end += 1;
    const firstPosition = start;
    const lastPosition = end - 1;
    const pointsAt = (position: number) => count <= 1 ? 100 : 100 * (count - 1 - position) / (count - 1);
    const sharedPoints = (pointsAt(firstPosition) + pointsAt(lastPosition)) / 2;
    for (let index = start; index < end; index += 1) sorted[index].seasonPoints = Math.round(sharedPoints * 100) / 100;
    start = end;
  }
  return sorted;
}
