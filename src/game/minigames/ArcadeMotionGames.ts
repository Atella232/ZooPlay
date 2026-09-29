import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };

export function createArcadeMotionGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'serpiente-glotona': return new HungrySnakeGame(...args);
    case 'panda-lenador': return new PandaLumberjackGame(...args);
    case 'hormiga-zigzag': return new AntZigzagGame(...args);
    case 'carrera-de-galgos':
    case 'correcaminos':
    case 'hamster-al-volante': return new LapRaceGame(...args);
    default: return undefined;
  }
}

abstract class MotionGame implements DedicatedGame {
  protected graphics!: Phaser.GameObjects.Graphics;
  protected scoreText!: Phaser.GameObjects.Text;
  protected timerText!: Phaser.GameObjects.Text;
  protected promptText!: Phaser.GameObjects.Text;
  protected feedbackText!: Phaser.GameObjects.Text;
  protected elapsedMs = 0;
  protected ended = false;
  private glyphs: Phaser.GameObjects.Text[] = [];
  private glyphCursor = 0;
  private seed: number;

  constructor(protected scene: Phaser.Scene, protected game: GameManifest, protected onFinish: Finish) {
    this.seed = (Date.now() ^ [...game.id].reduce((total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619), 2166136261)) >>> 0;
    if (!this.seed) this.seed = 1;
  }

  protected chrome(instructions: string): void {
    this.scene.add.rectangle(240, 360, 480, 720, 0xf7f4e9);
    this.scene.add.circle(50, 205, 92, 0xf2dfbc, 0.42);
    this.scene.add.circle(440, 490, 120, 0xdce9d9, 0.48);
    this.scene.add.text(28, 26, 'ZOOPLAY  /  PARTIDA', { fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#718176', letterSpacing: 1.4 });
    this.scene.add.text(28, 53, this.game.name, { fontFamily: 'DM Sans, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#213b32', wordWrap: { width: 395 } });
    this.scoreText = this.scene.add.text(28, 105, `${this.game.metric}: 0`, { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#213b32' });
    this.timerText = this.scene.add.text(452, 105, this.timeLabel(this.game.durationSec * 1000), { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#213b32' }).setOrigin(1, 0);
    this.promptText = this.scene.add.text(240, 165, instructions, { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#334f40', align: 'center', wordWrap: { width: 400 }, lineSpacing: 5 }).setOrigin(0.5);
    this.feedbackText = this.scene.add.text(240, 544, '', { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#e26843', align: 'center', wordWrap: { width: 390 } }).setOrigin(0.5);
    this.graphics = this.scene.add.graphics();
    this.scene.add.rectangle(240, 633, 414, 92, 0xf0ede2, 0.86).setStrokeStyle(1, 0xe7e1d2);
  }

  protected panel(): void {
    this.graphics.clear();
    this.graphics.fillStyle(0xfffdf6).lineStyle(2, 0xe7e1d2).fillRoundedRect(48, 232, 384, 288, 22).strokeRoundedRect(48, 232, 384, 288, 22);
  }

  protected tick(delta: number): boolean {
    if (this.ended) return true;
    this.elapsedMs += Math.max(0, delta);
    const remaining = Math.max(0, this.game.durationSec * 1000 - this.elapsedMs);
    this.timerText.setText(this.timeLabel(remaining));
    return remaining <= 0;
  }

  protected randomInt(min: number, max: number): number {
    let value = this.seed;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.seed = value >>> 0;
    return min + (this.seed % (max - min + 1));
  }

  protected glyphFrame(): void { this.glyphCursor = 0; this.glyphs.forEach((glyph) => glyph.setVisible(false)); }

  protected glyph(value: string, x: number, y: number, size = 20, color = '#263d34', font = 'DM Sans, sans-serif'): void {
    let glyph = this.glyphs[this.glyphCursor];
    if (!glyph) {
      glyph = this.scene.add.text(-100, -100, '', { fontFamily: font, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5).setDepth(4);
      this.glyphs.push(glyph);
    }
    glyph.setText(value).setPosition(x, y).setStyle({ fontFamily: font, fontSize: `${size}px`, color, align: 'center' }).setVisible(true);
    this.glyphCursor += 1;
  }

  protected metric(value: number, unit = this.game.unit): void {
    this.scoreText.setText(`${this.game.metric}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)} ${unit}`.trim());
  }

  protected finish(score: number, accuracy: number): void {
    if (this.ended) return;
    this.ended = true;
    this.feedbackText.setText('¡Partida terminada!');
    this.onFinish({ score: Math.max(0, score), elapsedMs: Math.max(1, Math.round(this.elapsedMs)), accuracy: Phaser.Math.Clamp(accuracy, 0, 1) });
  }

  protected timeLabel(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  create(): void {}
  update(_delta: number): void {}
  pointerDown(_x: number, _y: number): void {}
  pointerMove(_x: number, _y: number, _isDown: boolean): void {}
  pointerUp(_x: number, _y: number): void {}
  keyDown(_event: KeyboardEvent): void {}
}

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTION_VECTOR: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

class HungrySnakeGame extends MotionGame {
  private readonly cells = 11;
  private readonly cellSize = 22;
  private readonly origin = { x: 119, y: 258 };
  private snake: Point[] = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
  private food: Point = { x: 8, y: 4 };
  private direction: Direction = 'right';
  private queuedDirection: Direction = 'right';
  private moveMs = 0;
  private score = 0;
  private pointerStart?: Point;

  create(): void { this.chrome('Desliza o usa las flechas para comer las manzanas. Evita las paredes y tu cola.'); this.placeFood(); this.draw(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.score / Math.max(1, this.score + 1)); return; }
    this.moveMs += delta;
    const interval = Math.max(95, 185 - this.score * 3);
    while (this.moveMs >= interval && !this.ended) { this.moveMs -= interval; this.step(); }
    this.draw();
  }

  private placeFood(): void {
    const empty: Point[] = [];
    for (let y = 0; y < this.cells; y += 1) for (let x = 0; x < this.cells; x += 1) {
      if (!this.snake.some((part) => part.x === x && part.y === y)) empty.push({ x, y });
    }
    if (!empty.length) { this.finish(this.score, 1); return; }
    this.food = empty[this.randomInt(0, empty.length - 1)];
  }

  private step(): void {
    this.direction = this.queuedDirection;
    const vector = DIRECTION_VECTOR[this.direction];
    const head = { x: this.snake[0].x + vector.x, y: this.snake[0].y + vector.y };
    const eating = head.x === this.food.x && head.y === this.food.y;
    const body = eating ? this.snake : this.snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= this.cells || head.y >= this.cells || body.some((part) => part.x === head.x && part.y === head.y)) {
      this.finish(this.score, this.score / Math.max(1, this.score + 1));
      return;
    }
    this.snake.unshift(head);
    if (eating) { this.score += 1; this.placeFood(); this.feedbackText.setText('¡Ñam! La serpiente crece.'); }
    else this.snake.pop();
  }

  private setDirection(direction: Direction): void {
    const old = DIRECTION_VECTOR[this.direction]; const next = DIRECTION_VECTOR[direction];
    if (old.x + next.x !== 0 || old.y + next.y !== 0) this.queuedDirection = direction;
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Longitud ${this.snake.length} · desliza para girar`);
    const g = this.graphics;
    g.fillStyle(0xe8eee2).lineStyle(1, 0xd7dfd0).fillRoundedRect(this.origin.x - 7, this.origin.y - 7, this.cells * this.cellSize + 14, this.cells * this.cellSize + 14, 9).strokeRoundedRect(this.origin.x - 7, this.origin.y - 7, this.cells * this.cellSize + 14, this.cells * this.cellSize + 14, 9);
    for (let index = 0; index < this.cells; index += 1) {
      g.lineStyle(1, 0xd7dfd0).lineBetween(this.origin.x + index * this.cellSize, this.origin.y, this.origin.x + index * this.cellSize, this.origin.y + this.cells * this.cellSize);
      g.lineBetween(this.origin.x, this.origin.y + index * this.cellSize, this.origin.x + this.cells * this.cellSize, this.origin.y + index * this.cellSize);
    }
    g.fillStyle(0xe76c4b).fillCircle(this.origin.x + (this.food.x + 0.5) * this.cellSize, this.origin.y + (this.food.y + 0.5) * this.cellSize, 8);
    this.snake.forEach((part, index) => g.fillStyle(index === 0 ? 0x315943 : 0x71a17c).fillRoundedRect(this.origin.x + part.x * this.cellSize + 2, this.origin.y + part.y * this.cellSize + 2, this.cellSize - 4, this.cellSize - 4, 6));
    this.glyph(`← ↑ ↓ →`, 240, 514, 13, '#718176', 'DM Mono, monospace');
  }

  pointerDown(x: number, y: number): void { this.pointerStart = { x, y }; }
  pointerUp(x: number, y: number): void {
    if (!this.pointerStart) return;
    const dx = x - this.pointerStart.x; const dy = y - this.pointerStart.y; this.pointerStart = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) this.setDirection(dx > 0 ? 'right' : 'left');
    else this.setDirection(dy > 0 ? 'down' : 'up');
  }
  keyDown(event: KeyboardEvent): void {
    const directions: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const direction = directions[event.key];
    if (direction) { event.preventDefault(); this.setDirection(direction); }
  }
}

class PandaLumberjackGame extends MotionGame {
  private branches: number[] = [];
  private score = 0;
  private lives = 3;
  private lastSide: -1 | 1 = -1;

  create(): void {
    this.chrome('Toca el lado izquierdo o derecho para cortar. Esquiva las ramas antes de que se acabe el tiempo.');
    this.branches = Array.from({ length: 7 }, () => this.randomInt(-1, 1));
    this.draw();
  }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.score / Math.max(1, this.score + 3 - this.lives)); return; }
    this.draw();
  }

  private chop(side: -1 | 1): void {
    if (this.ended) return;
    this.lastSide = side;
      if (this.branches[0] === side) {
      this.lives -= 1; this.feedbackText.setText(`¡Rama! ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.score / Math.max(1, this.score + 3)); return; }
      this.branches.shift(); this.branches.push(this.randomInt(-1, 1));
      return;
    }
    this.score += 1;
    this.branches.shift(); this.branches.push(this.randomInt(-1, 1));
    this.feedbackText.setText('¡Tac! +1 punto');
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Corta al lado contrario de la rama · ♥ ${this.lives}`);
    const g = this.graphics;
    g.fillStyle(0x9d6d42).fillRoundedRect(215, 260, 50, 245, 15);
    this.branches.forEach((branch, index) => {
      const y = 276 + index * 33;
      if (branch < 0) g.fillStyle(0x709565).fillRoundedRect(154, y, 67, 14, 8);
      if (branch > 0) g.fillStyle(0x709565).fillRoundedRect(259, y, 67, 14, 8);
    });
    this.glyph(this.lastSide < 0 ? '🐼  🪓' : '🪓  🐼', 240, 475, 24);
    g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(93, 585, 133, 61, 15).strokeRoundedRect(93, 585, 133, 61, 15);
    g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(254, 585, 133, 61, 15).strokeRoundedRect(254, 585, 133, 61, 15);
    this.glyph('◀ CORTAR', 159, 616, 15, '#30483b', 'DM Mono, monospace');
    this.glyph('CORTAR ▶', 321, 616, 15, '#30483b', 'DM Mono, monospace');
  }

  pointerDown(x: number, y: number): void { if (y >= 560) this.chop(x < 240 ? -1 : 1); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'a') { event.preventDefault(); this.chop(-1); }
    else if (event.key === 'ArrowRight' || event.key === 'd') { event.preventDefault(); this.chop(1); }
  }
}

class AntZigzagGame extends MotionGame {
  private direction: -1 | 1 = 1;
  private remainingMs = 1000;
  private interval = 1000;
  private score = 0;
  private lives = 3;
  private hits = 0;
  private turns = 0;

  create(): void { this.chrome('Sigue la curva del camino: toca el lado que indica la flecha antes de salirte.'); this.direction = this.randomInt(0, 1) ? 1 : -1; this.draw(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.turns)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) {
      this.turns += 1; this.lives -= 1; this.feedbackText.setText(`¡Te saliste! ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.hits / Math.max(1, this.turns)); return; }
      this.nextTurn();
    }
    this.draw();
  }

  private nextTurn(): void {
    this.direction = this.randomInt(0, 1) ? 1 : -1;
    this.interval = Math.max(360, 1000 - this.score * 5);
    this.remainingMs = this.interval;
  }

  private turn(direction: -1 | 1): void {
    if (this.ended) return;
    this.turns += 1;
    if (direction === this.direction) {
      this.score += 1; this.hits += 1; this.feedbackText.setText('¡A tiempo! +1'); this.nextTurn();
    } else {
      this.lives -= 1; this.feedbackText.setText(`La curva iba al otro lado · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.hits / Math.max(1, this.turns)); return; }
      this.remainingMs = Math.max(330, this.interval * 0.58);
    }
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Gira ${this.direction < 0 ? 'a la izquierda' : 'a la derecha'} · ♥ ${this.lives}`);
    const g = this.graphics;
    g.lineStyle(28, 0xd9e9d6).lineBetween(112, 293, 368, 459);
    g.lineStyle(4, 0x70a080).lineBetween(112, 293, 368, 459);
    g.fillStyle(0x354c3d).fillCircle(this.direction < 0 ? 185 : 295, 360, 17);
    this.glyph(this.direction < 0 ? '↖' : '↗', 240, 431, 46, '#30483b');
    g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(83, 584, 135, 62, 15).strokeRoundedRect(83, 584, 135, 62, 15);
    g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(262, 584, 135, 62, 15).strokeRoundedRect(262, 584, 135, 62, 15);
    this.glyph('↖ IZQUIERDA', 150, 615, 14, '#30483b', 'DM Mono, monospace');
    this.glyph('DERECHA ↗', 329, 615, 14, '#30483b', 'DM Mono, monospace');
    g.fillStyle(0xe7e0d2).fillRoundedRect(98, 475, 284, 12, 6);
    g.fillStyle(0xe2aa45).fillRoundedRect(98, 475, 284 * Phaser.Math.Clamp(this.remainingMs / this.interval, 0, 1), 12, 6);
  }

  pointerDown(x: number, y: number): void { if (y >= 550) this.turn(x < 240 ? -1 : 1); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'a') { event.preventDefault(); this.turn(-1); }
    else if (event.key === 'ArrowRight' || event.key === 'd') { event.preventDefault(); this.turn(1); }
  }
}

class LapRaceGame extends MotionGame {
  private readonly targetLaps: number;
  private readonly lapSeconds: number;
  private progress = 0;
  private completedTurns = 0;
  private boostMs = 0;
  private throttle = 1;
  private correctTurns = 0;
  private missedTurns = 0;
  private currentTurnResolved = false;

  constructor(scene: Phaser.Scene, game: GameManifest, onFinish: Finish) {
    super(scene, game, onFinish);
    this.targetLaps = game.id === 'hamster-al-volante' ? 3 : 2;
    this.lapSeconds = game.id === 'carrera-de-galgos' ? 9.6 : game.id === 'correcaminos' ? 5.45 : 5.15;
  }

  create(): void {
    const instructions = this.game.id === 'carrera-de-galgos'
      ? 'Completa dos vueltas. Toca repetidamente para que el galgo corra más rápido.'
      : this.game.id === 'correcaminos'
        ? 'Corre dos vueltas. Sigue las curvas tocando izquierda o derecha.'
        : 'Completa tres vueltas: acelera en rectas y frena en curvas para no derrapar.';
    this.chrome(instructions); this.draw();
  }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.elapsedMs / 1000, this.raceAccuracy()); return; }
    const dt = delta / 1000;
    this.boostMs = Math.max(0, this.boostMs - delta);
    this.progress += dt / this.lapSeconds * this.speedFactor();
    while (this.completedTurns < this.targetLaps * 4 && this.progress >= this.turnPosition(this.completedTurns)) {
      if (this.game.id === 'correcaminos' && !this.currentTurnResolved) this.missedTurns += 1;
      this.completedTurns += 1; this.currentTurnResolved = false;
    }
    if (this.progress >= this.targetLaps) { this.finish(this.elapsedMs / 1000, this.raceAccuracy()); return; }
    this.draw();
  }

  private turnThreshold(turnIndex: number): number { return [0.14, 0.38, 0.62, 0.86][turnIndex % 4]; }
  private turnPosition(turnIndex: number): number { return Math.floor(turnIndex / 4) + this.turnThreshold(turnIndex); }

  private raceAccuracy(): number {
    return this.game.id === 'correcaminos'
      ? this.correctTurns / Math.max(1, this.correctTurns + this.missedTurns)
      : this.completedTurns / Math.max(1, this.targetLaps * 4);
  }

  private speedFactor(): number {
    if (this.game.id === 'carrera-de-galgos') return 0.82 + (this.boostMs > 0 ? 0.62 : 0);
    if (this.game.id === 'correcaminos') return 0.92 + (this.currentTurnResolved ? 0.28 : 0);
    const lapPosition = this.progress % 1;
    const inCurve = [0.14, 0.38, 0.62, 0.86].some((turn) => Math.abs(turn - lapPosition) < 0.05);
    return inCurve && this.throttle > 1.18 ? 0.55 : this.throttle;
  }

  private steer(direction: -1 | 1): void {
    if (this.ended || this.game.id !== 'correcaminos') return;
    if (this.currentTurnResolved) return;
    const distanceToCurve = this.turnPosition(this.completedTurns) - this.progress;
    if (distanceToCurve > 0.12 || distanceToCurve < -0.03) {
      this.feedbackText.setText('Espera a llegar a la curva.');
      return;
    }
    const wanted: -1 | 1 = [0, 3].includes(this.completedTurns % 4) ? -1 : 1;
    if (direction === wanted) { this.correctTurns += 1; this.currentTurnResolved = true; this.boostMs = 650; this.feedbackText.setText('¡Buena trazada!'); }
    else { this.missedTurns += 1; this.currentTurnResolved = false; this.feedbackText.setText('Curva al lado contrario: pierdes velocidad.'); }
    this.draw();
  }

  private raceAction(x: number, y: number): void {
    if (this.game.id === 'carrera-de-galgos') this.boostMs = 500;
    else if (this.game.id === 'correcaminos') this.steer(x < 240 ? -1 : 1);
    else if (y >= 550) this.throttle = Phaser.Math.Clamp(this.throttle + (x < 240 ? -0.18 : 0.18), 0.65, 1.4);
  }

  private draw(): void {
    this.panel(); this.glyphFrame();
    const laps = Math.floor(this.progress);
    const onTrack = this.progress % 1;
    if (this.game.id === 'carrera-de-galgos') this.promptText.setText('¡Toca para correr! Mantén el ritmo hasta completar dos vueltas.');
    else if (this.game.id === 'correcaminos') this.promptText.setText(`Próxima curva: ${[0, 3].includes(this.completedTurns % 4) ? '←' : '→'} · vuelta ${Math.min(laps + 1, 2)} de 2`);
    else this.promptText.setText(`Acelera en rectas, frena en curvas · vuelta ${Math.min(laps + 1, 3)} de 3`);
    this.metric(laps, 'vueltas');
    const g = this.graphics;
    g.fillStyle(0x79a17c).fillEllipse(240, 386, 344, 202);
    g.fillStyle(0x56645b).fillEllipse(240, 386, 286, 146);
    g.fillStyle(0x79a17c).fillEllipse(240, 386, 204, 64);
    g.lineStyle(2, 0xf7eccd, 0.9).strokeEllipse(240, 386, 318, 176);
    g.lineStyle(2, 0xf7eccd, 0.8).lineBetween(226, 296, 254, 296);
    const angle = onTrack * Math.PI * 2 - Math.PI / 2;
    const carX = 240 + Math.cos(angle) * 136; const carY = 386 + Math.sin(angle) * 83;
    g.fillStyle(this.game.id === 'hamster-al-volante' ? 0xd99442 : this.game.id === 'correcaminos' ? 0x5d9bc0 : 0xe97651).fillRoundedRect(carX - 11, carY - 8, 22, 16, 5);
    this.glyph(this.game.id === 'carrera-de-galgos' ? '🐕' : this.game.id === 'correcaminos' ? '🐦' : '🐹', carX, carY - 1, 13);
    this.glyph(`${Math.round(onTrack * 100)} % de la vuelta`, 240, 473, 14, '#f9f4e8', 'DM Mono, monospace');
    if (this.game.id === 'hamster-al-volante') {
      g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(88, 579, 136, 61, 14).strokeRoundedRect(88, 579, 136, 61, 14);
      g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(256, 579, 136, 61, 14).strokeRoundedRect(256, 579, 136, 61, 14);
      this.glyph('− FRENAR', 156, 610, 15, '#30483b', 'DM Mono, monospace');
      this.glyph('+ ACELERAR', 324, 610, 15, '#30483b', 'DM Mono, monospace');
      this.glyph(`Potencia ${Math.round(this.throttle * 100)} %`, 240, 652, 13, '#718176', 'DM Mono, monospace');
    }
  }

  pointerDown(x: number, y: number): void { this.raceAction(x, y); }
  keyDown(event: KeyboardEvent): void {
    if (this.game.id === 'carrera-de-galgos' && (event.code === 'Space' || event.key === 'Enter')) { event.preventDefault(); this.boostMs = 500; }
    else if (this.game.id === 'correcaminos' && event.key === 'ArrowLeft') this.steer(-1);
    else if (this.game.id === 'correcaminos' && event.key === 'ArrowRight') this.steer(1);
    else if (this.game.id === 'hamster-al-volante' && event.key === 'ArrowUp') this.throttle = Phaser.Math.Clamp(this.throttle + 0.14, 0.65, 1.4);
    else if (this.game.id === 'hamster-al-volante' && event.key === 'ArrowDown') this.throttle = Phaser.Math.Clamp(this.throttle - 0.14, 0.65, 1.4);
    this.draw();
  }
}
