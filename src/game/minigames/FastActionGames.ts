import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };

export function createFastActionGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'jardin-de-luciernagas': return new FireflyGardenGame(...args);
    case 'ciguena-repartidora': return new StorkParcelGame(...args);
    case 'gato-pianista': return new CatPianoGame(...args);
    case 'vencejo-veloz': return new SwiftDirectionGame(...args);
    case 'cangrejo-interruptor': return new CrabSwitchGame(...args);
    case 'pajaro-carpintero': return new WoodpeckerGame(...args);
    case 'golondrina-cazadora': return new SwallowHuntGame(...args);
    default: return undefined;
  }
}

abstract class FastActionGame implements DedicatedGame {
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

const COLORS = [0xe76f51, 0xe9b749, 0x71a17b, 0x6f95bb];
const COLOR_NAMES = ['roja', 'amarilla', 'verde', 'azul'];

class FireflyGardenGame extends FastActionGame {
  private beam = 0;
  private targetColor = 0;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;
  private readonly flowers: Point[] = [{ x: 128, y: 315 }, { x: 352, y: 315 }, { x: 128, y: 462 }, { x: 352, y: 462 }];

  create(): void { this.chrome('Gira el haz hacia la flor del mismo color que la luciérnaga y toca el centro para guiarla.'); this.nextFirefly(); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; } this.draw(); }
  private nextFirefly(): void { this.targetColor = this.randomInt(0, 3); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Lleva la luciérnaga ${COLOR_NAMES[this.targetColor]} a su flor · ♥ ${this.lives}`);
    this.flowers.forEach((flower, index) => {
      this.graphics.fillStyle(COLORS[index]).fillCircle(flower.x, flower.y, 25);
      this.glyph('✿', flower.x, flower.y, 30, '#fff9e8');
    });
    const flower = this.flowers[this.beam];
    this.graphics.lineStyle(7, COLORS[this.beam], 0.58).lineBetween(240, 385, flower.x, flower.y);
    this.graphics.fillStyle(COLORS[this.targetColor]).fillCircle(240, 385, 15);
    this.glyph('✦', 240, 385, 20, '#fffdf6');
    this.glyph('◀ GIRAR', 134, 501, 14, '#718176', 'DM Mono, monospace');
    this.glyph('GUIAR ▶', 346, 501, 14, '#718176', 'DM Mono, monospace');
  }

  private rotate(direction: -1 | 1): void { this.beam = (this.beam + direction + 4) % 4; this.draw(); }
  private deliver(): void {
    this.attempts += 1;
    if (this.beam === this.targetColor) { this.correct += 1; this.score += 1; this.feedbackText.setText('¡Ha encontrado su flor! +1'); }
    else { this.lives -= 1; this.feedbackText.setText(`Flor equivocada · ♥ ${this.lives}`); }
    if (!this.lives) { this.finish(this.score, this.correct / this.attempts); return; }
    this.nextFirefly(); this.draw();
  }

  pointerDown(x: number, y: number): void { if (y < 350) return; if (x < 190) this.rotate(-1); else if (x > 290) this.rotate(1); else this.deliver(); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.rotate(-1);
    else if (event.key === 'ArrowRight') this.rotate(1);
    else if (event.code === 'Space' || event.key === 'Enter') this.deliver();
  }
}

class StorkParcelGame extends FastActionGame {
  private color = 0;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;
  private readonly bins = [{ x: 133, key: '←' }, { x: 240, key: '↑' }, { x: 347, key: '→' }];

  create(): void { this.chrome('Manda cada paquete al contenedor de su color: izquierda, arriba o derecha.'); this.nextParcel(); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; } this.draw(); }
  private nextParcel(): void { this.color = this.randomInt(0, 2); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Paquete ${['rojo', 'amarillo', 'azul'][this.color]} · ♥ ${this.lives}`);
    this.graphics.fillStyle(COLORS[this.color === 2 ? 3 : this.color]).fillRoundedRect(197, 287, 86, 76, 15);
    this.glyph('📦', 240, 324, 35);
    this.bins.forEach((bin, index) => {
      const colorIndex = index === 2 ? 3 : index;
      this.graphics.fillStyle(COLORS[colorIndex]).lineStyle(3, 0xfffdf6).fillRoundedRect(bin.x - 42, 402, 84, 75, 9).strokeRoundedRect(bin.x - 42, 402, 84, 75, 9);
      this.glyph(bin.key, bin.x, 436, 30, '#ffffff');
    });
  }

  private deliver(bin: number): void {
    if (this.ended) return;
    this.attempts += 1;
    if (bin === this.color) { this.score += 1; this.correct += 1; this.feedbackText.setText('¡Paquete entregado! +1'); }
    else { this.lives -= 1; this.feedbackText.setText(`Contenedor incorrecto · ♥ ${this.lives}`); }
    if (!this.lives) { this.finish(this.score, this.correct / this.attempts); return; }
    this.nextParcel(); this.draw();
  }

  pointerDown(x: number, y: number): void { if (y >= 390) this.deliver(x < 184 ? 0 : x > 296 ? 2 : 1); }
  keyDown(event: KeyboardEvent): void {
    const bin = ({ ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2 } as Record<string, number>)[event.key];
    if (bin !== undefined) { event.preventDefault(); this.deliver(bin); }
  }
}

class CatPianoGame extends FastActionGame {
  private lane = 0;
  private noteY = 260;
  private noteSpeed = 125;
  private score = 0;
  private lives = 3;
  private hits = 0;
  private misses = 0;
  private readonly lanes = [132, 204, 276, 348];

  create(): void { this.chrome('Toca la tecla de la nota cuando llegue a la franja inferior. No pulses las teclas vacías.'); this.nextNote(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.hits + this.misses)); return; }
    this.noteY += this.noteSpeed * delta / 1000;
    if (this.noteY > 494) this.miss();
    this.draw();
  }
  private nextNote(): void { this.lane = this.randomInt(0, 3); this.noteY = 267; this.noteSpeed = Math.min(315, 125 + this.score * 3); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Toca la nota que baja · ♥ ${this.lives}`);
    this.lanes.forEach((x, index) => {
      this.graphics.fillStyle(index === this.lane ? 0xf4f0e6 : 0xe0dbd0).lineStyle(2, 0xcfc8b8).fillRoundedRect(x - 30, 263, 60, 228, 7).strokeRoundedRect(x - 30, 263, 60, 228, 7);
      this.glyph(['A', 'S', 'D', 'F'][index], x, 507, 15, '#718176', 'DM Mono, monospace');
    });
    this.graphics.fillStyle(0xe5b44e).fillRoundedRect(102, 438, 276, 10, 5);
    this.graphics.fillStyle(0x344d3d).fillRoundedRect(this.lanes[this.lane] - 21, this.noteY - 17, 42, 34, 8);
    this.glyph('♪', this.lanes[this.lane], this.noteY, 25, '#fffdf6');
  }

  private press(lane: number): void {
    if (this.ended) return;
    if (lane === this.lane && this.noteY >= 405 && this.noteY <= 506) {
      this.score += 1; this.hits += 1; this.feedbackText.setText('¡Nota perfecta!'); this.nextNote();
    } else if (lane === this.lane || (this.noteY >= 405 && this.noteY <= 506)) this.miss();
    this.draw();
  }
  private miss(): void {
    this.misses += 1; this.lives -= 1; this.feedbackText.setText(`Nota perdida · ♥ ${this.lives}`);
    if (!this.lives) this.finish(this.score, this.hits / Math.max(1, this.hits + this.misses)); else this.nextNote();
  }
  pointerDown(x: number, y: number): void { if (y >= 263 && y <= 515) this.press(Math.max(0, Math.min(3, Math.floor((x - 101) / 72)))); }
  keyDown(event: KeyboardEvent): void {
    const lane = ({ a: 0, s: 1, d: 2, f: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 } as Record<string, number>)[event.key];
    if (lane !== undefined) { event.preventDefault(); this.press(lane); }
  }
}

const ARROWS = ['↑', '→', '↓', '←'];
class SwiftDirectionGame extends FastActionGame {
  private direction = 0;
  private windowMs = 1100;
  private remainingMs = this.windowMs;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;

  create(): void { this.chrome('Desliza o pulsa la flecha indicada antes de que se vacíe la barra. Cada ronda acelera.'); this.nextArrow(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) this.miss();
    this.draw();
  }
  private nextArrow(): void { this.direction = this.randomInt(0, 3); this.windowMs = Math.max(390, 1100 - this.score * 9); this.remainingMs = this.windowMs; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Responde ${ARROWS[this.direction]} · ♥ ${this.lives}`);
    this.glyph(ARROWS[this.direction], 240, 353, 100, '#30483b');
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(86, 448, 308, 19, 9);
    this.graphics.fillStyle(0xe5b34c).fillRoundedRect(86, 448, 308 * Phaser.Math.Clamp(this.remainingMs / this.windowMs, 0, 1), 19, 9);
    this.glyph('←    ↑    ↓    →', 240, 489, 17, '#718176', 'DM Mono, monospace');
  }

  private answer(direction: number): void {
    if (this.ended) return;
    this.attempts += 1;
    if (direction === this.direction) { this.correct += 1; this.score += 1; this.feedbackText.setText('+1 · ¡reflejos!'); this.nextArrow(); }
    else this.miss(false);
    this.draw();
  }
  private miss(expired = true): void {
    this.attempts += expired ? 1 : 0; this.lives -= 1; this.feedbackText.setText(`Dirección incorrecta · ♥ ${this.lives}`);
    if (!this.lives) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.nextArrow();
  }
  pointerDown(x: number, y: number): void {
    if (y < 550) return;
    const direction = x < 145 ? 3 : x < 230 ? 0 : x < 315 ? 2 : 1;
    this.answer(direction);
  }
  keyDown(event: KeyboardEvent): void { const direction = ARROWS.map((_, index) => index).find((index) => ({ ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 } as Record<string, number>)[event.key] === index); if (direction !== undefined) { event.preventDefault(); this.answer(direction); } }
}

class CrabSwitchGame extends FastActionGame {
  private active = 0;
  private windowMs = 1200;
  private remainingMs = this.windowMs;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;
  private readonly switches = [{ x: 153, y: 340 }, { x: 327, y: 340 }, { x: 153, y: 440 }, { x: 327, y: 440 }];

  create(): void { this.chrome('Activa el interruptor iluminado antes de que desaparezca. Tienes tres vidas.'); this.nextSwitch(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) this.incorrect('Se apagó el interruptor.');
    this.draw();
  }
  private nextSwitch(): void { this.active = this.randomInt(0, 3); this.windowMs = Math.max(430, 1200 - this.score * 12); this.remainingMs = this.windowMs; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`¡Pulsa el interruptor brillante! · ♥ ${this.lives}`);
    this.switches.forEach((point, index) => {
      const active = index === this.active;
      this.graphics.fillStyle(active ? 0x76b47d : 0xc6c2b7).lineStyle(4, active ? 0x438451 : 0xaaa699).fillRoundedRect(point.x - 49, point.y - 34, 98, 68, 17).strokeRoundedRect(point.x - 49, point.y - 34, 98, 68, 17);
      this.glyph(active ? 'ON' : 'OFF', point.x, point.y, 22, '#fffdf6', 'DM Mono, monospace');
    });
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(89, 492, 302, 12, 6);
    this.graphics.fillStyle(0xe5b34c).fillRoundedRect(89, 492, 302 * Phaser.Math.Clamp(this.remainingMs / this.windowMs, 0, 1), 12, 6);
  }

  private incorrect(message: string): void {
    this.attempts += 1; this.lives -= 1; this.feedbackText.setText(`${message} ♥ ${this.lives}`);
    if (!this.lives) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.nextSwitch();
  }
  private press(index: number): void {
    if (this.ended) return;
    if (index === this.active) { this.score += 1; this.correct += 1; this.attempts += 1; this.feedbackText.setText('+1'); this.nextSwitch(); }
    else this.incorrect('Era otro interruptor.');
    this.draw();
  }
  pointerDown(x: number, y: number): void { const index = this.switches.findIndex((point) => Math.abs(point.x - x) < 53 && Math.abs(point.y - y) < 38); if (index >= 0) this.press(index); }
  keyDown(event: KeyboardEvent): void { if (/^[1-4]$/.test(event.key)) this.press(Number(event.key) - 1); }
}

class WoodpeckerGame extends FastActionGame {
  private score = 0;
  private combo = 0;
  private sinceTapMs = 0;
  private hitFlash = 0;

  create(): void { this.chrome('Toca el tronco tan rápido como puedas. Encadena golpes para subir el multiplicador.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, 1); return; }
    this.sinceTapMs += delta; this.hitFlash = Math.max(0, this.hitFlash - delta); this.draw();
  }
  private tap(): void {
    if (this.ended) return;
    this.combo = this.sinceTapMs < 650 ? Math.min(5, this.combo + 1) : 1;
    this.score += 1; this.sinceTapMs = 0; this.hitFlash = 140;
    this.feedbackText.setText(this.combo >= 3 ? `¡Combo ×${this.combo}!` : '¡Toc! +1'); this.draw();
  }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'toques');
    this.promptText.setText(`Combo ×${Math.max(1, this.combo)} · toca el tronco`);
    this.graphics.fillStyle(this.hitFlash ? 0xac7748 : 0x8d603c).lineStyle(4, 0x694728).fillRoundedRect(175, 272, 130, 206, 27).strokeRoundedRect(175, 272, 130, 206, 27);
    this.graphics.lineStyle(5, 0xd1a06a).lineBetween(191, 307, 286, 307);
    this.graphics.lineStyle(5, 0xd1a06a).lineBetween(191, 367, 286, 367);
    this.graphics.lineStyle(5, 0xd1a06a).lineBetween(191, 427, 286, 427);
    this.glyph('🪶', 240, 359, 44);
    this.glyph('TOCA', 240, 493, 15, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, y: number): void { if (y >= 250 && y <= 520) this.tap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.tap(); } }
}

class SwallowHuntGame extends FastActionGame {
  private target: Point = { x: 240, y: 380 };
  private visibleMs = 1000;
  private remainingMs = this.visibleMs;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;

  create(): void { this.chrome('Toca cada insecto antes de que vuele. Tienes tres vidas.'); this.nextTarget(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) this.miss();
    this.draw();
  }
  private nextTarget(): void { this.target = { x: this.randomInt(95, 385), y: this.randomInt(286, 480) }; this.visibleMs = Math.max(400, 1050 - this.score * 9); this.remainingMs = this.visibleMs; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`¡Caza al insecto antes de que escape! · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x8fc4a0, 0.35).fillCircle(this.target.x, this.target.y, 43);
    this.glyph('🪰', this.target.x, this.target.y, 40);
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(87, 489, 306, 12, 6);
    this.graphics.fillStyle(0x75a47c).fillRoundedRect(87, 489, 306 * Phaser.Math.Clamp(this.remainingMs / this.visibleMs, 0, 1), 12, 6);
  }
  private miss(): void {
    this.attempts += 1; this.lives -= 1; this.feedbackText.setText(`¡Se escapó! ♥ ${this.lives}`);
    if (!this.lives) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; }
    this.nextTarget();
  }
  private hit(x: number, y: number): void {
    if (this.ended || this.remainingMs <= 0) return;
    if (Math.hypot(this.target.x - x, this.target.y - y) <= 48) {
      this.score += 1; this.correct += 1; this.attempts += 1; this.feedbackText.setText('¡Atrapado! +1'); this.nextTarget(); this.draw();
    }
  }
  pointerDown(x: number, y: number): void { this.hit(x, y); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') this.hit(this.target.x, this.target.y); }
}
