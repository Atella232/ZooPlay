import type { GameManifest } from '../data/games';
import { assignSeasonPoints, getDailyChallenge, type DailyChallenge } from './challenge';

const STORAGE_KEY = 'zooplay-state-v1';
const MAX_DICE = 3;

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface DailyRecord {
  groupId: string;
  date: string;
  gameId: string;
  attemptsUsed: number;
  extraUsed: boolean;
  bestScore?: number;
  bestElapsedMs?: number;
  seasonPoints: number;
  rewardGranted: boolean;
}

export interface LocalState {
  nickname: string;
  dice: number;
  groups: Group[];
  activeGroupId: string;
  records: DailyRecord[];
  seasonTotals: Record<string, number>;
  rewardedChallenges: string[];
  challengeAttempts: Record<string, { attemptsUsed: number; extraUsed: boolean }>;
  runsPlayed: number;
}

function makeCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function createInitialState(): LocalState {
  const group: Group = { id: 'group-home', name: 'La Pandilla Zoo', inviteCode: makeCode(), createdAt: new Date().toISOString() };
  return { nickname: 'Explorador', dice: 1, groups: [group], activeGroupId: group.id, records: [], seasonTotals: {}, rewardedChallenges: [], challengeAttempts: {}, runsPlayed: 0 };
}

export function loadState(): LocalState {
  if (typeof localStorage === 'undefined') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as LocalState;
    if (!parsed.groups?.length || !parsed.activeGroupId) return createInitialState();
    const rewardedChallenges = [...new Set([
      ...(parsed.rewardedChallenges ?? []),
      ...(parsed.records ?? []).filter((record) => record.rewardGranted).map((record) => `${record.date}:${record.gameId}`),
    ])];
    const challengeAttempts = { ...(parsed.challengeAttempts ?? {}) };
    for (const record of parsed.records ?? []) {
      const key = `${record.date}:${record.gameId}`;
      const existing = challengeAttempts[key];
      challengeAttempts[key] = {
        attemptsUsed: Math.max(existing?.attemptsUsed ?? 0, record.attemptsUsed ?? 0),
        extraUsed: Boolean(existing?.extraUsed || record.extraUsed),
      };
    }
    return { ...createInitialState(), ...parsed, seasonTotals: parsed.seasonTotals ?? {}, rewardedChallenges, challengeAttempts, dice: Math.max(0, Math.min(MAX_DICE, parsed.dice ?? 0)) };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: LocalState): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateNickname(state: LocalState, nickname: string): LocalState {
  const clean = nickname.trim().slice(0, 24);
  return clean ? { ...state, nickname: clean } : state;
}

export function createGroup(state: LocalState, name: string): LocalState {
  const clean = name.trim().slice(0, 32);
  if (!clean) return state;
  const group: Group = { id: crypto.randomUUID(), name: clean, inviteCode: makeCode(), createdAt: new Date().toISOString() };
  return { ...state, groups: [...state.groups, group], activeGroupId: group.id };
}

export function joinDemoGroup(state: LocalState, inviteCode: string): LocalState {
  const clean = inviteCode.trim().toUpperCase();
  if (!clean || state.groups.some((group) => group.inviteCode === clean)) return state;
  const group: Group = { id: crypto.randomUUID(), name: `Grupo ${clean}`, inviteCode: clean, createdAt: new Date().toISOString() };
  return { ...state, groups: [...state.groups, group], activeGroupId: group.id };
}

export function activeGroup(state: LocalState): Group {
  return state.groups.find((group) => group.id === state.activeGroupId) ?? state.groups[0];
}

export function getRecord(state: LocalState, challenge: DailyChallenge, groupId = state.activeGroupId): DailyRecord {
  const stored = state.records.find((record) => record.groupId === groupId && record.date === challenge.date && record.gameId === challenge.game.id);
  const usage = state.challengeAttempts[`${challenge.date}:${challenge.game.id}`];
  return {
    ...(stored ?? { groupId, date: challenge.date, gameId: challenge.game.id, attemptsUsed: 0, extraUsed: false, seasonPoints: 0, rewardGranted: false }),
    attemptsUsed: usage?.attemptsUsed ?? stored?.attemptsUsed ?? 0,
    extraUsed: usage?.extraUsed ?? stored?.extraUsed ?? false,
  };
}

export interface AttemptResult {
  score: number;
  elapsedMs: number;
}

export type StartAttemptResult = { ok: true; record: DailyRecord; extra: boolean; dice: number } | { ok: false; reason: 'attempts' | 'dice' };

function putRecord(state: LocalState, record: DailyRecord): LocalState {
  const records = state.records.filter((item) => !(item.groupId === record.groupId && item.date === record.date && item.gameId === record.gameId));
  records.push(record);
  return { ...state, records };
}

export function startRankedAttempt(state: LocalState, challenge: DailyChallenge): { state: LocalState; result: StartAttemptResult } {
  const record = getRecord(state, challenge);
  const key = `${challenge.date}:${challenge.game.id}`;
  const usage = state.challengeAttempts[key] ?? { attemptsUsed: record.attemptsUsed, extraUsed: record.extraUsed };
  if (usage.attemptsUsed >= 2) {
    if (usage.extraUsed) return { state, result: { ok: false, reason: 'attempts' } };
    if (state.dice < 1) return { state, result: { ok: false, reason: 'dice' } };
    const updated = { ...record, attemptsUsed: usage.attemptsUsed + 1, extraUsed: true };
    const next = putRecord({ ...state, dice: state.dice - 1, challengeAttempts: { ...state.challengeAttempts, [key]: { attemptsUsed: updated.attemptsUsed, extraUsed: true } } }, updated);
    return { state: next, result: { ok: true, record: updated, extra: true, dice: next.dice } };
  }
  const updated = { ...record, attemptsUsed: usage.attemptsUsed + 1 };
  const next = putRecord({ ...state, challengeAttempts: { ...state.challengeAttempts, [key]: { attemptsUsed: updated.attemptsUsed, extraUsed: usage.extraUsed } } }, updated);
  return { state: next, result: { ok: true, record: updated, extra: false, dice: next.dice } };
}

export function finishRankedAttempt(state: LocalState, challenge: DailyChallenge, game: GameManifest, result: AttemptResult): LocalState {
  const current = getRecord(state, challenge);
  const isBetter = current.bestScore === undefined || (game.direction === 'higher' ? result.score > current.bestScore : result.score < current.bestScore);
  const updated: DailyRecord = {
    ...current,
    bestScore: isBetter ? result.score : current.bestScore,
    bestElapsedMs: isBetter ? result.elapsedMs : current.bestElapsedMs,
  };
  const staged = putRecord({ ...state, runsPlayed: state.runsPlayed + 1 }, updated);
  const ranked = assignSeasonPoints(
    getDemoBoard(staged, challenge).map((player) => ({ playerId: player.id, score: player.score })),
    game.direction,
  );
  const dayPoints = ranked.find((player) => player.playerId === 'local-player')?.seasonPoints ?? 0;
  const settledRecord = { ...updated, seasonPoints: dayPoints };
  const seasonKey = `${state.activeGroupId}:${challenge.seasonNumber}`;
  const seasonTotals = {
    ...staged.seasonTotals,
    [seasonKey]: Math.max(0, (staged.seasonTotals[seasonKey] ?? 0) + dayPoints - current.seasonPoints),
  };
  const next = putRecord({ ...staged, seasonTotals }, settledRecord);
  return grantDailyDie(next, settledRecord);
}

export function finishPractice(state: LocalState): LocalState {
  return { ...state, runsPlayed: state.runsPlayed + 1 };
}

function grantDailyDie(state: LocalState, record: DailyRecord): LocalState {
  const challengeKey = `${record.date}:${record.gameId}`;
  if (state.rewardedChallenges.includes(challengeKey)) {
    return record.rewardGranted ? state : putRecord(state, { ...record, rewardGranted: true });
  }
  const updated = { ...record, rewardGranted: true };
  return putRecord({
    ...state,
    dice: Math.min(MAX_DICE, state.dice + 1),
    rewardedChallenges: [...state.rewardedChallenges, challengeKey],
  }, updated);
}

export interface DemoPlayerScore {
  id: string;
  name: string;
  emoji: string;
  score: number;
  local?: boolean;
  seasonPoints: number;
}

const DEMO_PLAYERS = [
  { id: 'sample-luna', name: 'Luna', emoji: '🦊' },
  { id: 'sample-nico', name: 'Nico', emoji: '🐸' },
  { id: 'sample-ines', name: 'Inés', emoji: '🦋' },
];

function hash(text: string): number {
  return [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
}

export function getDemoBoard(state: LocalState, challenge = getDailyChallenge()): DemoPlayerScore[] {
  const record = getRecord(state, challenge);
  const mockScores: DemoPlayerScore[] = DEMO_PLAYERS.map((player, index) => {
    const max = gameScoreCeiling(challenge.game);
    const seed = hash(`${challenge.date}:${challenge.game.id}:${player.id}`);
    const fraction = 0.28 + ((seed % 6600) / 10000) + index * 0.018;
    const parsedBenchmark = parseBenchmark(challenge.game.benchmark);
    const benchmark = parsedBenchmark > 0 ? parsedBenchmark : Math.max(0.1, challenge.game.durationSec / 100);
    const score = challenge.game.direction === 'higher'
      ? Math.round(max * fraction * 100) / 100
      : Math.round(benchmark * (1.1 + ((seed % 7000) / 10000)) * 1000) / 1000;
    return { ...player, score, seasonPoints: 240 + (hash(`${player.id}:${challenge.seasonNumber}`) % 1700) / 100 };
  });
  const board: DemoPlayerScore[] = [...mockScores];
  if (record.bestScore !== undefined) board.push({ id: 'local-player', name: state.nickname, emoji: '🐼', score: record.bestScore, seasonPoints: record.seasonPoints, local: true });
  return board;
}

export function seasonStandings(state: LocalState, challenge = getDailyChallenge()): DemoPlayerScore[] {
  const board = getDemoBoard(state, challenge);
  const key = `${state.activeGroupId}:${challenge.seasonNumber}`;
  const local = board.find((player) => player.id === 'local-player');
  if (local) local.seasonPoints = state.seasonTotals[key] ?? 0;
  else board.push({ id: 'local-player', name: state.nickname, emoji: '🐼', score: 0, seasonPoints: state.seasonTotals[key] ?? 0, local: true });
  return board.sort((a, b) => b.seasonPoints - a.seasonPoints);
}

function gameScoreCeiling(game: GameManifest): number {
  const numeric = parseBenchmark(game.benchmark);
  if (!Number.isFinite(numeric) || numeric <= 0) return 100;
  return game.metric.includes('Precisión') || game.unit === '%' ? 100 : Math.max(numeric * 1.5, numeric + 10);
}

function parseBenchmark(value: string): number {
  const token = value.match(/[\d.,]+/)?.[0];
  if (!token) return 0;
  const normalized = token.includes(',')
    ? token.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}\.\d{3}$/.test(token) && !token.startsWith('0.')
      ? token.replace('.', '')
      : token;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

export function displayScore(score: number, game: GameManifest): string {
  const decimals = game.unit === 's' && score < 1 ? 3 : game.unit === 's' || game.unit === 'm' && !Number.isInteger(score) ? 2 : Number.isInteger(score) ? 0 : 1;
  const text = new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimals }).format(score);
  return `${text} ${game.unit}`.trim();
}
