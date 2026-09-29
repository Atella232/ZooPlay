import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { games } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import { createVerticalSliceGame } from './VerticalSlice';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Between: (min: number, max: number) => Math.floor((min + max) / 2),
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      DegToRad: (degrees: number) => degrees * Math.PI / 180,
      RadToDeg: (radians: number) => radians * 180 / Math.PI,
    },
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
  'gallo-puntual', 'marmota-cronometro', 'sepia-reflejos', 'paloma-mensajera', 'grillo-ritmico',
  'puas-de-puercoespin', 'castor-lanzador', 'lobo-lunar', 'nutria-lanzadora',
  'rinoceronte-rompemuros', 'topo-golfista', 'topo-golfista-2', 'suricatas-del-minigolf',
  'ardilla-contadora', 'buho-calculador', 'zorro-de-los-dados', 'cuervo-contacajas',
  'trile-del-mapache', 'chimpance-memorion', 'elefante-memorioso',
  'cotorra-telefonista', 'loro-dictado', 'piton-pi',
  'medusa-a-partes-iguales', 'rastro-del-caracol', 'colibri-reflejos',
  'serpiente-glotona', 'panda-lenador', 'hormiga-zigzag',
  'carrera-de-galgos', 'correcaminos', 'hamster-al-volante',
];

describe('controladores específicos del catálogo', () => {
  it.each(dedicatedIds)('%s crea y actualiza una partida', (id) => {
    const controller = createController(id);
    expect(() => {
      controller.create();
      controller.update(16);
    }).not.toThrow();
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
});
