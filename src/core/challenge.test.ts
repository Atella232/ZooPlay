import { describe, expect, it } from 'vitest';
import { assignSeasonPoints, dateAtMadridTime, dayOffset, getDailyChallenge } from './challenge';
import { games } from '../data/games';
import { createGroup, createInitialState, finishPractice, finishRankedAttempt, getRecord, startRankedAttempt } from './storage';

describe('catálogo y calendario', () => {
  it('incluye los 71 juegos en las cinco categorías indicadas', () => {
    expect(games).toHaveLength(71);
    const counts = new Map<string, number>();
    for (const game of games) counts.set(game.category, (counts.get(game.category) ?? 0) + 1);
    expect([...counts.values()]).toEqual([28, 8, 13, 10, 12]);
    expect(new Set(games.map((game) => game.id)).size).toBe(71);
  });

  it('muestra el día correcto de temporada y cambia cada 21 días', () => {
    expect(getDailyChallenge('2026-09-29')).toMatchObject({ dayOfSeason: 1, seasonNumber: 1, catalogDay: 1 });
    expect(getDailyChallenge('2026-10-19')).toMatchObject({ dayOfSeason: 21, seasonNumber: 1 });
    expect(getDailyChallenge('2026-10-20')).toMatchObject({ dayOfSeason: 1, seasonNumber: 2 });
  });

  it('recorre todos los juegos antes de repetir y calcula la fecha de Madrid', () => {
    const ids = Array.from({ length: 71 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 8, 29 + offset)).toISOString().slice(0, 10);
      return getDailyChallenge(date).game.id;
    });
    expect(new Set(ids).size).toBe(71);
    expect(getDailyChallenge('2026-12-09').game.id).toBe(getDailyChallenge('2026-09-29').game.id);
    expect(dayOffset('2026-10-01')).toBe(2);
    expect(dateAtMadridTime(new Date('2026-09-28T22:30:00Z'))).toBe('2026-09-29');
  });
});

describe('marcadores e intentos', () => {
  it('reparte los puntos de posición y comparte el de los empates', () => {
    const points = assignSeasonPoints([
      { playerId: 'a', score: 100 },
      { playerId: 'b', score: 90 },
      { playerId: 'c', score: 90 },
      { playerId: 'd', score: 80 },
    ], 'higher');
    expect(points.map((entry) => entry.seasonPoints)).toEqual([100, 50, 50, 0]);
    const time = assignSeasonPoints([{ playerId: 'a', score: 10 }, { playerId: 'b', score: 12 }], 'lower');
    expect(time.map((entry) => entry.playerId)).toEqual(['a', 'b']);
  });

  it('concede dos intentos base y como máximo un intento extra por dado', () => {
    const challenge = getDailyChallenge('2026-09-29');
    let state = createInitialState();
    state = startRankedAttempt(state, challenge).state;
    state = startRankedAttempt(state, challenge).state;
    state = createGroup(state, 'Otro grupo');
    const third = startRankedAttempt(state, challenge);
    expect(third.result).toMatchObject({ ok: true, extra: true, dice: 0 });
    state = third.state;
    expect(startRankedAttempt(state, challenge).result).toEqual({ ok: false, reason: 'attempts' });
    expect(getRecord(state, challenge).attemptsUsed).toBe(3);
  });

  it('mantiene el entrenamiento fuera de intentos, dados y puntuación diaria', () => {
    const challenge = getDailyChallenge('2026-09-29');
    const before = createInitialState();
    const after = finishPractice(finishPractice(before));
    expect(after.dice).toBe(before.dice);
    expect(getRecord(after, challenge).attemptsUsed).toBe(0);
    expect(getRecord(after, challenge).bestScore).toBeUndefined();
  });

  it('guarda solo la mejor puntuación y da un dado una vez por reto', () => {
    const challenge = getDailyChallenge('2026-09-29');
    let state = createInitialState();
    const game = challenge.game;
    state = startRankedAttempt(state, challenge).state;
    state = finishRankedAttempt(state, challenge, game, { score: 20, elapsedMs: 1000 });
    const diceAfterFirst = state.dice;
    state = startRankedAttempt(state, challenge).state;
    state = finishRankedAttempt(state, challenge, game, { score: game.direction === 'higher' ? 15 : 25, elapsedMs: 2000 });
    expect(getRecord(state, challenge).bestScore).toBe(20);
    expect(state.dice).toBe(diceAfterFirst);
  });

  it('no permite reclamar el dado diario otra vez al crear otro grupo', () => {
    const challenge = getDailyChallenge('2026-09-29');
    const game = challenge.game;
    let state = createInitialState();
    state = startRankedAttempt(state, challenge).state;
    state = finishRankedAttempt(state, challenge, game, { score: 20, elapsedMs: 1000 });
    const diceAfterReward = state.dice;
    state = createGroup(state, 'Otra pandilla');
    state = startRankedAttempt(state, challenge).state;
    state = finishRankedAttempt(state, challenge, game, { score: 25, elapsedMs: 1500 });
    expect(state.dice).toBe(diceAfterReward);
  });
});
