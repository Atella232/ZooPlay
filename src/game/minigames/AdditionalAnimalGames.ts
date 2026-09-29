import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };
type Gap = { y: number; center: number; width: number; passed: boolean };

export function createAdditionalAnimalGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'gallina-aleteadora': return new ChickenGorgeGame(...args);
    case 'murcielago-entre-pinchos': return new BatSpikeGame(...args);
    case 'arana-tejedora': return new SpiderWebGame(...args);
    case 'camaleon-columpio': return new ChameleonSwingGame(...args);
    case 'mariposa-pintora': return new ButterflyPainterGame(...args);
    case 'oso-encestador': return new BearBasketGame(...args);
    case 'flamenco-equilibrista':
    case 'tucan-balancin': return new BalanceAnimalGame(...args);
    default: return undefined;
  }
}

abstract class AnimalGame implements DedicatedGame {
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

class ChickenGorgeGame extends AnimalGame {
  private x = 240;
  private gaps: Gap[] = [];
  private spawnMs = 0;
  private distance = 0;

  create(): void { this.chrome('Aletea a izquierda y derecha para atravesar el desfiladero cada vez más estrecho.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.distance, Math.min(1, this.distance / 120)); return; }
    const dt = delta / 1000;
    this.distance += dt * 3.2;
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) { this.gaps.push({ y: 250, center: this.randomInt(155, 325), width: Math.max(88, 170 - this.distance * 0.45), passed: false }); this.spawnMs = Math.max(480, 1250 - this.distance * 3); }
    for (const gap of this.gaps) {
      gap.y += 152 * dt;
      if (!gap.passed && gap.y >= 418) {
        gap.passed = true;
        if (Math.abs(this.x - gap.center) > gap.width / 2 - 14) { this.finish(this.distance, Math.min(1, this.distance / 120)); return; }
      }
    }
    this.gaps = this.gaps.filter((gap) => gap.y < 540);
    this.draw();
  }
  private flap(direction: -1 | 1): void { this.x = Phaser.Math.Clamp(this.x + direction * 38, 104, 376); this.draw(); }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.distance, 'm');
    this.promptText.setText('Aletea para mantenerte dentro de cada hueco.');
    for (const gap of this.gaps) {
      const leftEnd = gap.center - gap.width / 2; const rightStart = gap.center + gap.width / 2;
      this.graphics.fillStyle(0x779a73).fillRoundedRect(82, gap.y - 16, leftEnd - 82, 32, 7);
      this.graphics.fillStyle(0x779a73).fillRoundedRect(rightStart, gap.y - 16, 318 - rightStart, 32, 7);
    }
    this.graphics.fillStyle(0x386a50).fillCircle(this.x, 418, 17);
    this.glyph('🐔', this.x, 413, 26);
    this.glyph('◀         ALETEAR          ▶', 240, 495, 14, '#718176', 'DM Mono, monospace');
  }
  pointerDown(x: number, y: number): void { if (y >= 240) this.flap(x < this.x ? -1 : 1); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowLeft') { event.preventDefault(); this.flap(-1); } else if (event.key === 'ArrowRight') { event.preventDefault(); this.flap(1); } }
}

class BatSpikeGame extends AnimalGame {
  private x = 230;
  private y = 375;
  private vx = 180;
  private vy = -65;
  private spikeY = 340;
  private score = 0;
  private lives = 3;
  private attempts = 0;
  private safe = 0;

  create(): void { this.chrome('El murciélago rebota entre las paredes. Toca para cambiar la altura y esquivar los pinchos.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.safe / Math.max(1, this.attempts)); return; }
    const dt = delta / 1000;
    this.x += this.vx * dt; this.vy += 220 * dt; this.y += this.vy * dt;
    if (this.y < 278) { this.y = 278; this.vy = Math.abs(this.vy); }
    if (this.y > 474) { this.y = 474; this.vy = -Math.abs(this.vy); }
    if (this.x < 112 || this.x > 368) {
      this.x = Phaser.Math.Clamp(this.x, 112, 368); this.vx *= -1; this.attempts += 1;
      if (Math.abs(this.y - this.spikeY) < 62) {
        this.lives -= 1; this.feedbackText.setText(`¡Pinchos! Cambia la altura · ♥ ${this.lives}`);
        if (!this.lives) { this.finish(this.score, this.safe / this.attempts); return; }
      } else { this.score += 1; this.safe += 1; this.feedbackText.setText('¡Rebote seguro! +1'); }
      this.spikeY = this.randomInt(306, 454);
    }
    this.draw();
  }
  private flap(): void { this.vy = this.y > this.spikeY ? -220 : 220; this.draw(); }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Cambia la altura antes de la pared · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x677268).fillRoundedRect(91, 276, 19, 224, 8).fillRoundedRect(370, 276, 19, 224, 8);
    this.graphics.fillStyle(0xe2694c).fillTriangle(90, this.spikeY - 22, 116, this.spikeY, 90, this.spikeY + 22);
    this.graphics.fillStyle(0xe2694c).fillTriangle(390, this.spikeY - 22, 364, this.spikeY, 390, this.spikeY + 22);
    this.graphics.fillStyle(0x4d5449).fillCircle(this.x, this.y, 15);
    this.glyph('🦇', this.x, this.y, 27);
    this.glyph('TOCA PARA ALETEAR', 240, 495, 14, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, y: number): void { if (y >= 240) this.flap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); this.flap(); } }
}

class SpiderWebGame extends AnimalGame {
  private angle = 0;
  private thread = 120;
  private targetAngle = 0;
  private targetThread = 120;
  private node = 1;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;

  create(): void { this.chrome('Usa ← / → para girar la telaraña y ↑ / ↓ para cambiar el largo del hilo.'); this.newNode(); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.attempts)); return; } this.draw(); }
  private newNode(): void { this.targetAngle = this.randomInt(-3, 3); this.targetThread = this.randomInt(75, 190); }
  private adjust(key: string): void {
    if (key === 'ArrowLeft') this.angle = Math.max(-3, this.angle - 1);
    else if (key === 'ArrowRight') this.angle = Math.min(3, this.angle + 1);
    else if (key === 'ArrowUp') this.thread = Math.min(200, this.thread + 15);
    else if (key === 'ArrowDown') this.thread = Math.max(55, this.thread - 15);
    this.draw();
  }
  private moveNode(): void {
    this.attempts += 1;
    if (this.angle === this.targetAngle && Math.abs(this.thread - this.targetThread) <= 23) {
      this.correct += 1; this.score += 1; this.node += 1; this.feedbackText.setText(`¡Nodo alcanzado! ${this.node} de 8`);
      if (this.node > 8) { this.finish(this.score, this.correct / this.attempts); return; }
      this.newNode();
    } else {
      this.lives -= 1; this.feedbackText.setText(`Ajusta el ángulo y el hilo · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.correct / this.attempts); return; }
    }
    this.draw();
  }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Nodo ${this.node} de 8 · gira ${this.targetAngle} · hilo ${this.targetThread} · ♥ ${this.lives}`);
    const center = { x: 240, y: 386 };
    this.graphics.lineStyle(2, 0xbecfc1).strokeCircle(center.x, center.y, 112);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      this.graphics.lineStyle(2, 0xd4dfd4).lineBetween(center.x, center.y, center.x + Math.cos(angle) * 112, center.y + Math.sin(angle) * 112);
    }
    const targetRadians = (this.targetAngle + 4) * Math.PI / 4;
    const target = { x: center.x + Math.cos(targetRadians) * this.targetThread, y: center.y + Math.sin(targetRadians) * this.targetThread };
    const angle = (this.angle + 4) * Math.PI / 4;
    const point = { x: center.x + Math.cos(angle) * this.thread, y: center.y + Math.sin(angle) * this.thread };
    this.graphics.lineStyle(4, 0x72a27d).lineBetween(center.x, center.y, point.x, point.y);
    this.graphics.fillStyle(0xe3ad4b).fillCircle(target.x, target.y, 10);
    this.graphics.fillStyle(0x477754).fillCircle(point.x, point.y, 13);
    this.glyph('← girar   → girar', 240, 500, 13, '#718176', 'DM Mono, monospace');
    const controls: [number, string][] = [[105, '↺'], [190, '＋ hilo'], [290, '− hilo'], [375, '↻']];
    for (const [x, label] of controls) {
      this.graphics.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(x - 36, 586, 72, 48, 12).strokeRoundedRect(x - 36, 586, 72, 48, 12);
      this.glyph(label, x, 604, 15, '#30483b', 'DM Mono, monospace');
    }
    this.graphics.fillStyle(0x334f40).fillRoundedRect(178, 647, 124, 40, 12);
    this.glyph('IR AL NODO', 240, 667, 13, '#ffffff', 'DM Mono, monospace');
  }
  pointerDown(x: number, y: number): void {
    if (y >= 585 && y < 640) {
      if (x < 145) this.adjust('ArrowLeft'); else if (x < 240) this.adjust('ArrowUp'); else if (x < 335) this.adjust('ArrowDown'); else this.adjust('ArrowRight');
    } else if (y >= 647) this.moveNode();
    else if (x > 200 && x < 280 && y > 320 && y < 460) this.moveNode();
  }
  keyDown(event: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); this.adjust(event.key); }
    else if (event.code === 'Space' || event.key === 'Enter') this.moveNode();
  }
}

class ChameleonSwingGame extends AnimalGame {
  private playerX = 135;
  private targetX = 345;
  private charging = false;
  private chargeMs = 0;
  private score = 0;
  private lives = 3;
  private hits = 0;
  private attempts = 0;

  create(): void { this.chrome('Mantén para engancharte con la lengua. Suelta cuando tengas impulso para volar entre columnas.'); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.attempts)); return; } if (this.charging) this.chargeMs = Math.min(1000, this.chargeMs + delta); this.draw(); }
  private launch(): void {
    const distance = 95 + this.chargeMs / 1000 * 180;
    const needed = Math.abs(this.targetX - this.playerX);
    const accuracy = Phaser.Math.Clamp(1 - Math.abs(distance - needed) / 70, 0, 1);
    this.attempts += 1;
    if (accuracy >= 0.6) {
      this.score += 1; this.hits += 1; this.playerX = this.targetX; this.targetX = this.targetX < 240 ? 345 : 135;
      this.feedbackText.setText(accuracy > 0.9 ? '¡Vuelo perfecto! +1' : '¡Llegaste a la otra columna!');
    } else {
      this.lives -= 1; this.feedbackText.setText(`Te faltó o te sobró impulso · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.hits / this.attempts); return; }
    }
    this.chargeMs = 0; this.charging = false; this.draw();
  }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Engánchate y cruza la columna · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x9d7550).fillRoundedRect(101, 276, 42, 213, 11).fillRoundedRect(337, 276, 42, 213, 11);
    this.graphics.fillStyle(0x72a17c).fillRoundedRect(this.targetX - 11, 288, 22, 46, 7);
    this.graphics.lineStyle(4, this.charging ? 0xe3b04a : 0x78a17c).lineBetween(this.playerX, 394, this.playerX + (this.targetX - this.playerX) * (this.charging ? 0.45 : 0.2), 330);
    this.graphics.fillStyle(0x77a272).fillCircle(this.playerX, 408 - this.chargeMs / 22, 17);
    this.glyph('🦎', this.playerX, 404 - this.chargeMs / 22, 27);
    this.graphics.fillStyle(0xe5e0d5).fillRoundedRect(95, 470, 290, 17, 8);
    this.graphics.fillStyle(0xe4b04a).fillRoundedRect(95, 470, 290 * this.chargeMs / 1000, 17, 8);
    this.glyph(this.charging ? 'SUELTA PARA VOLAR' : 'MANTÉN PARA AGARRARTE', 240, 505, 12, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, _y: number): void { if (!this.charging) { this.charging = true; this.chargeMs = 0; } }
  pointerUp(_x: number, _y: number): void { if (this.charging) this.launch(); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') this.chargeMs = Math.min(1000, this.chargeMs + 110);
    else if (event.key === 'ArrowDown') this.chargeMs = Math.max(0, this.chargeMs - 110);
    else if (event.code === 'Space') { event.preventDefault(); if (this.charging) this.launch(); else this.charging = true; }
  }
}

const HUES = [0xe45f50, 0xe89548, 0xe1c84b, 0x77a66b, 0x55a6a2, 0x598dc1, 0x866cb0, 0xc36f9b];
function shade(hex: number, brightness: number): number {
  const factor = 0.58 + brightness * 0.14;
  const red = Math.min(255, Math.round(((hex >> 16) & 255) * factor));
  const green = Math.min(255, Math.round(((hex >> 8) & 255) * factor));
  const blue = Math.min(255, Math.round((hex & 255) * factor));
  return (red << 16) | (green << 8) | blue;
}

class ButterflyPainterGame extends AnimalGame {
  private targetHue = 0;
  private targetLight = 2;
  private hue = 0;
  private light = 2;
  private score = 0;
  private attempts = 0;
  private matches = 0;
  private lives = 3;

  create(): void { this.chrome('Iguala el color de la derecha ajustando el tono y el brillo con las barras.'); this.newColor(); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.matches / Math.max(1, this.attempts)); return; } this.draw(); }
  private newColor(): void { this.targetHue = this.randomInt(0, 7); this.targetLight = this.randomInt(0, 4); this.hue = this.randomInt(0, 7); this.light = this.randomInt(0, 4); }
  private answer(): void {
    this.attempts += 1;
    if (this.hue === this.targetHue && this.light === this.targetLight) {
      this.matches += 1; this.score += 1; this.feedbackText.setText('¡Color igualado! +1'); this.newColor();
    } else {
      this.lives -= 1; this.feedbackText.setText(`Ajusta el tono y el brillo · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.matches / this.attempts); return; }
    }
    this.draw();
  }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'colores');
    this.promptText.setText(`Iguala los dos colores · ♥ ${this.lives}`);
    this.graphics.fillStyle(shade(HUES[this.hue], this.light)).fillRoundedRect(117, 273, 112, 72, 17);
    this.graphics.fillStyle(shade(HUES[this.targetHue], this.targetLight)).fillRoundedRect(251, 273, 112, 72, 17);
    this.glyph('TU COLOR', 173, 359, 12, '#718176', 'DM Mono, monospace');
    this.glyph('OBJETIVO', 307, 359, 12, '#718176', 'DM Mono, monospace');
    this.glyph('TONO', 91, 398, 11, '#718176', 'DM Mono, monospace');
    for (let index = 0; index < HUES.length; index += 1) this.graphics.fillStyle(HUES[index]).fillRoundedRect(108 + index * 37, 384, 34, 21, 6);
    this.graphics.lineStyle(3, 0x314c3d).strokeCircle(125 + this.hue * 37, 394, 15);
    this.glyph('BRILLO', 92, 444, 11, '#718176', 'DM Mono, monospace');
    for (let index = 0; index < 5; index += 1) this.graphics.fillStyle(shade(HUES[this.hue], index)).fillRoundedRect(143 + index * 42, 430, 37, 25, 5);
    this.graphics.lineStyle(3, 0x314c3d).strokeCircle(161 + this.light * 42, 442, 16);
    this.graphics.fillStyle(0x334f40).fillRoundedRect(174, 469, 132, 38, 11);
    this.glyph('COMPROBAR', 240, 489, 13, '#ffffff', 'DM Mono, monospace');
  }
  pointerDown(x: number, y: number): void {
    if (y >= 377 && y <= 414) this.hue = Phaser.Math.Clamp(Math.round((x - 125) / 37), 0, 7);
    else if (y >= 423 && y <= 460) this.light = Phaser.Math.Clamp(Math.round((x - 161) / 42), 0, 4);
    else if (y >= 465 && y <= 512) this.answer();
    this.draw();
  }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.hue = (this.hue + 7) % 8;
    else if (event.key === 'ArrowRight') this.hue = (this.hue + 1) % 8;
    else if (event.key === 'ArrowUp') this.light = Math.min(4, this.light + 1);
    else if (event.key === 'ArrowDown') this.light = Math.max(0, this.light - 1);
    else if (event.code === 'Space' || event.key === 'Enter') this.answer();
    this.draw();
  }
}

class BearBasketGame extends AnimalGame {
  private ball: Point = { x: 130, y: 456 };
  private velocity: Point = { x: 0, y: 0 };
  private basketX = 322;
  private shots = 0;
  private score = 0;
  private hits = 0;
  private drag?: Point;
  private flying = false;

  create(): void { this.chrome('Arrastra hacia atrás desde la pelota para apuntar y lanza a la canasta móvil.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.shots)); return; }
    const dt = delta / 1000;
    this.basketX = 322 + Math.sin(this.elapsedMs / 720) * 54;
    if (this.flying) {
      const previous = { ...this.ball };
      this.velocity.y += 530 * dt; this.ball.x += this.velocity.x * dt; this.ball.y += this.velocity.y * dt;
      if ((previous.x - this.basketX) * (this.ball.x - this.basketX) <= 0 && Math.abs(this.ball.y - 346) < 20 && Math.abs(this.ball.x - this.basketX) < 25) {
        this.score += 1; this.hits += 1; this.feedbackText.setText('¡Canasta! +1'); this.resetBall();
      } else if (this.ball.y > 515 || this.ball.x > 420 || this.ball.x < 60) { this.feedbackText.setText('Fallaste. Ajusta el tiro.'); this.resetBall(); }
    }
    this.draw();
  }
  private resetBall(): void { this.ball = { x: 130, y: 456 }; this.velocity = { x: 0, y: 0 }; this.flying = false; this.drag = undefined; }
  private launch(x: number, y: number): void {
    if (!this.drag || this.flying) return;
    const dx = this.ball.x - x; const dy = this.ball.y - y;
    if (Math.hypot(dx, dy) < 15) { this.drag = undefined; return; }
    this.shots += 1; this.velocity = { x: dx * 3.4, y: -Math.max(100, dy * 3.4) }; this.flying = true; this.drag = undefined;
  }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'canastas');
    this.promptText.setText(`Cestas ${this.score} · lanzamientos ${this.shots}`);
    this.graphics.lineStyle(5, 0x8c6546).lineBetween(this.basketX, 354, this.basketX, 447);
    this.graphics.lineStyle(5, 0xe37950).lineBetween(this.basketX - 28, 343, this.basketX + 28, 343);
    this.graphics.lineStyle(4, 0xfff3d7).lineBetween(this.basketX - 23, 350, this.basketX + 23, 350);
    this.graphics.fillStyle(0xe96e4e).fillCircle(this.ball.x, this.ball.y, 14);
    if (this.drag) {
      this.graphics.lineStyle(3, 0x394f42).lineBetween(this.ball.x, this.ball.y, this.drag.x, this.drag.y);
      this.glyph('↗', this.ball.x + 25, this.ball.y - 35, 25, '#30483b');
    }
    this.glyph('🏀', this.ball.x, this.ball.y, 25);
  }
  pointerDown(x: number, y: number): void { if (!this.flying && Math.hypot(x - this.ball.x, y - this.ball.y) < 45) this.drag = { x, y }; }
  pointerMove(x: number, y: number, isDown: boolean): void { if (this.drag && isDown) this.drag = { x, y }; }
  pointerUp(x: number, y: number): void { this.launch(x, y); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space') { event.preventDefault(); if (!this.flying) { this.shots += 1; this.flying = true; this.velocity = { x: 185, y: -400 }; } } }
}

class BalanceAnimalGame extends AnimalGame {
  private playerX = 240;
  private lives = 3;
  private score = 0;
  private stableSeconds = 0;
  private multiplier = 1;
  private multiplierTime = 0;

  create(): void { this.chrome(this.game.id === 'flamenco-equilibrista' ? 'Mueve el dedo a los lados para mantener la espada en equilibrio.' : 'Mantén la bola centrada en la balanza para aumentar el multiplicador.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.stableSeconds / Math.max(1, this.elapsedMs / 1000)); return; }
    const ballX = this.ballPosition();
    if (Math.abs(ballX - 240) < 38) {
      this.stableSeconds += delta / 1000;
      if (this.game.id === 'tucan-balancin') { this.multiplierTime += delta; if (this.multiplierTime > 2500) { this.multiplier = Math.min(5, this.multiplier + 1); this.multiplierTime = 0; } this.score += delta / 1000 * this.multiplier; }
      else this.score += delta / 1000;
    } else {
      if (this.game.id === 'tucan-balancin') { this.multiplier = 1; this.multiplierTime = 0; }
      if (Math.abs(ballX - 240) > 165) { this.lives -= 1; this.playerX = 240; if (!this.lives) { this.finish(this.score, this.stableSeconds / Math.max(1, this.elapsedMs / 1000)); return; } }
    }
    this.draw();
  }
  private ballPosition(): number { return Phaser.Math.Clamp(240 + Math.sin(this.elapsedMs / 370) * 105 + Math.sin(this.elapsedMs / 160) * 34 + (this.playerX - 240) * 0.65, 66, 414); }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, this.game.unit);
    this.promptText.setText(this.game.id === 'tucan-balancin' ? `Centro: ×${this.multiplier} · ♥ ${this.lives}` : `Equilibra la espada · ♥ ${this.lives}`);
    const ballX = this.ballPosition();
    this.graphics.lineStyle(11, 0xe8e2d3).lineBetween(72, 375, 408, 375);
    this.graphics.lineStyle(7, 0x71aa83).lineBetween(209, 375, 271, 375);
    this.graphics.fillStyle(this.game.id === 'tucan-balancin' ? 0xf0ce63 : 0xe76d4b).fillCircle(ballX, 375, 18);
    this.graphics.fillStyle(0x394f42).fillTriangle(240, 388, 215, 452, 265, 452);
    if (this.game.id === 'flamenco-equilibrista') { this.graphics.lineStyle(6, 0xc68f50).lineBetween(240, 270, ballX, 347); this.glyph('🦩', 240, 291, 28); }
    else { this.glyph(`×${this.multiplier}`, 240, 307, 25, '#314c3d', 'DM Mono, monospace'); this.glyph('🦜', 240, 290, 28); }
    this.graphics.lineStyle(2, 0x90a49a).strokeCircle(240, 375, 120);
  }
  pointerDown(x: number, _y: number): void { this.playerX = Phaser.Math.Clamp(x, 70, 410); }
  pointerMove(x: number, _y: number, isDown: boolean): void { if (isDown) this.playerX = Phaser.Math.Clamp(x, 70, 410); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowLeft') this.playerX = Phaser.Math.Clamp(this.playerX - 24, 70, 410); else if (event.key === 'ArrowRight') this.playerX = Phaser.Math.Clamp(this.playerX + 24, 70, 410); }
}
