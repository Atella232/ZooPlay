import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { DedicatedGame } from './VerticalSlice';
import type { RunResult } from '../ArcadeScene';

type Finish = (result: RunResult) => void;
type Block = { x: number; y: number; lane: number; color: number; passed?: boolean };
const INK = 0x263d34;
const LANE_COLORS = [0xe96e4e, 0xe3b64f, 0x69a17d, 0x729dc2];

/** Shared rendering and input primitives for the catalogue's distinct game rules. */
export class CatalogGame implements DedicatedGame {
  private g!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;
  private glyphs: Phaser.GameObjects.Text[] = [];
  private glyphIndex = 0;
  private elapsed = 0;
  private score = 0;
  private actions = 0;
  private hits = 0;
  private misses = 0;
  private lives = 3;
  private ended = false;
  private started = false;
  private seed = 0;
  private targetX = 240;
  private targetY = 352;
  private markerX = 240;
  private playerX = 240;
  private playerY = 462;
  private objects: Block[] = [];
  private spawnMs = 1150;
  private drag?: { x: number; y: number };
  private charge = false;
  private sequence: number[] = [];
  private sequenceIndex = 0;
  private level = 1;
  private showMs = 0;
  private answer = 0;
  private roundMs = 0;
  private targetChoice = 0;
  private choices: number[] = [];
  private colors = [0xe96e4e, 0xe3b64f, 0x69a17d, 0x729dc2];
  private width = 148;
  private ball = { x: 220, y: 300, vx: 80, vy: 0 };
  private cardNumbers: number[] = [];
  private drawnNumber = 0;
  private maze = ['########', '#..G...#', '#.##.#.#', '#B...#G#', '#.#..B.#', '#...G..#', '########'];
  private mazePlayer = { x: 1, y: 1 };
  private boxes: { x: number; y: number }[] = [{ x: 2, y: 3 }, { x: 5, y: 4 }];
  private goals: { x: number; y: number }[] = [{ x: 3, y: 1 }, { x: 6, y: 3 }, { x: 4, y: 5 }];
  private lastTrail = 0;
  private traceError = 0;
  private towerAngle = 0;
  private towerDepth = 0;
  private towerFloor = 0;
  private towerHazard = 5;

  constructor(private scene: Phaser.Scene, private game: GameManifest, private onFinish: Finish) {
    this.seed = [...game.id].reduce((total, char) => (Math.imul(total, 31) + char.charCodeAt(0)) >>> 0, 917);
  }

  create(): void {
    this.scene.add.rectangle(240, 360, 480, 720, 0xf7f4e9);
    this.scene.add.circle(45, 185, 88, 0xf2dfbc, 0.44);
    this.scene.add.circle(440, 486, 118, 0xdce9d9, 0.4);
    this.scene.add.text(27, 25, 'ZOOPLAY  /  JUEGO', { fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#718176', letterSpacing: 1.4 });
    this.scene.add.text(27, 51, this.game.name, { fontFamily: 'DM Sans, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#213b32', wordWrap: { width: 405 } });
    this.scoreText = this.scene.add.text(27, 103, `${this.game.metric}: 0`, { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#263d34' });
    this.timeText = this.scene.add.text(452, 103, this.timeLabel(this.game.durationSec * 1000), { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#263d34' }).setOrigin(1, 0);
    this.prompt = this.scene.add.text(240, 151, this.game.instructions, { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#334f40', align: 'center', wordWrap: { width: 408 }, lineSpacing: 4 }).setOrigin(0.5);
    this.feedback = this.scene.add.text(240, 543, '', { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#df6945', align: 'center', wordWrap: { width: 400 } }).setOrigin(0.5);
    this.g = this.scene.add.graphics();
    this.scene.add.rectangle(240, 632, 414, 92, 0xf0ede2, 0.84).setStrokeStyle(1, 0xe7e1d2);
    this.initializeRule();
    this.draw();
  }

  private initializeRule(): void {
    const mechanic = this.game.mechanic;
    if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve') this.playerX = 198;
    if (mechanic === 'sequence' || mechanic === 'rhythm') this.makeSequence();
    if (mechanic === 'typing') { this.targetChoice = this.randomInt(100000, 999999); this.showMs = 1900; }
    if (mechanic === 'color') this.makeColorRound();
    if (mechanic === 'bingo') this.cardNumbers = Array.from({ length: 16 }, (_, index) => index + 1).sort(() => this.random() - 0.5).slice(0, 4);
    if (mechanic === 'count') { this.roundMs = 0; this.targetChoice = this.randomInt(3, 6); }
    if (mechanic === 'aim' || mechanic === 'basket') this.placeTarget();
    if (this.game.id === 'armadillo-en-picado') this.towerHazard = this.randomInt(0, 7);
  }

  update(delta: number): void {
    if (this.ended) return;
    if (this.game.mechanic === 'flap' && !this.started) { this.draw(); return; }
    this.elapsed += delta;
    const remaining = Math.max(0, this.game.durationSec * 1000 - this.elapsed);
    this.timeText.setText(this.timeLabel(remaining));
    this.roundMs += delta;
    this.markerX = 240 + Math.sin(this.elapsed / (this.game.mechanic === 'rhythm' ? 370 : 285)) * 151;
    this.targetX = 240 + Math.sin(this.elapsed / 430) * 118;
    this.targetY = 342 + Math.sin(this.elapsed / 510) * 58;
    this.updateWorld(delta);
    this.draw();
    this.updateScoreLabel();
    if (remaining <= 0) this.finish();
  }

  private updateWorld(delta: number): void {
    const mechanic = this.game.mechanic;
    const dt = delta / 1000;
    if (this.game.id === 'armadillo-en-picado') {
      this.towerDepth += delta * (this.charge ? 0.19 : 0.055);
      const floor = Math.floor(this.towerDepth / 200);
      if (floor > this.towerFloor) {
        this.towerFloor = floor;
        const distance = Math.abs(this.towerAngle - this.towerHazard);
        const safe = Math.min(distance, 8 - distance) >= 2;
        if (safe) {
          this.score += 5; this.hits += 1;
          this.feedback.setText('¡Has pasado por el hueco! Sigue descendiendo.');
        } else {
          this.lives -= 1; this.misses += 1;
          this.feedback.setText(`¡Pincho! Cambia de sector · ♥ ${this.lives}`);
          if (!this.lives) { this.finish(); return; }
        }
        this.towerHazard = this.randomInt(0, 7);
      }
    } else if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve') {
      this.spawnMs -= delta;
      if (this.spawnMs <= 0) {
        const lane = this.randomInt(0, 3);
        this.objects.push({ x: 110 + lane * 88, y: 244, lane, color: LANE_COLORS[lane] });
        this.spawnMs = Math.max(480, 1080 - this.score * 13);
      }
      const speed = 148 + Math.min(150, this.score * 3);
      for (const object of this.objects) {
        object.y += speed * dt;
        if (!object.passed && object.y >= this.playerY - 20) {
          object.passed = true;
          if (Math.abs(object.x - this.playerX) < 36) {
            this.lives -= 1;
            this.misses += 1;
            this.feedback.setText(this.lives ? `¡Choque! Te quedan ${this.lives} vidas.` : '¡Se acabaron las vidas!');
            this.playerX = 198;
            if (!this.lives) this.finish();
          } else {
            this.score += mechanic === 'race' ? 2 : 1;
            this.hits += 1;
          }
        }
      }
      this.objects = this.objects.filter((object) => object.y < 525);
    } else if (mechanic === 'balance') {
      const lean = 240 + Math.sin(this.elapsed / 370) * 105 + Math.sin(this.elapsed / 160) * 34;
      const ballX = Phaser.Math.Clamp(lean + (this.playerX - 240) * 0.65, 66, 414);
      if (Math.abs(ballX - 240) < 37) this.score += delta / 1000;
      else if (Math.abs(ballX - 240) > 165) {
        this.lives -= 1;
        this.playerX = 240;
        if (!this.lives) this.finish();
      }
    } else if (mechanic === 'sequence' || mechanic === 'rhythm' || mechanic === 'typing') {
      if (this.showMs > 0) this.showMs = Math.max(0, this.showMs - delta);
    } else if (mechanic === 'count') {
      if (this.roundMs >= 3100) this.nextCountRound();
    } else if (mechanic === 'flap') {
      this.ball.vy += 950 * dt;
      this.ball.y += this.ball.vy * dt;
      this.spawnMs -= delta;
      if (this.spawnMs <= 0) {
        const gapY = Phaser.Math.Between(320, 427);
        this.objects.push({ x: 450, y: gapY, lane: 0, color: 0x66a078 });
        this.spawnMs = 1550;
      }
      for (const pipe of this.objects) {
        pipe.x -= 172 * dt;
        if (!pipe.passed && pipe.x < this.playerX - 35) { pipe.passed = true; this.score += 1; }
        if (Math.abs(pipe.x - this.playerX) < 36 && Math.abs(pipe.y - this.ball.y) > 82) { this.finish(); return; }
      }
      this.objects = this.objects.filter((pipe) => pipe.x > -60);
      if (this.ball.y < 235 || this.ball.y > 506) this.finish();
    } else if (mechanic === 'catch') {
      this.ball.vy += 520 * dt;
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
      if (this.ball.x < 78 || this.ball.x > 402) this.ball.vx *= -1;
      if (this.ball.y > 486) {
        if (Math.abs(this.ball.x - this.playerX) < 49) { this.score += 1; this.hits += 1; this.feedback.setText('¡La has mantenido en el aire!'); }
        else { this.lives -= 1; this.misses += 1; this.feedback.setText(`Se cayó la pelota · ♥ ${this.lives}`); }
        if (!this.lives) { this.finish(); return; }
        this.ball = { x: 116 + this.randomInt(0, 248), y: 300, vx: this.randomInt(-115, 115), vy: -330 };
      }
    } else if (mechanic === 'stack') {
      this.targetX = 240 + Math.sin(this.elapsed / Math.max(125, 330 - this.score * 6)) * 120;
    } else if (mechanic === 'sort' || mechanic === 'tiles') {
      this.spawnMs -= delta;
      if (!this.objects.length && this.spawnMs <= 0) {
        const lane = this.randomInt(0, 3);
        this.objects.push({ x: 100 + lane * 93, y: 260, lane, color: LANE_COLORS[lane] });
        this.spawnMs = Math.max(560, 1120 - this.score * 12);
      }
      const speed = mechanic === 'tiles' ? 138 + this.score * 3 : 116 + this.score * 2;
      const object = this.objects[0];
      if (object) {
        object.y += speed * dt;
        if (object.y > 512) {
          this.objects.shift();
          this.misses += 1;
          this.lives -= 1;
          if (!this.lives) this.finish();
        }
      }
    } else if (mechanic === 'aim' || mechanic === 'basket') {
      this.targetY = mechanic === 'basket' ? 334 + Math.sin(this.elapsed / 260) * 28 : 310 + Math.sin(this.elapsed / 390) * 110;
    } else if (mechanic === 'target') {
      this.targetY = 299 + Math.sin(this.elapsed / 490) * 125;
    } else if (mechanic === 'swing') {
      this.targetX = 240 + Math.sin(this.elapsed / 305) * 144;
    }
  }

  private draw(): void {
    this.glyphIndex = 0;
    this.glyphs.forEach((glyph) => glyph.setVisible(false));
    const g = this.g;
    g.clear();
    g.fillStyle(0xfffdf6).lineStyle(2, 0xe7e1d2).fillRoundedRect(48, 226, 384, 294, 22).strokeRoundedRect(48, 226, 384, 294, 22);
    const mechanic = this.game.mechanic;
    if (mechanic === 'target' || mechanic === 'aim' || mechanic === 'basket') this.drawTarget(g);
    else if (mechanic === 'timing' || mechanic === 'rhythm') this.drawTiming(g);
    else if (mechanic === 'swerve' && this.game.id === 'armadillo-en-picado') this.drawTower(g);
    else if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve') this.drawRoad(g);
    else if (mechanic === 'balance') this.drawBalance(g);
    else if (mechanic === 'sequence') this.drawSequence(g);
    else if (mechanic === 'count') this.drawCount(g);
    else if (mechanic === 'color') this.drawColors(g);
    else if (mechanic === 'typing') this.drawTyping(g);
    else if (mechanic === 'stack') this.drawStack(g);
    else if (mechanic === 'sort' || mechanic === 'tiles') this.drawFalling(g);
    else if (mechanic === 'sokoban') this.drawSokoban(g);
    else if (mechanic === 'maze') this.drawRunMaze(g);
    else if (mechanic === 'flap') this.drawFlap(g);
    else if (mechanic === 'swing') this.drawSwing(g);
    else if (mechanic === 'catch') this.drawCatch(g);
    else if (mechanic === 'bingo') this.drawBingo(g);
    else if (mechanic === 'draw') this.drawTrace(g);
    if (mechanic === 'sequence' || mechanic === 'sokoban' || mechanic === 'maze') this.drawDirectionControls(g);
  }

  private drawTarget(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(4, 0xe5dfd2).lineBetween(76, 476, 404, 476);
    g.fillStyle(0x304d3e).fillCircle(this.targetX, this.targetY, 40);
    g.fillStyle(0xf4d46a).fillCircle(this.targetX, this.targetY, 29);
    g.fillStyle(0xe76c4b).fillCircle(this.targetX, this.targetY, 18);
    g.fillStyle(0xfff4d5).fillCircle(this.targetX, this.targetY, 7);
    this.glyph(this.game.emoji, this.targetX, this.targetY + 48, 27, '#263d34', 'sans-serif');
  }

  private drawTiming(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe9e3d5).fillRoundedRect(68, 345, 344, 28, 14);
    g.fillStyle(0x78ad87).fillRoundedRect(215, 339, 50, 40, 14);
    g.fillStyle(INK).fillCircle(this.markerX, 359, 15);
    for (let i = 0; i < 5; i += 1) {
      g.fillStyle(i < this.hits ? 0xe96e4e : 0xffffff).fillCircle(174 + i * 33, 426, 10);
      g.lineStyle(2, 0xded9ca).strokeCircle(174 + i * 33, 426, 10);
    }
  }

  private drawRoad(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x86ad73).fillRoundedRect(60, 239, 360, 270, 12);
    for (let lane = 0; lane < 4; lane += 1) {
      const x = 67 + lane * 88;
      g.fillStyle(lane % 2 ? 0x555c5d : 0x626869).fillRect(x, 243, 86, 261);
      g.lineStyle(2, 0xf1e8c8, 0.8);
      for (let y = 252 + ((this.elapsed / 10) % 45); y < 503; y += 45) g.lineBetween(x + 43, y, x + 43, y + 22);
    }
    for (const obstacle of this.objects) {
      g.fillStyle(obstacle.color).fillRoundedRect(obstacle.x - 24, obstacle.y - 15, 48, 31, 8);
      g.fillStyle(0xdcebf0).fillRoundedRect(obstacle.x - 12, obstacle.y - 11, 24, 9, 3);
      g.fillStyle(0x293431).fillCircle(obstacle.x - 14, obstacle.y + 13, 4).fillCircle(obstacle.x + 15, obstacle.y + 13, 4);
    }
    g.fillStyle(0xe0b858).fillCircle(this.playerX, this.playerY, 17);
    g.fillStyle(0xf8f3e4).fillCircle(this.playerX - 4, this.playerY - 3, 3).fillCircle(this.playerX + 4, this.playerY - 3, 3);
    this.glyph(this.game.emoji, this.playerX, this.playerY - 31, 24, '#263d34', 'sans-serif');
  }

  private drawTower(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe2eadd).fillEllipse(240, 486, 324, 48);
    g.fillStyle(0x718679).fillRoundedRect(213, 271, 54, 218, 18);
    for (let ring = 0; ring < 5; ring += 1) {
      const y = 288 + ring * 41;
      const radius = 145 - ring * 6;
      const active = ring === this.towerFloor % 5;
      g.lineStyle(active ? 8 : 4, active ? 0x6fa47c : 0xa8b8a7, active ? 1 : 0.9).strokeEllipse(240, y, radius * 2, 42);
      g.lineStyle(2, 0xd8e2d3, 0.8).lineBetween(240, y - 21, 240, y + 21);
      const hazardAngle = this.towerHazard * Math.PI / 4;
      const hazardX = 240 + Math.cos(hazardAngle) * radius;
      const hazardY = y + Math.sin(hazardAngle) * 21;
      if (active) g.fillStyle(0xe56c4c).fillTriangle(hazardX - 11, hazardY + 9, hazardX + 11, hazardY + 9, hazardX, hazardY - 14);
    }
    const ringY = 288 + (this.towerFloor % 5) * 41;
    const ringRadius = 145 - (this.towerFloor % 5) * 6;
    const progress = (this.towerDepth % 200) / 200;
    const x = 240 + Math.cos(this.towerAngle * Math.PI / 4) * ringRadius;
    const y = ringY + Math.sin(this.towerAngle * Math.PI / 4) * 21 + progress * 34;
    g.fillStyle(0xe9bf58).fillCircle(x, y, 18);
    g.lineStyle(2, 0xfff7db).strokeCircle(x, y, 18);
    g.fillStyle(0x42594a).fillRoundedRect(95, 507, 290, 7, 4);
    g.fillStyle(0xe5b850).fillRoundedRect(95, 507, 290 * progress, 7, 4);
    this.glyph(this.game.emoji, x, y - 22, 28, '#263d34', 'sans-serif');
    this.prompt.setText('Mantén pulsado para bajar; toca a un lado u otro para girar y esquivar los pinchos.');
  }

  private drawBalance(g: Phaser.GameObjects.Graphics): void {
    const lean = 240 + Math.sin(this.elapsed / 370) * 105 + Math.sin(this.elapsed / 160) * 34;
    const ballX = Phaser.Math.Clamp(lean + (this.playerX - 240) * 0.65, 66, 414);
    g.lineStyle(11, 0xe8e2d3).lineBetween(72, 375, 408, 375);
    g.lineStyle(7, 0x71aa83).lineBetween(209, 375, 271, 375);
    g.fillStyle(0xe76d4b).fillCircle(ballX, 375, 18);
    g.fillStyle(0x394f42).fillTriangle(240, 388, 215, 452, 265, 452);
    g.fillStyle(0xf2ce63).fillCircle(240, 353, 15);
    g.lineStyle(2, 0x90a49a).strokeCircle(240, 375, 120);
  }

  private drawSequence(g: Phaser.GameObjects.Graphics): void {
    const arrows = ['←', '↑', '→', '↓'];
    const show = this.showMs > 0;
    for (let i = 0; i < 4; i += 1) {
      const x = 118 + (i % 2) * 244; const y = 326 + Math.floor(i / 2) * 105;
      const flashIndex = Math.floor((1800 - this.showMs) / 450);
      const lit = show && this.sequence[flashIndex] === i;
      g.fillStyle(lit ? 0xf0c254 : 0xe9eee5).lineStyle(2, 0xded9ca).fillRoundedRect(x - 43, y - 37, 86, 74, 18).strokeRoundedRect(x - 43, y - 37, 86, 74, 18);
      this.glyph(arrows[i], x, y - 18, 30);
    }
    this.prompt.setText(show ? `Memoriza el patrón · nivel ${this.level}` : `Repite ${this.sequenceIndex + 1} de ${this.sequence.length} · nivel ${this.level}`);
  }

  private drawCount(g: Phaser.GameObjects.Graphics): void {
    const showing = this.roundMs < 1450;
    if (showing) {
      const count = this.targetChoice;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 18 + (i % 3) * 28;
        g.fillStyle(LANE_COLORS[i % LANE_COLORS.length]).fillCircle(240 + Math.cos(angle) * radius * 1.9, 360 + Math.sin(angle) * radius * 1.25, 13);
      }
      this.prompt.setText('Cuenta los elementos antes de que desaparezcan.');
    } else this.prompt.setText(`¿Cuántos has contado? · respuesta ${this.answer}`);
    const labels = ['−', 'OK', '+'];
    [138, 240, 342].forEach((x, index) => {
      g.fillStyle(0xeaf0e8).lineStyle(2, 0xded9ca).fillRoundedRect(x - 37, 454, 74, 42, 10).strokeRoundedRect(x - 37, 454, 74, 42, 10);
      this.glyph(labels[index], x, 438, 22);
    });
  }

  private drawColors(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(this.colors[this.targetChoice]).fillRoundedRect(177, 276, 126, 81, 18);
    this.glyph('RECUERDA ESTE COLOR', 240, 376, 9, '#63766a', 'DM Mono, monospace');
    for (let i = 0; i < this.choices.length; i += 1) {
      const x = 112 + i * (256 / Math.max(1, this.choices.length - 1));
      g.fillStyle(this.colors[this.choices[i]]).lineStyle(3, 0xffffff).fillRoundedRect(x - 28, 425, 56, 56, 12).strokeRoundedRect(x - 28, 425, 56, 56, 12);
      this.glyph(String(i + 1), x, 454, 14, '#ffffff', 'DM Mono, monospace');
    }
  }

  private drawTyping(g: Phaser.GameObjects.Graphics): void {
    const text = String(this.targetChoice).padStart(6, '0');
    for (let i = 0; i < text.length; i += 1) {
      const x = 93 + i * 59;
      g.fillStyle(0xf0eee6).fillRoundedRect(x - 23, 309, 46, 60, 9);
      const visible = this.showMs > 0;
      this.glyph(visible ? text[i] : i < this.sequenceIndex ? '✓' : i === this.sequenceIndex ? text[i] : '·', x, 290, 20, '#314c3d', 'DM Mono, monospace');
    }
    for (let i = 0; i < 10; i += 1) {
      const x = 91 + (i % 5) * 74; const y = 414 + Math.floor(i / 5) * 47;
      g.fillStyle(0xffffff).lineStyle(1, 0xe4dfd2).fillRoundedRect(x - 26, y - 17, 52, 34, 8).strokeRoundedRect(x - 26, y - 17, 52, 34, 8);
      this.glyph(String(i), x, y - 13, 15, '#314c3d', 'DM Mono, monospace');
    }
  }

  private drawStack(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x69a17d).fillRoundedRect(240 - this.width / 2, 437, this.width, 30, 7);
    const x = 240 + Math.sin(this.elapsed / Math.max(140, 330 - this.score * 5)) * 123;
    g.fillStyle(0xe4b958).fillRoundedRect(x - this.width / 2, 399 - this.score * 31, this.width, 27, 7);
    for (let i = 0; i < Math.min(this.score, 5); i += 1) g.fillStyle(LANE_COLORS[i % 4]).fillRoundedRect(240 - 64 + i * 2, 435 - i * 31, 128 - i * 4, 27, 7);
    this.prompt.setText('Toca o pulsa espacio para soltar el bloque sobre la torre.');
  }

  private drawFalling(g: Phaser.GameObjects.Graphics): void {
    for (let lane = 0; lane < 4; lane += 1) {
      const x = 100 + lane * 93;
      g.fillStyle(0xf0eee6).fillRoundedRect(x - 36, 259, 72, 222, 13);
      g.lineStyle(2, 0xe4dfd2).lineBetween(x, 270, x, 480);
    }
    const object = this.objects[0];
    if (object) {
      const x = 100 + object.lane * 93;
      g.fillStyle(object.color).fillRoundedRect(x - 27, object.y - 25, 54, 48, 13);
      if (this.game.mechanic === 'tiles') this.glyph('♪', x, object.y - 18, 22, '#ffffff', 'sans-serif');
    }
    this.prompt.setText(this.game.mechanic === 'tiles' ? 'Pulsa el carril de la tecla que baja.' : 'Clasifica cada paquete en su carril de color.');
  }

  private drawSokoban(g: Phaser.GameObjects.Graphics): void {
    const originX = 103; const originY = 264; const cell = 39;
    for (let row = 0; row < this.maze.length; row += 1) {
      for (let col = 0; col < this.maze[row].length; col += 1) {
        const wall = this.maze[row][col] === '#'; const x = originX + col * cell; const y = originY + row * cell;
        g.fillStyle(wall ? 0x839385 : 0xf1eddf).fillRoundedRect(x + 1, y + 1, cell - 2, cell - 2, 5);
        if (this.goals.some((goal) => goal.x === col && goal.y === row)) g.fillStyle(0xe7bb56).fillCircle(x + 19, y + 19, 9);
        if (this.boxes.some((box) => box.x === col && box.y === row)) g.fillStyle(0xb9845d).fillRoundedRect(x + 6, y + 6, 27, 27, 5);
        if (this.mazePlayer.x === col && this.mazePlayer.y === row) g.fillStyle(0x67a07a).fillCircle(x + 19, y + 19, 12);
      }
    }
    this.prompt.setText('Empuja todas las cajas hasta las metas con las flechas.');
  }

  private drawRunMaze(g: Phaser.GameObjects.Graphics): void {
    const originX = 96; const originY = 254; const cell = 36;
    for (let row = 0; row < this.maze.length; row += 1) {
      for (let col = 0; col < this.maze[row].length; col += 1) {
        const tile = this.maze[row][col]; const x = originX + col * cell; const y = originY + row * cell;
        g.fillStyle(tile === '#' ? 0x788a7c : 0xf1eddf).fillRoundedRect(x + 1, y + 1, cell - 2, cell - 2, 5);
        if (tile === 'G') g.fillStyle(0xe8bd59).fillCircle(x + 18, y + 18, 10);
        if (tile === 'B') {
          g.fillStyle(0x293c33).fillCircle(x + 18, y + 18, 12);
          g.fillStyle(0x15241e).fillCircle(x + 18, y + 18, 7);
        }
        if (this.mazePlayer.x === col && this.mazePlayer.y === row) g.fillStyle(0xdf8855).fillCircle(x + 18, y + 18, 12);
      }
    }
    this.prompt.setText(`Llega a las metas y evita los agujeros · ♥ ${this.lives}`);
  }

  private drawFlap(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xdceaf0).fillRoundedRect(57, 237, 366, 272, 18);
    for (const pipe of this.objects) {
      const top = pipe.y - 80; const bottom = pipe.y + 80;
      g.fillStyle(0x68a17c).fillRoundedRect(pipe.x - 26, 243, 54, Math.max(0, top - 243), 5);
      g.fillStyle(0x68a17c).fillRoundedRect(pipe.x - 26, bottom, 54, Math.max(0, 507 - bottom), 5);
      g.fillStyle(0x4f8665).fillRoundedRect(pipe.x - 31, top - 12, 64, 16, 4);
      g.fillStyle(0x4f8665).fillRoundedRect(pipe.x - 31, bottom - 4, 64, 16, 4);
    }
    g.fillStyle(0xe4bb59).fillRect(57, 506, 366, 10);
    this.glyph(this.game.emoji, this.playerX, this.ball.y - 19, 38, '#263d34', 'sans-serif');
    this.prompt.setText('Toca o pulsa espacio para aletear y pasar por los huecos.');
  }

  private drawSwing(g: Phaser.GameObjects.Graphics): void {
    const topX = 240 + Math.sin(this.elapsed / 390) * 92;
    g.lineStyle(4, 0xe0dacb).lineBetween(240, 250, topX, 390);
    g.lineStyle(4, 0x75a481).lineBetween(topX, 390, this.targetX, 470);
    g.fillStyle(this.charge ? 0xe6bd59 : 0xe96e4e).fillCircle(topX, 390, 17);
    g.fillStyle(0x78a883, 0.26).fillCircle(240, 459, 49);
    this.prompt.setText('Mantén para agarrarte y suelta cuando pases por el centro.');
  }

  private drawCatch(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe8e2d3).fillRoundedRect(this.playerX - 39, 473, 78, 19, 8);
    g.lineStyle(4, 0x728f7a).lineBetween(this.playerX - 35, 477, this.playerX, 511);
    g.lineBetween(this.playerX + 35, 477, this.playerX, 511);
    g.fillStyle(0xe96e4e).fillCircle(this.ball.x, this.ball.y, 14);
    g.fillStyle(0xffffff).fillCircle(this.ball.x - 4, this.ball.y - 4, 4);
    this.glyph(this.game.emoji, this.playerX, 441, 26, '#263d34', 'sans-serif');
  }

  private drawBingo(g: Phaser.GameObjects.Graphics): void {
    if (!this.drawnNumber) {
      const remaining = this.cardNumbers.filter((number) => number > 0);
      this.drawnNumber = remaining[this.randomInt(0, Math.max(0, remaining.length - 1))] ?? 0;
    }
    for (let i = 0; i < 4; i += 1) {
      const x = 166 + (i % 2) * 148; const y = 328 + Math.floor(i / 2) * 103;
      const marked = this.cardNumbers[i] === 0;
      g.fillStyle(marked ? 0x9bc394 : 0xffffff).lineStyle(2, 0xded9ca).fillRoundedRect(x - 44, y - 36, 88, 72, 13).strokeRoundedRect(x - 44, y - 36, 88, 72, 13);
      this.glyph(marked ? '✓' : String(this.cardNumbers[i]), x, y - 17, 22, '#314c3d', 'DM Mono, monospace');
    }
    this.glyph(`Número: ${this.drawnNumber || '…'}   ·   ♥ ${this.lives}`, 240, 259, 13, '#314c3d', 'DM Mono, monospace');
    this.prompt.setText('Toca el número que acaba de salir. Completa el cartón 2×2.');
  }

  private drawTrace(g: Phaser.GameObjects.Graphics): void {
    const x1 = 95; const y1 = 436; const x2 = 174; const y2 = 315; const x3 = 252; const y3 = 416; const x4 = 386; const y4 = 295;
    g.lineStyle(9, 0x83aa8c, 0.4).lineBetween(x1, y1, x2, y2).lineBetween(x2, y2, x3, y3).lineBetween(x3, y3, x4, y4);
    g.lineStyle(3, 0x659274).lineBetween(x1, y1, x2, y2).lineBetween(x2, y2, x3, y3).lineBetween(x3, y3, x4, y4);
    g.fillStyle(0xe9b84f).fillCircle(x1, y1, 15);
    g.fillStyle(0xe66e4e).fillCircle(x4, y4, 15);
    g.fillStyle(0xffffff).fillCircle(this.playerX, this.playerY, 9);
    this.prompt.setText('Traza desde el círculo amarillo hasta el rojo siguiendo el camino.');
  }

  private drawDirectionControls(g: Phaser.GameObjects.Graphics): void {
    const controls: [number, number, string][] = [[145, 632, '←'], [240, 602, '↑'], [240, 662, '↓'], [335, 632, '→']];
    for (const [x, y, arrow] of controls) {
      g.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillCircle(x, y, 21).strokeCircle(x, y, 21);
      this.glyph(arrow, x, y - 11, 20);
    }
  }

  private distanceToPath(x: number, y: number): number {
    const segments: [number, number, number, number][] = [[95, 436, 174, 315], [174, 315, 252, 416], [252, 416, 386, 295]];
    return Math.min(...segments.map(([x1, y1, x2, y2]) => {
      const dx = x2 - x1; const dy = y2 - y1;
      const t = Phaser.Math.Clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy), 0, 1);
      return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    }));
  }

  private glyph(text: string, x: number, y: number, size = 18, color = '#263d34', fontFamily = 'DM Sans, sans-serif'): void {
    let label = this.glyphs[this.glyphIndex];
    if (!label) {
      label = this.scene.add.text(-100, -100, '', { fontFamily, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5).setDepth(3);
      this.glyphs.push(label);
    }
    label.setText(text).setPosition(x, y).setStyle({ fontFamily, fontSize: `${size}px`, color, align: 'center' }).setVisible(true);
    this.glyphIndex += 1;
  }

  pointerDown(x: number, y: number): void {
    if (this.ended) return;
    this.drag = { x, y };
    const mechanic = this.game.mechanic;
    if (this.game.id === 'armadillo-en-picado') {
      this.towerAngle = (this.towerAngle + (x < 240 ? 7 : 1)) % 8;
      this.charge = true;
    }
    else if (mechanic === 'target' || mechanic === 'aim' || mechanic === 'basket') this.hitTarget(x, y);
    else if (mechanic === 'timing' || mechanic === 'rhythm') this.hitTiming();
    else if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve') this.moveLane(x);
    else if (mechanic === 'balance') this.playerX = x;
    else if (mechanic === 'sequence') {
      const direction = y > 565 ? this.directionAt(x, y) : (y > 380 ? 2 : 0) + (x > 240 ? 1 : 0);
      this.chooseSequence(direction);
    }
    else if (mechanic === 'count') this.countAction(x);
    else if (mechanic === 'color') this.chooseColor(x);
    else if (mechanic === 'typing') this.typeDigit(x, y);
    else if (mechanic === 'stack') this.dropBlock();
    else if (mechanic === 'sort' || mechanic === 'tiles') this.chooseLane(x);
    else if (mechanic === 'sokoban') this.moveBox(this.directionAt(x, y));
    else if (mechanic === 'maze') this.moveMaze(this.directionAt(x, y));
    else if (mechanic === 'flap') { this.started = true; this.ball.vy = -340; }
    else if (mechanic === 'swing') this.charge = true;
    else if (mechanic === 'catch') this.playerX = Phaser.Math.Clamp(x, 100, 380);
    else if (mechanic === 'bingo') this.chooseBingo(x, y);
    else if (mechanic === 'draw') {
      const startsNearDot = Math.hypot(x - 95, y - 436) < 42;
      this.playerX = x; this.playerY = y; this.lastTrail = startsNearDot ? 1 : 0; this.traceError = 0;
      this.feedback.setText(startsNearDot ? 'Sigue el camino hasta el círculo rojo.' : 'Empieza dentro del círculo amarillo.');
    }
    this.draw();
  }

  pointerMove(x: number, y: number, isDown: boolean): void {
    if (!isDown) return;
    if (this.game.mechanic === 'balance') this.playerX = Phaser.Math.Clamp(x, 70, 410);
    if (this.game.mechanic === 'catch') this.playerX = Phaser.Math.Clamp(x, 100, 380);
    if (this.game.mechanic === 'draw' && this.lastTrail) {
      this.traceError += this.distanceToPath(x, y);
      this.playerX = x; this.playerY = y; this.lastTrail += Math.hypot(x - (this.drag?.x ?? x), y - (this.drag?.y ?? y)); this.drag = { x, y };
    }
  }

  pointerUp(x: number, y: number): void {
    if (this.game.id === 'armadillo-en-picado') this.charge = false;
    else if (this.game.mechanic === 'swing' && this.charge) {
      this.charge = false;
      const precision = Phaser.Math.Clamp(1 - Math.abs(this.targetX - 240) / 150, 0, 1);
      this.record(precision > 0.65);
      this.feedback.setText(precision > 0.9 ? '¡Soltada perfecta!' : precision > 0.65 ? '¡Buen salto!' : 'Suelta cuando estés centrado.');
    } else if (this.game.mechanic === 'draw' && this.lastTrail) {
      const nearEnd = Math.hypot(x - 386, y - 295) < 45;
      const onPath = this.traceError / Math.max(1, this.lastTrail) < 0.24;
      this.record(nearEnd && this.lastTrail > 190 && onPath);
      this.lastTrail = 0;
      this.feedback.setText(nearEnd && onPath ? '¡Trazo correcto!' : 'Sigue mejor el camino y llega al círculo rojo.');
      if (nearEnd && onPath) { this.playerX = 95; this.playerY = 436; }
    }
    this.drag = undefined;
  }

  keyDown(event: KeyboardEvent): void {
    if (this.ended) return;
    const key = event.key;
    const dirs: Record<string, number> = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 };
    if (key in dirs) {
      event.preventDefault();
      const direction = dirs[key];
      const mechanic = this.game.mechanic;
      if (this.game.id === 'armadillo-en-picado') {
        if (direction === 0 || direction === 2) this.towerAngle = (this.towerAngle + (direction === 0 ? 7 : 1)) % 8;
        else this.towerDepth += 28;
      }
      else if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve') this.playerX = 110 + Phaser.Math.Clamp(Math.round((this.playerX - 110) / 88) + (direction === 2 ? 1 : direction === 0 ? -1 : 0), 0, 3) * 88;
      else if (mechanic === 'balance') this.playerX = Phaser.Math.Clamp(this.playerX + (direction === 2 ? 23 : direction === 0 ? -23 : 0), 70, 410);
      else if (mechanic === 'sequence') this.chooseSequence(direction);
      else if (mechanic === 'sokoban') this.moveBox(direction);
      else if (mechanic === 'maze') this.moveMaze(direction);
      else if (mechanic === 'sort' || mechanic === 'tiles') this.chooseLane(direction);
      else if (mechanic === 'catch') this.playerX = Phaser.Math.Clamp(this.playerX + (direction === 2 ? 30 : direction === 0 ? -30 : 0), 100, 380);
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      if (this.game.id === 'armadillo-en-picado') this.towerDepth += 45;
      else if (this.game.mechanic === 'flap') { this.started = true; this.ball.vy = -340; }
      else if (this.game.mechanic === 'stack') this.dropBlock();
      else if (this.game.mechanic === 'timing' || this.game.mechanic === 'rhythm') this.hitTiming();
      else if (this.game.mechanic === 'swing') {
        if (!this.charge) this.charge = true;
        else { this.charge = false; this.record(Math.abs(this.targetX - 240) < 52); }
      } else if (this.game.mechanic === 'count') this.countAction(240);
    } else if (/^[0-9]$/.test(key)) {
      if (this.game.mechanic === 'typing') {
        const digit = Number(key);
        this.typeDigit(91 + (digit % 5) * 74, digit === 0 || digit < 5 ? 414 : 461);
      }
      else if (this.game.mechanic === 'sequence') this.chooseSequence(Number(key) - 1);
      else if (this.game.mechanic === 'color') this.chooseColor(112 + (Number(key) - 1) * (256 / Math.max(1, this.choices.length - 1)));
    }
  }

  private hitTarget(x: number, y: number): void {
    const hit = Math.hypot(x - this.targetX, y - this.targetY) < (this.game.mechanic === 'basket' ? 48 : 38);
    this.record(hit);
    if (hit) { this.placeTarget(); this.feedback.setText(this.game.mechanic === 'basket' ? '¡Canasta!' : '¡Objetivo alcanzado!'); }
    else this.feedback.setText('¡Fallaste! Ajusta la puntería.');
  }

  private hitTiming(): void {
    const accuracy = Phaser.Math.Clamp(1 - Math.abs(this.markerX - 240) / 153, 0, 1);
    this.record(accuracy > 0.62);
    this.feedback.setText(accuracy > 0.9 ? '¡En el centro!' : accuracy > 0.62 ? '¡A tiempo!' : 'Un poco tarde.');
    if (this.actions >= 5) this.finish();
  }

  private moveLane(x: number): void {
    const lane = Phaser.Math.Clamp(Math.floor((x - 66) / 88), 0, 3);
    this.playerX = 110 + lane * 88;
  }

  private chooseSequence(direction: number): void {
    if (this.showMs > 0) return;
    if (direction === this.sequence[this.sequenceIndex]) {
      this.sequenceIndex += 1; this.hits += 1;
      if (this.sequenceIndex >= this.sequence.length) {
        this.score += 1; this.level += 1; this.makeSequence();
        if (this.level > 10) this.finish();
        else this.feedback.setText(`¡Nivel ${this.level - 1} superado!`);
      }
    } else {
      this.misses += 1; this.lives -= 1; this.sequenceIndex = 0; this.showMs = this.sequence.length * 430 + 150;
      this.feedback.setText(`Secuencia incorrecta · ♥ ${this.lives}`);
      if (!this.lives) this.finish();
    }
  }

  private countAction(x: number): void {
    if (this.roundMs < 1450 || x < 95 || x > 385) return;
    if (x < 185) this.answer = Math.max(0, this.answer - 1);
    else if (x > 295) this.answer += 1;
    else {
      this.record(this.answer === this.targetChoice);
      this.feedback.setText(this.answer === this.targetChoice ? '¡Lo has contado bien!' : `Eran ${this.targetChoice}.`);
      this.nextCountRound();
    }
  }

  private nextCountRound(): void {
    this.targetChoice = this.randomInt(3, Math.min(10, 5 + this.level)); this.answer = 0; this.roundMs = 0; this.level += 1;
  }

  private chooseColor(x: number): void {
    if (x < 75 || x > 405) return;
    const index = Phaser.Math.Clamp(Math.round((x - 112) / (256 / Math.max(1, this.choices.length - 1))), 0, this.choices.length - 1);
    this.record(this.choices[index] === this.targetChoice);
    this.feedback.setText(this.choices[index] === this.targetChoice ? '¡Color correcto!' : 'Ese color no coincide.');
    this.makeColorRound();
  }

  private typeDigit(x: number, y: number): void {
    if (y < 390 || y > 493 || this.showMs > 0) return;
    const digit = y < 438 ? Math.round((x - 91) / 74) : 5 + Math.round((x - 91) / 74);
    const sequence = String(this.targetChoice).padStart(6, '0');
    if (String(Phaser.Math.Clamp(digit, 0, 9)) === sequence[this.sequenceIndex]) {
      this.sequenceIndex += 1; this.hits += 1; this.score += 1;
      if (this.sequenceIndex >= sequence.length) {
        this.level += 1; this.sequenceIndex = 0; this.targetChoice = this.randomInt(100000, 999999); this.showMs = 1900;
        this.feedback.setText('¡Secuencia completa! Memoriza la siguiente.');
      }
    } else {
      this.misses += 1; this.lives -= 1; this.feedback.setText(`Dígito incorrecto · ♥ ${this.lives}`);
      if (!this.lives) this.finish();
    }
  }

  private dropBlock(): void {
    const blockX = 240 + Math.sin(this.elapsed / Math.max(140, 330 - this.score * 5)) * 123;
    const overlap = this.width - Math.abs(blockX - 240);
    if (overlap <= 14) { this.finish(); return; }
    this.width = Math.min(this.width, overlap);
    this.score += 1; this.hits += 1;
    this.feedback.setText('¡Bloque apilado!');
    if (this.score >= 12) this.finish();
  }

  private chooseLane(x: number): void {
    if (x < 53 || x > 425) return;
    const object = this.objects[0];
    if (!object) return;
    const lane = Phaser.Math.Clamp(Math.floor((x - 53) / 93), 0, 3);
    const correct = lane === object.lane;
    this.objects.shift(); this.record(correct);
    if (!correct) { this.lives -= 1; if (!this.lives) this.finish(); }
    this.spawnMs = 230;
    this.feedback.setText(correct ? '¡Carril correcto!' : `Era el carril ${object.lane + 1}.`);
  }

  private moveBox(direction: number): void {
    const dx = direction === 0 ? -1 : direction === 2 ? 1 : 0;
    const dy = direction === 1 ? -1 : direction === 3 ? 1 : 0;
    const x = this.mazePlayer.x + dx; const y = this.mazePlayer.y + dy;
    if (this.maze[y]?.[x] === '#' || !this.maze[y]) return;
    const boxIndex = this.boxes.findIndex((box) => box.x === x && box.y === y);
    if (boxIndex >= 0) {
      const bx = x + dx; const by = y + dy;
      if (this.maze[by]?.[bx] === '#' || !this.maze[by] || this.boxes.some((box) => box.x === bx && box.y === by)) return;
      this.boxes[boxIndex] = { x: bx, y: by };
      this.hits += 1;
    }
    this.mazePlayer = { x, y };
    if (this.boxes.every((box) => this.goals.some((goal) => goal.x === box.x && goal.y === box.y))) { this.score = this.boxes.length; this.finish(); }
  }

  private moveMaze(direction: number): void {
    const dx = direction === 0 ? -1 : direction === 2 ? 1 : 0;
    const dy = direction === 1 ? -1 : direction === 3 ? 1 : 0;
    const x = this.mazePlayer.x + dx; const y = this.mazePlayer.y + dy;
    if (!this.maze[y] || x < 0 || x >= this.maze[y].length || this.maze[y][x] === '#') return;
    const tile = this.maze[y][x];
    if (tile === 'B') {
      this.lives -= 1;
      this.mazePlayer = { x: 1, y: 1 };
      this.feedback.setText(`¡Agujero! Vuelve al inicio · ♥ ${this.lives}`);
      if (!this.lives) this.finish();
    } else {
      this.mazePlayer = { x, y };
      if (tile === 'G') {
        this.maze[y] = `${this.maze[y].slice(0, x)}.${this.maze[y].slice(x + 1)}`;
        this.score += 1; this.hits += 1;
        this.feedback.setText('¡Meta encontrada!');
        if (!this.maze.some((row) => row.includes('G'))) this.finish();
      }
    }
  }

  private chooseBingo(x: number, y: number): void {
    if (x < 122 || x > 418 || y < 292 || y > 498) return;
    const col = Phaser.Math.Clamp(Math.floor((x - 122) / 148), 0, 1); const row = Phaser.Math.Clamp(Math.floor((y - 292) / 103), 0, 1);
    const index = row * 2 + col;
    if (this.cardNumbers[index] === this.drawnNumber) {
      this.cardNumbers[index] = 0; this.score += 1; this.hits += 1; this.drawnNumber = 0;
      this.feedback.setText('¡Número marcado!');
      if (this.cardNumbers.every((number) => number === 0)) this.finish();
    } else {
      this.lives -= 1; this.misses += 1; this.drawnNumber = 0;
      this.feedback.setText(`No era ese · ♥ ${this.lives}`);
      if (!this.lives) this.finish();
    }
  }

  private makeSequence(): void {
    const length = Math.min(10, this.level + 2);
    this.sequence = Array.from({ length }, () => this.randomInt(0, 3));
    this.sequenceIndex = 0; this.showMs = this.sequence.length * 430 + 150;
  }

  private makeColorRound(): void {
    this.targetChoice = this.randomInt(0, 3);
    const ids = Array.from({ length: 4 }, (_, index) => index).sort(() => this.random() - 0.5);
    this.choices = ids;
  }

  private placeTarget(): void {
    this.targetX = this.randomInt(110, 370); this.targetY = this.randomInt(285, 475);
  }

  private directionAt(x: number, y: number): number {
    if (y > 565) {
      if (x < 195) return 0;
      if (x > 285) return 2;
      return y < 633 ? 1 : 3;
    }
    const dx = x - 240; const dy = y - 380;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3);
  }

  private record(correct: boolean): void {
    this.actions += 1;
    if (correct) { this.hits += 1; this.score += 1; }
    else this.misses += 1;
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    const elapsedMs = Math.max(1, Math.round(this.elapsed));
    const accuracy = this.actions ? this.hits / (this.hits + this.misses || 1) : 0;
    const score = this.game.direction === 'lower' ? Math.max(0.1, elapsedMs / 1000)
      : this.game.unit === '%' ? Math.round(accuracy * 10000) / 100
        : this.game.unit === 'm' ? Math.max(0.1, Math.round(this.score * 2.5 * 10) / 10)
          : this.game.metric === 'Desviación' ? Math.max(0.01, (1 - accuracy) * 0.8 + 0.02)
            : Math.max(0, Math.round(this.score));
    this.feedback.setText('¡Partida terminada!');
    this.onFinish({ score, elapsedMs, accuracy });
  }

  private updateScoreLabel(): void {
    let value = this.game.direction === 'lower' ? (this.elapsed / 1000).toFixed(1)
      : this.game.unit === '%' ? String(Math.round((this.actions ? this.hits / (this.hits + this.misses || 1) : 0) * 100))
        : this.game.unit === 'm' ? String(Math.round(this.score * 2.5 * 10) / 10)
          : String(Math.floor(this.score));
    if (this.game.unit === '%') value += '%';
    else if (this.game.unit !== 'puntos' && this.game.unit !== 'canastas' && this.game.unit !== 'niveles' && this.game.unit !== 'toques' && this.game.unit !== 'colores' && this.game.unit !== 'm' && this.game.unit !== 's') value += ` ${this.game.unit}`;
    this.scoreText.setText(`${this.game.metric}: ${value} · ♥ ${this.lives}`);
  }

  private random(): number { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 0xffffffff; }
  private randomInt(min: number, max: number): number { return min + Math.floor(this.random() * (max - min + 1)); }
  private timeLabel(ms: number): string { const seconds = Math.ceil(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
}

export function createCatalogGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame {
  return new CatalogGame(scene, game, onFinish);
}
