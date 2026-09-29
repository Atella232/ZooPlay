import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };
type Block = { x: number; y: number; lane: number; passed: boolean };

export function createMovementSpecialGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'pinguino-escalador': return new PenguinIceClimbGame(...args);
    case 'lemur-giratorio': return new LemurSwingGame(...args);
    case 'guepardo-derrapante': return new CheetahZigzagGame(...args);
    case 'liebre-en-la-autopista': return new HareHighwayGame(...args);
    case 'mantis-cortadora': return new MantisBladeGame(...args);
    case 'anguila-electrica': return new ElectricEelGame(...args);
    case 'pulga-botadora': return new BouncyFleaGame(...args);
    default: return undefined;
  }
}

abstract class MovementSpecialGame implements DedicatedGame {
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

class PenguinIceClimbGame extends MovementSpecialGame {
  private score = 0;
  private attempts = 0;
  private perfect = 0;
  private feedbackMs = 0;

  create(): void { this.chrome('Toca cuando el pingüino atraviese la zona verde del columpio. Cada aterrizaje perfecto suma 10 metros.'); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.perfect / Math.max(1, this.attempts)); return; } this.feedbackMs = Math.max(0, this.feedbackMs - delta); this.draw(); }

  private tap(): void {
    if (this.ended) return;
    const markerX = 240 + Math.sin(this.elapsedMs / 325) * 150;
    const deviation = Math.abs(markerX - 240);
    this.attempts += 1;
    if (deviation < 18) { this.score += 10; this.perfect += 1; this.feedbackText.setText('¡Perfecto! +10 m'); }
    else if (deviation < 44) { this.score += 5; this.feedbackText.setText('¡Buen aterrizaje! +5 m'); }
    else this.feedbackText.setText('Aterrizaje fuera de la zona.');
    this.feedbackMs = 200;
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'm');
    const markerX = 240 + Math.sin(this.elapsedMs / 325) * 150;
    this.promptText.setText('Toca cuando pase por la zona verde.');
    this.graphics.lineStyle(14, 0xd9ded2).lineBetween(86, 405, 394, 405);
    this.graphics.lineStyle(14, 0x78ae7c).lineBetween(222, 405, 258, 405);
    this.graphics.lineStyle(4, 0x516c58).lineBetween(markerX, 365, markerX, 445);
    this.graphics.fillStyle(0x496851).fillCircle(markerX, 357, 17);
    this.glyph('🐧', markerX, 354, 27);
    this.glyph(`${this.score} m  ·  ${this.perfect} perfectos`, 240, 478, 15, '#718176', 'DM Mono, monospace');
    this.glyph('TOCA PARA SALTAR', 240, 499, 13, '#718176', 'DM Mono, monospace');
  }

  pointerDown(_x: number, y: number): void { if (y >= 250) this.tap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.tap(); } }
}

class LemurSwingGame extends MovementSpecialGame {
  private score = 0;
  private attempts = 0;
  private successful = 0;
  private lastAttempt = -1000;

  create(): void { this.chrome('Engánchate en el tramo rojo de la curva y suéltate al apuntar al siguiente tramo.'); this.draw(); }
  update(delta: number): void { if (this.tick(delta)) { this.finish(this.score, this.successful / Math.max(1, this.attempts)); return; } this.draw(); }

  private release(): void {
    if (this.ended || this.elapsedMs - this.lastAttempt < 650) return;
    this.lastAttempt = this.elapsedMs; this.attempts += 1;
    const phase = (this.elapsedMs % 2200) / 2200;
    const inRedZone = phase >= 0.35 && phase <= 0.49;
    if (inRedZone) { this.score += 1; this.successful += 1; this.feedbackText.setText('¡Se soltó en el punto perfecto! +1'); }
    else this.feedbackText.setText('Suelta al llegar a la curva roja.');
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    const phase = (this.elapsedMs % 2200) / 2200;
    const angle = -Math.PI * 0.8 + phase * Math.PI * 1.55;
    const x = 240 + Math.cos(angle) * 116; const y = 405 + Math.sin(angle) * 95;
    this.promptText.setText('Espera a que el lémur alcance el tramo rojo.');
    this.graphics.lineStyle(4, 0xc9b58d).lineBetween(240, 281, x, y);
    this.graphics.lineStyle(16, 0x78a17a).beginPath().arc(240, 405, 116, -Math.PI * 0.8, -Math.PI * 0.35, false).strokePath();
    this.graphics.lineStyle(17, 0xe26f50).beginPath().arc(240, 405, 116, -Math.PI * 0.35, -Math.PI * 0.08, false).strokePath();
    this.graphics.fillStyle(0x40392f).fillCircle(x, y, 18);
    this.glyph('🐒', x, y, 25);
    this.glyph('Toca / suelta', 240, 492, 14, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, y: number): void { if (y >= 250) this.release(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.release(); } }
}

class CheetahZigzagGame extends MovementSpecialGame {
  private score = 0;
  private lives = 3;
  private turns = 0;
  private hit = 0;
  private phase = 0;
  private lastTap = -1000;
  private path: Point[] = [];

  create(): void { this.chrome('Toca justo cuando el guepardo llegue a cada curva del zigzag.'); this.makePath(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hit / Math.max(1, this.turns)); return; }
    this.phase = (this.phase + delta / Math.max(520, 1040 - this.score * 5)) % 1;
    this.draw();
  }

  private makePath(): void { this.path = Array.from({ length: 7 }, (_, index) => ({ x: index % 2 ? 340 : 140, y: 294 + index * 32 })); }

  private tap(): void {
    if (this.ended || this.elapsedMs - this.lastTap < 300) return;
    this.lastTap = this.elapsedMs;
    const distanceToTurn = Math.min(...this.path.slice(1, -1).map((_, index) => Math.abs(this.phase - (index + 1) / (this.path.length - 1))));
    this.turns += 1;
    if (distanceToTurn < 0.12) { this.score += 1; this.hit += 1; this.feedbackText.setText('¡Derrape perfecto! +1'); }
    else {
      this.lives -= 1; this.feedbackText.setText(`Te saliste en la curva · ♥ ${this.lives}`);
      if (!this.lives) this.finish(this.score, this.hit / Math.max(1, this.turns));
    }
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Sigue la curva sin salirte · ♥ ${this.lives}`);
    for (let index = 1; index < this.path.length; index += 1) this.graphics.lineStyle(24, 0xdfe9d8).lineBetween(this.path[index - 1].x, this.path[index - 1].y, this.path[index].x, this.path[index].y);
    for (let index = 1; index < this.path.length - 1; index += 1) this.graphics.fillStyle(0xe56b4b).fillCircle(this.path[index].x, this.path[index].y, 6);
    const segment = Math.min(this.path.length - 2, Math.floor(this.phase * (this.path.length - 1)));
    const along = this.phase * (this.path.length - 1) - segment;
    const a = this.path[segment]; const b = this.path[segment + 1];
    const x = a.x + (b.x - a.x) * along; const y = a.y + (b.y - a.y) * along;
    this.graphics.fillStyle(0xe1a349).fillCircle(x, y, 17);
    this.glyph('🐆', x, y, 24);
    this.glyph('TOCA EN LA CURVA', 240, 500, 13, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, y: number): void { if (y >= 250) this.tap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.tap(); } }
}

class HareHighwayGame extends MovementSpecialGame {
  private lane = 1;
  private obstacles: Block[] = [];
  private spawnMs = 0;
  private score = 0;
  private lives = 3;
  private dodges = 0;
  private collisions = 0;

  create(): void { this.chrome('Cambia de carril para esquivar el tráfico. Cada segundo aumenta la velocidad.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.dodges / Math.max(1, this.dodges + this.collisions)); return; }
    const dt = delta / 1000;
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) { this.obstacles.push({ x: 131 + this.randomInt(0, 2) * 109, y: 260, lane: this.randomInt(0, 2), passed: false }); this.spawnMs = Math.max(470, 1080 - this.score * 2); }
    for (const obstacle of this.obstacles) {
      obstacle.y += (165 + Math.min(170, this.score * 2.5)) * dt;
      if (!obstacle.passed && obstacle.y >= 440) {
        obstacle.passed = true;
        if (obstacle.lane === this.lane) {
          this.collisions += 1; this.lives -= 1; this.feedbackText.setText(`¡Coche! Cambia de carril · ♥ ${this.lives}`);
          if (!this.lives) { this.finish(this.score, this.dodges / Math.max(1, this.dodges + this.collisions)); return; }
        } else { this.dodges += 1; this.score += 5; }
      }
    }
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.y < 525);
    this.draw();
  }

  private changeLane(direction: -1 | 1): void { this.lane = Phaser.Math.Clamp(this.lane + direction, 0, 2); this.draw(); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'm');
    this.promptText.setText(`Esquiva el tráfico · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x6c776c).fillRoundedRect(95, 252, 290, 245, 13);
    this.graphics.lineStyle(3, 0xf4edda, 0.85).lineBetween(192, 260, 192, 490).lineBetween(288, 260, 288, 490);
    for (const obstacle of this.obstacles) {
      this.graphics.fillStyle(0xe26e50).fillRoundedRect(112 + obstacle.lane * 96, obstacle.y - 17, 38, 34, 7);
      this.glyph('🚗', 131 + obstacle.lane * 96, obstacle.y, 22);
    }
    this.graphics.fillStyle(0x4c80a5).fillRoundedRect(112 + this.lane * 96, 423, 38, 34, 7);
    this.glyph('🐇', 131 + this.lane * 96, 437, 25);
    this.glyph('◀                ▶', 240, 502, 15, '#718176', 'DM Mono, monospace');
  }
  pointerDown(x: number, y: number): void { if (y >= 490) this.changeLane(x < 240 ? -1 : 1); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowLeft') { event.preventDefault(); this.changeLane(-1); } else if (event.key === 'ArrowRight') { event.preventDefault(); this.changeLane(1); } }
}

class MantisBladeGame extends MovementSpecialGame {
  private safe = true;
  private holding = false;
  private interval = 850;
  private remainingMs = this.interval;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private actions = 0;

  create(): void { this.chrome('Mantén pulsado para cortar los cubos verdes. Suelta antes de los cubos rojos.'); this.nextBlock(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.actions)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) this.resolveBlock();
    this.draw();
  }
  private nextBlock(): void { this.safe = this.randomInt(0, 3) !== 0; this.interval = Math.max(400, 850 - this.score * 2); this.remainingMs = this.interval; }

  private resolveBlock(): void {
    this.actions += 1;
    if (this.holding === this.safe) { this.correct += 1; this.score += 1; this.feedbackText.setText(this.safe ? '¡Cortado! +1' : '¡Has esquivado el cubo rojo!'); }
    else {
      this.lives -= 1; this.feedbackText.setText(this.safe ? `Se escapó un cubo · ♥ ${this.lives}` : `¡Cubo prohibido! · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.correct / this.actions); return; }
    }
    this.holding = false; this.nextBlock();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`${this.safe ? 'MANTÉN: cubo cortable' : 'SUELTA: cubo prohibido'} · ♥ ${this.lives}`);
    const color = this.safe ? 0x73a47a : 0xe06b4b;
    this.graphics.fillStyle(color).lineStyle(3, 0x4b5f48).fillRoundedRect(176, 306, 128, 115, 18).strokeRoundedRect(176, 306, 128, 115, 18);
    this.glyph(this.safe ? '✓' : '×', 240, 360, 48, '#ffffff');
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(93, 458, 294, 14, 7);
    this.graphics.fillStyle(0xe6af48).fillRoundedRect(93, 458, 294 * Phaser.Math.Clamp(this.remainingMs / this.interval, 0, 1), 14, 7);
    this.glyph(this.holding ? '✂ CORTANDO' : '✂ LISTA', 240, 495, 15, '#718176', 'DM Mono, monospace');
  }

  pointerDown(_x: number, y: number): void { if (y >= 250) this.holding = true; }
  pointerUp(_x: number, _y: number): void { this.holding = false; }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space') { event.preventDefault(); this.holding = !this.holding; } }
}

class ElectricEelGame extends MovementSpecialGame {
  private x = 100;
  private lane = 2;
  private direction: -1 | 1 = 1;
  private barriers: { x: number; blockedLane: number }[] = [];
  private coins: { x: number; lane: number }[] = [];
  private spawnMs = 0;
  private score = 0;
  private hits = 0;
  private errors = 0;

  create(): void { this.chrome('Toca para cambiar la dirección entre barras de neón y recoger puntos amarillos.'); this.newHazard(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.hits + this.errors)); return; }
    const dt = delta / 1000;
    this.x += this.direction * (135 + this.score * 2) * dt;
    if (this.x >= 380) { this.x = 380; this.direction = -1; }
    if (this.x <= 100) { this.x = 100; this.direction = 1; }
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) this.newHazard();
    for (const barrier of this.barriers) {
      barrier.x -= 160 * dt;
      if (barrier.x < this.x + 8 && barrier.x > this.x - 8 && barrier.blockedLane === this.lane) {
        this.errors += 1; this.finish(this.score, this.hits / Math.max(1, this.hits + this.errors)); return;
      }
    }
    for (const coin of this.coins) coin.x -= 160 * dt;
    this.coins = this.coins.filter((coin) => {
      if (Math.abs(coin.x - this.x) < 10 && coin.lane === this.lane) { this.score += 1; this.hits += 1; this.feedbackText.setText('¡Punto amarillo! +1'); return false; }
      return coin.x > 75;
    });
    this.barriers = this.barriers.filter((barrier) => barrier.x > 75);
    this.draw();
  }
  private newHazard(): void {
    const lane = this.randomInt(0, 4); this.barriers.push({ x: 400, blockedLane: lane });
    this.coins.push({ x: 400, lane: (lane + this.randomInt(1, 4)) % 5 }); this.spawnMs = Math.max(620, 1300 - this.score * 8);
  }
  private flip(): void { this.direction = -this.direction as -1 | 1; this.lane = Phaser.Math.Clamp(this.lane + this.direction, 0, 4); this.draw(); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Cambia de dirección entre barras · carril ${this.lane + 1} de 5`);
    for (let lane = 0; lane < 5; lane += 1) this.graphics.lineStyle(1, 0xded9ca).lineBetween(90, 281 + lane * 43, 390, 281 + lane * 43);
    this.barriers.forEach((barrier) => {
      this.graphics.lineStyle(6, 0x63c9d3).lineBetween(barrier.x, 276, barrier.x, 492);
      this.graphics.lineStyle(10, 0xeb6d54).lineBetween(barrier.x, 282 + barrier.blockedLane * 43, barrier.x, 320 + barrier.blockedLane * 43);
    });
    this.coins.forEach((coin) => this.graphics.fillStyle(0xf0ca52).fillCircle(coin.x, 302 + coin.lane * 43, 9));
    this.graphics.fillStyle(0x42a9a3).fillRoundedRect(this.x - 19, 294 + this.lane * 43, 38, 16, 8);
    this.glyph('🐍', this.x, 300 + this.lane * 43, 23);
    this.glyph('TOCA PARA GIRAR', 240, 500, 14, '#718176', 'DM Mono, monospace');
  }
  pointerDown(_x: number, y: number): void { if (y >= 250) this.flip(); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.code === 'Space') { event.preventDefault(); this.flip(); } }
}

class BouncyFleaGame extends MovementSpecialGame {
  private flea: Point = { x: 240, y: 433 };
  private vx = 116;
  private vy = -355;
  private line?: { start: Point; end: Point; expiresMs: number };
  private drawing?: Point;
  private drawEnd?: Point;
  private score = 0;
  private combo = 1;
  private bounces = 0;
  private misses = 0;
  private lives = 3;

  create(): void { this.chrome('Dibuja una plataforma bajo la pulga para rebotar. Encadena los saltos y evita los pinchos.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.bounces / Math.max(1, this.bounces + this.misses)); return; }
    const dt = delta / 1000;
    if (this.line) { this.line.expiresMs -= delta; if (this.line.expiresMs <= 0) this.line = undefined; }
    const previousY = this.flea.y;
    this.vy += 620 * dt; this.flea.x += this.vx * dt; this.flea.y += this.vy * dt;
    if (this.flea.x < 98 || this.flea.x > 382) this.vx *= -1;
    this.flea.x = Phaser.Math.Clamp(this.flea.x, 98, 382);
    if (this.line && this.vy > 0 && previousY < this.line.start.y && this.flea.y >= this.line.start.y) {
      const low = Math.min(this.line.start.x, this.line.end.x); const high = Math.max(this.line.start.x, this.line.end.x);
      if (this.flea.x >= low - 14 && this.flea.x <= high + 14) {
        this.flea.y = this.line.start.y - 15; this.vy = -Math.max(310, Math.abs(this.vy) * 0.92);
        this.score += this.combo; this.combo += 1; this.bounces += 1; this.line = undefined;
        this.feedbackText.setText(`¡Rebote! Combo ×${this.combo - 1} · +${this.combo - 1}`);
      }
    }
    if (this.flea.y > 505) {
      this.lives -= 1; this.misses += 1; this.combo = 1; this.flea = { x: 240, y: 433 }; this.vx *= -1; this.vy = -355; this.line = undefined;
      this.feedbackText.setText(`¡Cayó en los pinchos! · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.bounces / Math.max(1, this.bounces + this.misses)); return; }
    }
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Dibuja una línea bajo la pulga · combo ×${this.combo} · ♥ ${this.lives}`);
    this.graphics.fillStyle(0xe66c4b).fillTriangle(88, 499, 104, 468, 120, 499).fillTriangle(360, 499, 376, 468, 392, 499);
    this.graphics.lineStyle(5, 0xe3ded2).lineBetween(110, 504, 370, 504);
    if (this.line) this.graphics.lineStyle(7, 0x75a77d, 0.78).lineBetween(this.line.start.x, this.line.start.y, this.line.end.x, this.line.end.y);
    if (this.drawing && this.drawEnd) this.graphics.lineStyle(7, 0xe4b04b).lineBetween(this.drawing.x, this.drawing.y, this.drawEnd.x, this.drawEnd.y);
    this.graphics.fillStyle(0xe4b04b).fillCircle(this.flea.x, this.flea.y, 13);
    this.glyph('🦗', this.flea.x, this.flea.y - 1, 23);
    this.glyph(`${this.bounces} rebotes`, 240, 489, 14, '#718176', 'DM Mono, monospace');
  }

  pointerDown(x: number, y: number): void {
    if (y >= 250 && y < 500) { this.drawing = { x, y }; this.drawEnd = { x, y }; }
  }
  pointerMove(x: number, y: number, isDown: boolean): void { if (isDown && this.drawing) this.drawEnd = { x, y }; }
  pointerUp(x: number, y: number): void {
    if (!this.drawing) return;
    const start = this.drawing; const end = { x, y };
    this.drawing = undefined; this.drawEnd = undefined;
    if (Math.hypot(end.x - start.x, end.y - start.y) >= 48 && start.y > this.flea.y + 8 && Math.abs(end.y - start.y) < 50) {
      this.line = { start, end, expiresMs: 1700 };
      this.feedbackText.setText('¡Plataforma lista! Haz que la pulga caiga sobre ella.');
    }
    this.draw();
  }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.vx = -Math.abs(this.vx);
    else if (event.key === 'ArrowRight') this.vx = Math.abs(this.vx);
    else if (event.code === 'Space') { event.preventDefault(); this.vy = -360; }
  }
}
