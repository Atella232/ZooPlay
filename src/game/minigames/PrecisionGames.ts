import { createGameChrome, drawPlayfield, animalGlyph, beginAnimalFrame } from '../presentation';
import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };

export function createPrecisionGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'medusa-a-partes-iguales': return new JellyfishCutGame(...args);
    case 'rastro-del-caracol': return new SnailTrailGame(...args);
    case 'colibri-reflejos': return new HummingbirdReflexGame(...args);
    default: return undefined;
  }
}

abstract class PrecisionGame implements DedicatedGame {
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
    const chrome = createGameChrome(this.scene, this.game, instructions);
    this.graphics = chrome.graphics;
    this.scoreText = chrome.scoreText;
    this.timerText = chrome.timerText;
    this.promptText = chrome.promptText;
    this.feedbackText = chrome.feedbackText;
  }

  protected panel(): void { drawPlayfield(this.graphics, this.game); }

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

  protected glyphFrame(): void { beginAnimalFrame(this.scene); this.glyphCursor = 0; this.glyphs.forEach((glyph) => glyph.setVisible(false)); }

  protected glyph(value: string, x: number, y: number, size = 20, color = '#263d34', font = 'DM Sans, sans-serif'): void {
    if (animalGlyph(this.scene, value, x, y, size)) return;
    let glyph = this.glyphs[this.glyphCursor];
    if (!glyph) {
      glyph = this.scene.add.text(-100, -100, '', { fontFamily: font, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5).setDepth(4);
      this.glyphs.push(glyph);
    }
    glyph.setText(value).setPosition(x, y).setStyle({ fontFamily: font, fontSize: `${size}px`, color, align: 'center' }).setVisible(true);
    this.glyphCursor += 1;
  }

  protected metric(value: number, unit = this.game.unit): void {
    this.scoreText.setText(`${this.game.metric}: ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)} ${unit}`.trim());
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

class JellyfishCutGame extends PrecisionGame {
  private parts = [2, 3, 4];
  private round = 0;
  private cut = 0;
  private cutPositions: number[] = [];
  private pointerStart?: Point;
  private pointerEnd?: Point;
  private accuracies: number[] = [];

  create(): void {
    this.chrome('Arrastra una línea vertical para dividir la medusa en mitades, tercios y cuartos.');
    this.draw();
  }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.averageAccuracy() * 100, this.averageAccuracy()); return; }
    this.draw();
  }

  private expectedX(): number { return 105 + 270 * ((this.cut + 1) / this.parts[this.round]); }

  private draw(): void {
    this.panel(); this.glyphFrame();
    this.metric(this.averageAccuracy() * 100, '%');
    const divisions = this.parts[this.round];
    this.promptText.setText(`Ronda ${this.round + 1} de 3 · divide en ${['dos', 'tres', 'cuatro'][this.round]} partes iguales`);
    this.graphics.fillStyle(0xf2d5e1).lineStyle(3, 0xc78ca0).fillEllipse(240, 390, 270, 142).strokeEllipse(240, 390, 270, 142);
    this.graphics.fillStyle(0xe7adc4).fillCircle(240, 390, 27);
    this.graphics.fillStyle(0xf8e5ec).fillCircle(191, 352, 11).fillCircle(289, 352, 11);
    this.cutPositions.forEach((x) => this.graphics.lineStyle(3, 0xffffff, 0.95).lineBetween(x, 329, x, 451));
    if (this.pointerStart && this.pointerEnd) this.graphics.lineStyle(4, 0xe1a545, 0.9).lineBetween(this.pointerStart.x, this.pointerStart.y, this.pointerEnd.x, this.pointerEnd.y);
    this.glyph(`${this.cut} / ${divisions - 1} cortes`, 240, 481, 15, '#718176', 'DM Mono, monospace');
  }

  private averageAccuracy(): number { return this.accuracies.length ? this.accuracies.reduce((sum, item) => sum + item, 0) / this.accuracies.length : 0; }

  pointerDown(x: number, y: number): void {
    if (this.ended || this.round >= this.parts.length || x < 100 || x > 380 || y < 320 || y > 460) return;
    this.pointerStart = { x, y }; this.pointerEnd = { x, y };
  }

  pointerMove(x: number, y: number, isDown: boolean): void { if (isDown && this.pointerStart) this.pointerEnd = { x, y }; }

  pointerUp(x: number, y: number): void {
    if (this.ended || !this.pointerStart) return;
    this.pointerEnd = { x, y };
    const start = this.pointerStart;
    this.pointerStart = undefined; this.pointerEnd = undefined;
    const dx = Math.abs(x - start.x); const dy = Math.abs(y - start.y);
    if (dy < 55 || dx > dy * 0.45 || start.y > 450 || y < 330) { this.feedbackText.setText('Haz un corte vertical que atraviese la medusa.'); return; }
    const actualX = (x + start.x) / 2;
    const cellWidth = 270 / this.parts[this.round];
    const accuracy = Phaser.Math.Clamp(1 - Math.abs(actualX - this.expectedX()) / (cellWidth / 2), 0, 1);
    this.accuracies.push(accuracy); this.cutPositions.push(actualX); this.cut += 1;
    this.feedbackText.setText(accuracy > 0.85 ? '¡Corte muy preciso!' : accuracy > 0.5 ? 'Buen corte, afina un poco más.' : 'El corte quedó lejos del centro.');
    if (this.cut >= this.parts[this.round] - 1) { this.round += 1; this.cut = 0; this.cutPositions = []; }
    if (this.round >= this.parts.length) this.finish(this.averageAccuracy() * 100, this.averageAccuracy());
    else this.draw();
  }
}

class SnailTrailGame extends PrecisionGame {
  private nodes: Point[] = [];
  private phase: 'show' | 'trace' = 'show';
  private phaseMs = 0;
  private trace: Point[] = [];
  private drawing = false;
  private level = 0;
  private lives = 3;
  private attempts = 0;
  private accuracySum = 0;

  create(): void { this.chrome('Observa el camino. Cuando desaparezca, dibuja el recorrido de memoria entre los puntos.'); this.newPath(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.level, this.attempts ? this.accuracySum / this.attempts : 0); return; }
    if (this.phase === 'show') { this.phaseMs += delta; if (this.phaseMs >= Math.max(900, 1800 - this.nodes.length * 70)) this.phase = 'trace'; }
    this.draw();
  }

  private newPath(): void {
    const count = Math.min(10, 5 + Math.floor(this.level / 2));
    this.nodes = Array.from({ length: count }, (_, index) => ({ x: 91 + index * (298 / (count - 1)), y: 304 + this.randomInt(0, 160) }));
    this.phase = 'show'; this.phaseMs = 0; this.trace = []; this.drawing = false;
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.level, 'puntos');
    this.promptText.setText(this.phase === 'show' ? `Memoriza el camino · nivel ${this.level + 1}` : `Dibuja entre los puntos · nivel ${this.level + 1} · ♥ ${this.lives}`);
    const g = this.graphics;
    if (this.phase === 'show') {
      g.lineStyle(5, 0x77a282, 0.85);
      for (let index = 1; index < this.nodes.length; index += 1) g.lineBetween(this.nodes[index - 1].x, this.nodes[index - 1].y, this.nodes[index].x, this.nodes[index].y);
    }
    if (this.trace.length > 1) {
      g.lineStyle(5, 0xe4a83f, 0.95);
      for (let index = 1; index < this.trace.length; index += 1) g.lineBetween(this.trace[index - 1].x, this.trace[index - 1].y, this.trace[index].x, this.trace[index].y);
    }
    this.nodes.forEach((point, index) => {
      g.fillStyle(index === 0 ? 0x69a77a : index === this.nodes.length - 1 ? 0xe2a24a : 0xdde9d9).fillCircle(point.x, point.y, index === 0 || index === this.nodes.length - 1 ? 12 : 8);
    });
    this.glyph(`${this.attempts} intentos · ${this.level} niveles`, 240, 491, 14, '#718176', 'DM Mono, monospace');
  }

  private evaluate(): void {
    const sampled = Array.from({ length: 41 }, (_, index) => {
      const position = (index / 40) * (this.nodes.length - 1);
      const segment = Math.min(this.nodes.length - 2, Math.floor(position));
      const ratio = position - segment;
      const a = this.nodes[segment]; const b = this.nodes[segment + 1];
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    });
    const closePoints = sampled.filter((sample) => this.trace.some((point, index) => {
      if (index === 0) return Math.hypot(point.x - sample.x, point.y - sample.y) < 24;
      const before = this.trace[index - 1];
      const vx = point.x - before.x; const vy = point.y - before.y;
      const lengthSq = vx * vx + vy * vy;
      const ratio = lengthSq ? Phaser.Math.Clamp(((sample.x - before.x) * vx + (sample.y - before.y) * vy) / lengthSq, 0, 1) : 0;
      return Math.hypot(sample.x - (before.x + ratio * vx), sample.y - (before.y + ratio * vy)) < 24;
    })).length;
    const accuracy = closePoints / sampled.length;
    this.attempts += 1; this.accuracySum += accuracy;
    if (accuracy >= 0.72) {
      this.level += 1; this.feedbackText.setText(`¡Camino recordado! ${Math.round(accuracy * 100)} % · siguiente nivel.`); this.newPath();
    } else {
      this.lives -= 1; this.feedbackText.setText(`El recorrido se desvió (${Math.round(accuracy * 100)} %). ♥ ${this.lives}`); this.newPath();
      if (!this.lives) this.finish(this.level, this.accuracySum / this.attempts);
    }
  }

  pointerDown(x: number, y: number): void {
    if (this.ended || this.phase !== 'trace' || Math.hypot(x - this.nodes[0].x, y - this.nodes[0].y) > 35) return;
    this.drawing = true; this.trace = [{ x, y }];
  }

  pointerMove(x: number, y: number, isDown: boolean): void { if (isDown && this.drawing) this.trace.push({ x, y }); }

  pointerUp(x: number, y: number): void {
    if (this.ended || !this.drawing) return;
    this.trace.push({ x, y }); this.drawing = false;
    if (Math.hypot(x - this.nodes[this.nodes.length - 1].x, y - this.nodes[this.nodes.length - 1].y) < 38) this.evaluate();
    else { this.attempts += 1; this.accuracySum += 0; this.lives -= 1; this.feedbackText.setText(`Llega al punto naranja · ♥ ${this.lives}`); this.newPath(); if (!this.lives) this.finish(this.level, this.accuracySum / this.attempts); }
    this.draw();
  }
}

class HummingbirdReflexGame extends PrecisionGame {
  private phase: 'wait' | 'go' = 'wait';
  private target = 0;
  private waitMs = 0;
  private goMs = 0;
  private rounds = 0;
  private responseTotal = 0;
  private correct = 0;
  private errors = 0;
  private penalty = 0;
  private readonly centers = Array.from({ length: 9 }, (_, index) => ({ x: 156 + (index % 3) * 84, y: 316 + Math.floor(index / 3) * 78 }));

  create(): void { this.chrome('Espera a que se ilumine una casilla y tócala. La puntuación es la media de tres reflejos.'); this.waitNext(); this.draw(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.meanTime(), this.correct / Math.max(1, this.rounds)); return; }
    if (this.phase === 'wait') {
      this.waitMs -= delta;
      if (this.waitMs <= 0) { this.phase = 'go'; this.goMs = 0; this.target = this.randomInt(0, 8); }
    } else {
      this.goMs += delta;
      if (this.goMs >= 2400) this.response(false);
    }
    this.draw();
  }

  private waitNext(): void { this.phase = 'wait'; this.waitMs = this.randomInt(650, 1400); this.goMs = 0; }

  private meanTime(): number { return (this.responseTotal + this.penalty) / Math.max(1, this.rounds) / 1000; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.meanTime(), 's');
    this.promptText.setText(this.phase === 'wait' ? `Espera al destello · ronda ${this.rounds + 1} de 3` : '¡Toca la casilla iluminada!');
    this.centers.forEach((point, index) => {
      const lit = this.phase === 'go' && index === this.target;
      this.graphics.fillStyle(lit ? 0x78b681 : 0xe7e4db).lineStyle(2, lit ? 0x428c52 : 0xd5d0c3).fillRoundedRect(point.x - 29, point.y - 27, 58, 54, 12).strokeRoundedRect(point.x - 29, point.y - 27, 58, 54, 12);
      if (lit) this.glyph('✦', point.x, point.y, 25, '#ffffff');
    });
    this.glyph(`${this.correct} aciertos · ${this.errors} fallos`, 240, 490, 14, '#718176', 'DM Mono, monospace');
  }

  private response(hit: boolean): void {
    if (this.phase !== 'go' || this.ended) return;
    this.rounds += 1;
    if (hit) { this.correct += 1; this.responseTotal += this.goMs; this.feedbackText.setText(`¡${Math.round(this.goMs)} ms!`); }
    else { this.errors += 1; this.responseTotal += 2400; this.feedbackText.setText('No era esa casilla o se acabó el tiempo.'); }
    if (this.rounds >= 3) { this.finish(this.meanTime(), this.correct / this.rounds); return; }
    this.waitNext(); this.draw();
  }

  private choose(x: number, y: number): void {
    if (this.ended) return;
    const cell = this.centers.findIndex((point) => Math.abs(point.x - x) <= 30 && Math.abs(point.y - y) <= 28);
    if (cell < 0) return;
    if (this.phase === 'wait') { this.errors += 1; this.penalty += 500; this.feedbackText.setText('Demasiado pronto: +0,5 s de penalización.'); this.waitNext(); }
    else this.response(cell === this.target);
  }

  pointerDown(x: number, y: number): void { this.choose(x, y); }
  keyDown(event: KeyboardEvent): void { if (/^[1-9]$/.test(event.key)) this.choose(this.centers[Number(event.key) - 1].x, this.centers[Number(event.key) - 1].y); }
}
