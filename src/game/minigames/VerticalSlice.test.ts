import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { games } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import { createVerticalSliceGame } from './VerticalSlice';
import { DONKEY_LEVELS } from './PolishedClassicGames';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Between: (min: number, max: number) => Math.floor((min + max) / 2),
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      DegToRad: (degrees: number) => degrees * Math.PI / 180,
      RadToDeg: (radians: number) => radians * 180 / Math.PI,
    },
    Display: { Color: { GetColor: () => 0x70a080 } },
  },
}));

function mockScene(): Phaser.Scene {
  let fluent: object;
  fluent = new Proxy({}, { get: () => () => fluent });
  const add = new Proxy({}, { get: () => () => fluent });
  return { add } as unknown as Phaser.Scene;
}

function createController(id: string, onFinish: (result: RunResult) => void = () => undefined) {
  const game = games.find((entry) => entry.id === id);
  if (!game) throw new Error(`Missing game manifest: ${id}`);
  const controller = createVerticalSliceGame(mockScene(), game, onFinish);
  if (!controller) throw new Error(`Missing dedicated controller: ${id}`);
  return controller;
}

const dedicatedIds = [
  'gorrion-aleteador', 'erizo-cruzacalles', 'ojo-de-halcon', 'raton-de-laberinto', 'panal-de-la-abeja', 'pulpo-camuflaje',
  'gallo-puntual', 'marmota-cronometro', 'sepia-reflejos', 'paloma-mensajera', 'grillo-ritmico',
  'puas-de-puercoespin', 'castor-lanzador', 'lobo-lunar', 'nutria-lanzadora',
  'rinoceronte-rompemuros', 'topo-golfista', 'topo-golfista-2', 'suricatas-del-minigolf',
  'ardilla-contadora', 'buho-calculador', 'zorro-de-los-dados', 'cuervo-contacajas',
  'trile-del-mapache', 'chimpance-memorion', 'elefante-memorioso',
  'cotorra-telefonista', 'loro-dictado', 'piton-pi',
  'medusa-a-partes-iguales', 'rastro-del-caracol', 'colibri-reflejos',
  'serpiente-glotona', 'panda-lenador', 'hormiga-zigzag',
  'carrera-de-galgos', 'correcaminos', 'hamster-al-volante',
  'jardin-de-luciernagas', 'ciguena-repartidora', 'gato-pianista',
  'vencejo-veloz', 'cangrejo-interruptor', 'pajaro-carpintero', 'golondrina-cazadora',
  'libelula-espacial', 'abejorro-propulsado', 'rana-saltarina', 'gecko-trepador', 'canguro-trampolin',
  'pinguino-escalador', 'lemur-giratorio', 'guepardo-derrapante', 'liebre-en-la-autopista', 'mantis-cortadora', 'anguila-electrica',
  'gallina-aleteadora', 'murcielago-entre-pinchos', 'arana-tejedora', 'camaleon-columpio',
  'mariposa-pintora', 'oso-encestador', 'flamenco-equilibrista', 'tucan-balancin',
  'pulga-botadora', 'armadillo-en-picado', 'foca-malabarista', 'jirafa-apiladora',
  'escarabajo-pelotero', 'burro-de-carga', 'bingo-de-la-oveja',
];

describe('controladores específicos del catálogo', () => {
  it('tiene un controlador ejecutable para cada uno de los 71 minijuegos', () => {
    expect(dedicatedIds).toHaveLength(71);
    expect(new Set(dedicatedIds).size).toBe(71);
    expect(games).toHaveLength(71);
  });

  it.each(dedicatedIds)('%s crea y actualiza una partida', (id) => {
    const controller = createController(id);
    expect(() => {
      controller.create();
      controller.update(16);
    }).not.toThrow();
  });

  it.each(games.map((game) => [game.id, game.durationSec] as const))('%s devuelve un resultado al terminar el reloj', (id, durationSec) => {
    let result: RunResult | undefined;
    const controller = createController(id, (value) => { result = value; });
    controller.create();
    controller.pointerDown(240, 400);
    controller.update(durationSec * 1000);
    expect(result).toBeDefined();
    expect(Number.isFinite(result?.score)).toBe(true);
    expect(result?.score).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result?.accuracy)).toBe(true);
    expect(result?.accuracy).toBeGreaterThanOrEqual(0);
    expect(result?.accuracy).toBeLessThanOrEqual(1);
  });

  it('el Gallo Puntual completa cinco rondas y devuelve la desviación media', () => {
    let result: RunResult | undefined;
    const controller = createController('gallo-puntual', (value) => { result = value; });
    controller.create();
    controller.update(6200);
    for (let round = 0; round < 5; round += 1) controller.pointerDown(240, 350);
    expect(result?.score).toBeCloseTo(5.76, 1);
  });

  it('el Grillo completa tres rondas al repetir el tempo aprendido', () => {
    let result: RunResult | undefined;
    const controller = createController('grillo-ritmico', (value) => { result = value; });
    controller.create();
    for (let round = 0; round < 3; round += 1) {
      for (let tap = 0; tap < 10; tap += 1) {
        controller.update(720);
        controller.pointerDown(240, 356);
      }
    }
    expect(result).toMatchObject({ score: 100, accuracy: 1 });
  });

  it('el Zorro registra la suma correcta de los cuatro dados durante tres rondas', () => {
    let result: RunResult | undefined;
    const controller = createController('zorro-de-los-dados', (value) => { result = value; });
    controller.create();
    for (let round = 0; round < 3; round += 1) {
      controller.keyDown({ key: '1' } as KeyboardEvent);
      controller.keyDown({ key: '2' } as KeyboardEvent);
      controller.keyDown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
    }
    expect(result).toMatchObject({ score: 0.01, accuracy: 1 });
  });

  it('el Cuervo aumenta el nivel al contar bien y devuelve los niveles superados', () => {
    let result: RunResult | undefined;
    const controller = createController('cuervo-contacajas', (value) => { result = value; });
    controller.create();
    controller.update(1300);
    for (let count = 0; count < 4; count += 1) controller.pointerDown(335, 474);
    controller.pointerDown(240, 474);
    controller.update(60_000);
    expect(result).toMatchObject({ score: 1, accuracy: 1 });
  });

  it('el golfista puede preparar un golpe mientras la bola está en movimiento', () => {
    const controller = createController('topo-golfista');
    controller.create();
    controller.pointerDown(100, 454);
    controller.pointerMove(45, 510, true);
    controller.pointerUp(45, 510);
    expect(() => controller.update(16)).not.toThrow();
  });

  it.each(['trile-del-mapache', 'chimpance-memorion', 'elefante-memorioso', 'cotorra-telefonista', 'loro-dictado', 'piton-pi', 'medusa-a-partes-iguales', 'rastro-del-caracol', 'colibri-reflejos'])(
    '%s termina una partida al agotarse el tiempo', (id) => {
      let result: RunResult | undefined;
      const controller = createController(id, (value) => { result = value; });
      controller.create();
      controller.update(60_000);
      expect(result).toMatchObject({ elapsedMs: 60_000 });
      expect(result?.accuracy).toBeGreaterThanOrEqual(0);
      expect(result?.accuracy).toBeLessThanOrEqual(1);
    },
  );

  it('Pitón Pi acepta cifras en orden y descuenta vidas ante errores', () => {
    let result: RunResult | undefined;
    const controller = createController('piton-pi', (value) => { result = value; });
    controller.create();
    controller.keyDown({ key: '1', preventDefault() {} } as KeyboardEvent);
    controller.keyDown({ key: '4', preventDefault() {} } as KeyboardEvent);
    controller.keyDown({ key: '2', preventDefault() {} } as KeyboardEvent);
    controller.keyDown({ key: '0', preventDefault() {} } as KeyboardEvent);
    controller.keyDown({ key: '0', preventDefault() {} } as KeyboardEvent);
    controller.keyDown({ key: '0', preventDefault() {} } as KeyboardEvent);
    expect(result).toMatchObject({ score: 2, accuracy: 0.4 });
  });

  it('la Medusa mide seis cortes en mitad, tercios y cuartos', () => {
    let result: RunResult | undefined;
    const controller = createController('medusa-a-partes-iguales', (value) => { result = value; });
    controller.create();
    const cuts = [240, 195, 285, 172.5, 240, 307.5];
    for (const x of cuts) {
      controller.pointerDown(x, 330);
      controller.pointerUp(x, 450);
    }
    expect(result).toMatchObject({ score: 100, accuracy: 1 });
  });

  it('la Carrera de Galgos registra dos vueltas al tocar para correr', () => {
    let result: RunResult | undefined;
    const controller = createController('carrera-de-galgos', (value) => { result = value; });
    controller.create();
    for (let frame = 0; frame < 600 && !result; frame += 1) {
      controller.pointerDown(240, 400);
      controller.update(50);
    }
    expect(result?.score).toBeGreaterThan(0);
    expect(result?.score).toBeLessThan(20);
    expect(result?.accuracy).toBe(1);
  });

  it.each(['jardin-de-luciernagas', 'ciguena-repartidora', 'gato-pianista', 'vencejo-veloz', 'cangrejo-interruptor', 'pajaro-carpintero', 'golondrina-cazadora'])(
    '%s termina una partida cronometrada', (id) => {
      let result: RunResult | undefined;
      const controller = createController(id, (value) => { result = value; });
      controller.create();
      controller.update(60_000);
      expect(result).toMatchObject({ elapsedMs: 60_000 });
    },
  );

  it('el Pájaro Carpintero cuenta cada toque al tronco', () => {
    let result: RunResult | undefined;
    const controller = createController('pajaro-carpintero', (value) => { result = value; });
    controller.create();
    controller.pointerDown(240, 380);
    controller.pointerDown(240, 380);
    controller.pointerDown(240, 380);
    controller.update(60_000);
    expect(result).toMatchObject({ score: 3, accuracy: 1 });
  });

  it.each(['libelula-espacial', 'abejorro-propulsado', 'rana-saltarina', 'gecko-trepador', 'canguro-trampolin'])(
    '%s termina una partida cronometrada', (id) => {
      let result: RunResult | undefined;
      const controller = createController(id, (value) => { result = value; });
      controller.create();
      controller.update(60_000);
      expect(result).toMatchObject({ elapsedMs: 60_000 });
    },
  );

  it('la Rana salta ajustando el tiempo de carga', () => {
    let result: RunResult | undefined;
    const controller = createController('rana-saltarina', (value) => { result = value; });
    controller.create();
    controller.pointerDown(132, 440);
    controller.update(920);
    controller.pointerUp(333, 360);
    controller.update(60_000);
    expect(result?.score).toBeGreaterThanOrEqual(9);
    expect(result?.accuracy).toBe(1);
  });

  it.each(['pinguino-escalador', 'lemur-giratorio', 'guepardo-derrapante', 'liebre-en-la-autopista', 'mantis-cortadora', 'anguila-electrica'])(
    '%s termina una partida cronometrada', (id) => {
      let result: RunResult | undefined;
      const controller = createController(id, (value) => { result = value; });
      controller.create();
      controller.update(60_000);
      expect(result).toMatchObject({ elapsedMs: 60_000 });
    },
  );

  it('Pingüino Escalador premia el aterrizaje perfecto', () => {
    let result: RunResult | undefined;
    const controller = createController('pinguino-escalador', (value) => { result = value; });
    controller.create();
    controller.pointerDown(240, 400);
    for (let frame = 0; frame < 50; frame++) controller.update(16);
    controller.update(60_000);
    expect(result).toMatchObject({ score: 10, accuracy: 1 });
  });

  it('Pulga Botadora rebota en la plataforma que dibuja el jugador', () => {
    let result: RunResult | undefined;
    const controller = createController('pulga-botadora', (value) => { result = value; });
    controller.create();
    controller.pointerDown(300, 465);
    controller.pointerMove(380, 465, true);
    controller.pointerUp(380, 465);
    for (let frame = 0; frame < 26; frame += 1) controller.update(50);
    controller.update(60_000);
    expect(result?.score).toBeGreaterThan(0);
    expect(result?.accuracy).toBe(1);
  });

  it.each(['gallina-aleteadora', 'murcielago-entre-pinchos', 'arana-tejedora', 'camaleon-columpio', 'mariposa-pintora', 'oso-encestador', 'flamenco-equilibrista', 'tucan-balancin'])(
    '%s termina una partida cronometrada', (id) => {
      let result: RunResult | undefined;
      const controller = createController(id, (value) => { result = value; });
      controller.create();
      controller.update(60_000);
      expect(result).toMatchObject({ elapsedMs: 60_000 });
    },
  );

  it('el Oso Encestador registra un lanzamiento que cruza el aro', () => {
    let result: RunResult | undefined;
    const controller = createController('oso-encestador', (value) => { result = value; });
    controller.create();
    controller.pointerDown(130, 456);
    controller.pointerMove(50, 346, true);
    controller.pointerUp(50, 346);
    for (let frame = 0; frame < 20; frame += 1) controller.update(50);
    controller.update(60_000);
    expect(result?.score).toBe(1);
    expect(result?.accuracy).toBe(1);
  });
});

describe('jugabilidad de la revisión arcade', () => {
  const key = (value: string) => ({ key: value, code: value === ' ' ? 'Space' : value, preventDefault() {} } as KeyboardEvent);
  const advance = (controller: ReturnType<typeof createController>, ms: number) => {
    for (let remaining = ms; remaining > 0; remaining -= 16) controller.update(Math.min(16, remaining));
  };
  it('Lémur aterriza después de agarrar, balancearse y soltar la liana', () => {
    let result: RunResult | undefined;
    const c = createController('lemur-giratorio', r => { result = r; });
    c.create(); c.pointerDown(240, 400); advance(c, 500); c.pointerUp(240, 400); advance(c, 700); c.update(60_000);
    expect(result).toMatchObject({ score: 1, accuracy: 1 });
  });
  it('Guepardo pierde al ignorar las curvas y puntúa al girar a tiempo', () => {
    let unattended: RunResult | undefined;
    const idle = createController('guepardo-derrapante', r => { unattended = r; });
    idle.create(); advance(idle, 7000);
    expect(unattended).toMatchObject({ score: 0, accuracy: 0 });
    let driven: RunResult | undefined;
    const c = createController('guepardo-derrapante', r => { driven = r; });
    c.create(); advance(c, 1000); c.pointerDown(240, 400); c.update(60_000);
    expect(driven).toMatchObject({ score: 1, accuracy: 1 });
  });
  it('Jirafa deja caer y apila un bloque alineado', () => {
    let result: RunResult | undefined;
    const c = createController('jirafa-apiladora', r => { result = r; });
    c.create(); advance(c, 659); c.pointerDown(240, 400); advance(c, 400); c.update(40_000);
    expect(result).toMatchObject({ score: 1, accuracy: 1 });
  });
  it('Burro permite deshacer un empujón antes de resolver el nivel', () => {
    let result: RunResult | undefined;
    const c = createController('burro-de-carga', r => { result = r; });
    c.create(); c.keyDown(key('ArrowLeft')); c.keyDown(key('u')); c.keyDown(key('ArrowUp')); c.update(60_000);
    expect(result).toMatchObject({ score: 5 });
  });
  it('Panal no acepta respuestas mientras enseña el patrón', () => {
    let result: RunResult | undefined;
    const c = createController('panal-de-la-abeja', r => { result = r; });
    c.create(); for (let i = 0; i < 6; i++) c.keyDown(key('1'));
    advance(c, 2500); for (let i = 0; i < 3; i++) c.keyDown(key('5'));
    c.update(60_000);
    expect(result).toMatchObject({ score: 1, accuracy: 1 });
  });
  it('Panal ilumina la celda que después exige al jugador', () => {
    let color = 0;
    const circles: number[][] = [];
    let fluent: object;
    fluent = new Proxy({}, { get: (_target, prop) => (...args: number[]) => {
      if (prop === 'fillStyle') color = args[0];
      if (prop === 'fillCircle' && color === 0xfff7dc) circles.push(args);
      return fluent;
    } });
    const scene = { add: new Proxy({}, { get: () => () => fluent }) } as unknown as Phaser.Scene;
    const c = createVerticalSliceGame(scene, games.find(g => g.id === 'panal-de-la-abeja')!, () => undefined)!;
    c.create(); c.update(500);
    expect(circles.at(-1)).toEqual([240, 371, 15]);
  });
  it('Castor anima el lanzamiento y detecta el choque al impactar', () => {
    let result: RunResult | undefined;
    const c = createController('castor-lanzador', r => { result = r; });
    c.create(); c.pointerDown(240, 400); advance(c, 160);
    expect(result).toBeUndefined();
    c.pointerDown(240, 400); advance(c, 160); advance(c, 600);
    expect(result).toMatchObject({ score: 1, accuracy: 0 });
  });
});


describe('niveles de Burro de Carga', () => {
  it('los tres tableros tienen solución con empujones legales', () => {
    let result: RunResult | undefined;
    const c = createController('burro-de-carga', r => { result = r; });
    c.create();
    const directions = [[-1, 0, 'ArrowLeft'], [1, 0, 'ArrowRight'], [0, -1, 'ArrowUp'], [0, 1, 'ArrowDown']] as const;
    for (const map of DONKEY_LEVELS) {
      const goals = new Set<number>();
      let player = 0;
      const boxes: number[] = [];
      map.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === 'G') goals.add(y * 7 + x);
        if (ch === 'P') player = y * 7 + x;
        if (ch === 'B') boxes.push(y * 7 + x);
      }));
      const queue = [{ player, boxes, path: [] as string[] }];
      const seen = new Set<string>();
      let solution: string[] | undefined;
      for (let at = 0; at < queue.length; at++) {
        const state = queue[at];
        if (state.boxes.every(b => goals.has(b))) { solution = state.path; break; }
        for (const [dx, dy, key] of directions) {
          const next = state.player + dy * 7 + dx;
          if (map[Math.floor(next / 7)]?.[next % 7] === '#') continue;
          const occupied = state.boxes.includes(next), pushed = next + dy * 7 + dx;
          if (occupied && (map[Math.floor(pushed / 7)]?.[pushed % 7] === '#' || state.boxes.includes(pushed))) continue;
          const moved = state.boxes.map(b => b === next ? pushed : b).sort((a, b) => a - b);
          const id = `${next}:${moved.join(',')}`;
          if (seen.has(id)) continue;
          seen.add(id); queue.push({ player: next, boxes: moved, path: [...state.path, key] });
        }
      }
      expect(solution).toBeDefined();
      for (const key of solution!) c.keyDown({ key, preventDefault() {} } as KeyboardEvent);
      c.update(700);
    }
    c.update(60_000);
    expect(result?.score).toBe(15);
  });
});
