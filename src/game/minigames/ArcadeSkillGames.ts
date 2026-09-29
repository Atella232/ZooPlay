import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;
type Point = { x: number; y: number };
interface Asteroid extends Point { radius: number; speed: number; }
interface Laser { y: number; gapX: number; passed: boolean; }

export function createArcadeSkillGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'libelula-espacial': return new DragonflySpaceGame(...args);
    case 'abejorro-propulsado': return new BeeLaserGame(...args);
    case 'rana-saltarina': return new FrogJumpGame(...args);
    case 'gecko-trepador': return new GeckoWallGame(...args);
    case 'canguro-trampolin': return new KangarooBounceGame(...args);
    default: return undefined;
  }
}

abstract class ArcadeSkillGame implements DedicatedGame {
  protected graphics!: Phaser.GameObjects.Graphics;
  protected scoreText!: Phaser.GameObjects.Text;
  protected timerText!: Phaser.GameObjects.Text;
  protected promptText!: Phaser.GameObjects.Text;
  protected feedbackText!: Phaser.GameObjects.Text;
  protected elapsedMs = 0;
  protected ended = false;
  protected readonly play = { left: 80, right: 400, top: 245, bottom: 520 };
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

class DragonflySpaceGame extends ArcadeSkillGame {
  private player: Point = { x: 157, y: 382 };
  private aim: Point = { x: 157, y: 382 };
  private asteroids: Asteroid[] = [];
  private spawnMs = 650;
  private distance = 0;

  create(): void { this.chrome('Arrastra la libélula por el espacio para esquivar los asteroides.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.distance, Math.min(1, this.distance / 100)); return; }
    const dt = delta / 1000;
    this.distance += dt * 3.2;
    this.player.x += (this.aim.x - this.player.x) * Math.min(1, dt * 7);
    this.player.y += (this.aim.y - this.player.y) * Math.min(1, dt * 7);
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) { this.asteroids.push({ x: 430, y: this.randomInt(265, 493), radius: this.randomInt(18, 31), speed: this.randomInt(130, 205) }); this.spawnMs = Math.max(460, 1120 - this.distance * 3); }
    for (const rock of this.asteroids) rock.x -= rock.speed * dt;
    if (this.asteroids.some((rock) => Math.hypot(rock.x - this.player.x, rock.y - this.player.y) < rock.radius + 14)) {
      this.finish(this.distance, Math.min(1, this.distance / 100)); return;
    }
    this.asteroids = this.asteroids.filter((rock) => rock.x > 55);
    this.draw();
  }

  private aimAt(x: number, y: number): void { this.aim = { x: Phaser.Math.Clamp(x, 92, 388), y: Phaser.Math.Clamp(y, 255, 506) }; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.distance, 'm');
    this.promptText.setText('Arrastra la libélula alrededor de los asteroides.');
    for (let index = 0; index < 13; index += 1) this.graphics.fillStyle(0xd5d1c4, 0.48).fillCircle(85 + (index * 47) % 310, 266 + (index * 31) % 225, 2);
    for (const rock of this.asteroids) {
      this.graphics.fillStyle(0x92918a).lineStyle(2, 0x72736d).fillCircle(rock.x, rock.y, rock.radius).strokeCircle(rock.x, rock.y, rock.radius);
      this.graphics.fillStyle(0x73756f).fillCircle(rock.x - 5, rock.y - 4, 4).fillCircle(rock.x + 7, rock.y + 5, 3);
    }
    this.graphics.fillStyle(0x65a9a4).fillEllipse(this.player.x, this.player.y, 34, 19);
    this.graphics.fillStyle(0x93c6c0).fillEllipse(this.player.x + 2, this.player.y - 9, 29, 12);
    this.graphics.fillStyle(0xe9ad47).fillCircle(this.player.x + 12, this.player.y - 2, 4);
    this.glyph(`Distancia ${Math.floor(this.distance)} m`, 240, 497, 14, '#718176', 'DM Mono, monospace');
  }

  pointerDown(x: number, y: number): void { this.aimAt(x, y); }
  pointerMove(x: number, y: number, isDown: boolean): void { if (isDown) this.aimAt(x, y); }
  keyDown(event: KeyboardEvent): void {
    const delta = 28;
    if (event.key === 'ArrowLeft') this.aimAt(this.aim.x - delta, this.aim.y);
    else if (event.key === 'ArrowRight') this.aimAt(this.aim.x + delta, this.aim.y);
    else if (event.key === 'ArrowUp') this.aimAt(this.aim.x, this.aim.y - delta);
    else if (event.key === 'ArrowDown') this.aimAt(this.aim.x, this.aim.y + delta);
  }
}

class BeeLaserGame extends ArcadeSkillGame {
  private playerX = 240;
  private targetX = 240;
  private lasers: Laser[] = [];
  private spawnMs = 0;
  private distance = 0;
  private readonly playerY = 420;

  create(): void { this.chrome('Guía al abejorro entre los rayos láser. Mantén el dedo o las flechas para cambiar de carril.'); this.spawnLaser(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.distance, Math.min(1, this.distance / 100)); return; }
    const dt = delta / 1000;
    this.distance += delta * 0.009;
    this.playerX += (this.targetX - this.playerX) * Math.min(1, dt * 8);
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) this.spawnLaser();
    for (const laser of this.lasers) {
      laser.y += (150 + this.distance * 0.08) * dt;
      if (!laser.passed && laser.y >= this.playerY) {
        laser.passed = true;
        if (Math.abs(this.playerX - laser.gapX) > 57) { this.finish(this.distance, Math.min(1, this.distance / 100)); return; }
      }
    }
    this.lasers = this.lasers.filter((laser) => laser.y < 535);
    this.draw();
  }

  private spawnLaser(): void { this.lasers.push({ y: 250, gapX: this.randomInt(144, 336), passed: false }); this.spawnMs = Math.max(700, 1500 - this.distance * 2); }
  private steer(x: number): void { this.targetX = Phaser.Math.Clamp(x, 112, 368); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.distance, 'm');
    this.promptText.setText('Encuentra el hueco de cada barrera.');
    this.graphics.fillStyle(0x355947, 0.15).fillRoundedRect(106, 252, 268, 251, 13);
    for (const laser of this.lasers) {
      this.graphics.lineStyle(12, 0x74c4df, 0.24).lineBetween(115, laser.y, 365, laser.y);
      this.graphics.lineStyle(4, 0x54b8df).lineBetween(115, laser.y, laser.gapX - 57, laser.y);
      this.graphics.lineBetween(laser.gapX + 57, laser.y, 365, laser.y);
      this.graphics.fillStyle(0xd2f4ff).fillCircle(laser.gapX - 57, laser.y, 5).fillCircle(laser.gapX + 57, laser.y, 5);
    }
    this.graphics.fillStyle(0xebb943).fillEllipse(this.playerX, this.playerY, 30, 21);
    this.graphics.fillStyle(0x718f55).fillCircle(this.playerX + 13, this.playerY - 3, 7);
    this.glyph('🐝', this.playerX, this.playerY - 1, 24);
  }

  pointerDown(x: number, _y: number): void { this.steer(x); }
  pointerMove(x: number, _y: number, isDown: boolean): void { if (isDown) this.steer(x); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowLeft') this.steer(this.targetX - 34); else if (event.key === 'ArrowRight') this.steer(this.targetX + 34); }
}

class FrogJumpGame extends ArcadeSkillGame {
  private playerX = 132;
  private targetX = 333;
  private chargeMs = 0;
  private charging = false;
  private score = 0;
  private lives = 3;
  private attempts = 0;
  private hits = 0;

  create(): void { this.chrome('Mantén pulsado para cargar el salto y suelta para caer en la siguiente plataforma.'); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.attempts)); return; }
    if (this.charging) this.chargeMs = Math.min(1100, this.chargeMs + delta);
    this.draw();
  }

  private land(): void {
    const direction = Math.sign(this.targetX - this.playerX);
    const jumpDistance = this.chargeMs / 1100 * 240;
    const landingX = this.playerX + direction * jumpDistance;
    const accuracy = Phaser.Math.Clamp(1 - Math.abs(landingX - this.targetX) / 78, 0, 1);
    this.attempts += 1;
    if (accuracy >= 0.6) {
      this.hits += 1; this.score += Math.round(accuracy * 10); this.playerX = this.targetX;
      this.feedbackText.setText(accuracy > 0.9 ? '¡Aterrizaje perfecto! +10' : `¡Has caído en la plataforma! +${Math.round(accuracy * 10)}`);
      this.targetX = this.randomInt(105, 375);
    } else {
      this.lives -= 1; this.feedbackText.setText(`Te quedaste corto o te pasaste · ♥ ${this.lives}`);
      if (!this.lives) this.finish(this.score, this.hits / this.attempts);
    }
    this.chargeMs = 0; this.charging = false; this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Plataforma objetivo · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x72a379).fillRoundedRect(this.playerX - 43, 452, 86, 13, 6);
    this.graphics.fillStyle(0xe0ac4a).fillRoundedRect(this.targetX - 45, 360, 90, 15, 7);
    this.graphics.lineStyle(3, 0x9dc392).lineBetween(this.playerX, 410, this.targetX, 390);
    this.glyph('🐸', this.charging ? this.playerX : this.playerX, this.charging ? 408 - this.chargeMs / 18 : 416, 37);
    this.graphics.fillStyle(0xe5e0d5).fillRoundedRect(95, 487, 290, 18, 9);
    this.graphics.fillStyle(0x78a980).fillRoundedRect(95, 487, 290 * Phaser.Math.Clamp(this.chargeMs / 1100, 0, 1), 18, 9);
    this.glyph(this.charging ? 'SUELTA PARA SALTAR' : 'MANTÉN PARA CARGAR', 240, 517, 12, '#718176', 'DM Mono, monospace');
  }

  pointerDown(_x: number, _y: number): void { if (!this.charging) { this.charging = true; this.chargeMs = 0; } }
  pointerUp(_x: number, _y: number): void { if (this.charging) this.land(); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.chargeMs = Math.min(1100, this.chargeMs + 120);
    else if (event.key === 'ArrowLeft') this.chargeMs = Math.max(0, this.chargeMs - 120);
    else if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.charging = true; this.land(); }
  }
}

class GeckoWallGame extends ArcadeSkillGame {
  private wall: -1 | 1 = -1;
  private nextSpikes = 1;
  private remainingMs = 1100;
  private score = 0;
  private lives = 3;
  private successful = 0;
  private attempts = 0;

  create(): void { this.chrome('Salta de un muro al otro antes de que lleguen los pinchos. Cada salto te hace subir.'); this.nextSpikes = this.randomInt(0, 1) ? 1 : -1; this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.successful / Math.max(1, this.attempts)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) this.collision('No saltaste a tiempo.');
    this.draw();
  }

  private jump(): void {
    if (this.ended) return;
    this.attempts += 1;
    const destination = (this.wall * -1) as -1 | 1;
    if (destination === this.nextSpikes) {
      this.collision('¡Pinchos en ese muro!');
      return;
    }
    this.successful += 1; this.score += 10; this.wall = destination;
    this.feedbackText.setText('¡Salto seguro! +10 m'); this.remainingMs = Math.max(520, 1100 - this.score * 2); this.nextSpikes = this.randomInt(0, 1) ? 1 : -1;
  }

  private collision(message: string): void {
    this.lives -= 1; this.feedbackText.setText(`${message} · ♥ ${this.lives}`);
    if (!this.lives) { this.finish(this.score, this.successful / Math.max(1, this.attempts)); return; }
    this.wall = -this.wall as -1 | 1; this.remainingMs = Math.max(520, 1100 - this.score * 2); this.nextSpikes = this.randomInt(0, 1) ? 1 : -1;
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'm');
    this.promptText.setText(`Siguiente muro ${this.nextSpikes < 0 ? 'izquierdo' : 'derecho'} con pinchos · ♥ ${this.lives}`);
    const g = this.graphics;
    g.fillStyle(0xdde7d8).fillRoundedRect(94, 261, 56, 236, 13);
    g.fillStyle(0xdde7d8).fillRoundedRect(330, 261, 56, 236, 13);
    g.lineStyle(3, 0xa8b69f).lineBetween(150, 275, 150, 489); g.lineBetween(330, 275, 330, 489);
    for (let step = 0; step < 5; step += 1) {
      const y = 300 + step * 38;
      if (this.nextSpikes < 0) this.glyph('▲ ▲ ▲', 122, y, 14, '#df6950');
      else this.glyph('▲ ▲ ▲', 358, y, 14, '#df6950');
    }
    const playerX = this.wall < 0 ? 155 : 325;
    this.graphics.fillStyle(0x7fa56d).fillCircle(playerX, 425 - Math.min(55, this.score * 1.5), 19);
    this.glyph('🦎', playerX, 421 - Math.min(55, this.score * 1.5), 29);
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(95, 488, 290, 12, 6);
    this.graphics.fillStyle(0xe6b04a).fillRoundedRect(95, 488, 290 * Phaser.Math.Clamp(this.remainingMs / Math.max(1, 1100 - this.score * 2), 0, 1), 12, 6);
  }

  pointerDown(_x: number, y: number): void { if (y >= 240) this.jump(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.jump(); } }
}

class KangarooBounceGame extends ArcadeSkillGame {
  private playerX = 240;
  private platformX = 165;
  private remainingMs = 1550;
  private score = 0;
  private lives = 3;
  private hits = 0;
  private attempts = 0;

  create(): void { this.chrome('Muévete a izquierda y derecha para caer en cada plataforma que sube.'); this.newPlatform(); this.draw(); }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.hits / Math.max(1, this.attempts)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) {
      this.attempts += 1;
      if (Math.abs(this.playerX - this.platformX) <= 48) {
        this.score += 1; this.hits += 1; this.feedbackText.setText('¡Rebote! +1 plataforma'); this.newPlatform();
      } else {
        this.lives -= 1; this.feedbackText.setText(`Has caído entre plataformas · ♥ ${this.lives}`);
        if (!this.lives) { this.finish(this.score, this.hits / this.attempts); return; }
        this.newPlatform();
      }
    }
    this.draw();
  }

  private newPlatform(): void { this.platformX = this.randomInt(112, 368); this.remainingMs = Math.max(620, 1550 - this.score * 12); }
  private move(direction: -1 | 1): void { this.playerX = Phaser.Math.Clamp(this.playerX + direction * 44, 110, 370); this.draw(); }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'plataformas');
    this.promptText.setText(`Aterriza en la plataforma verde · ♥ ${this.lives}`);
    this.graphics.fillStyle(0x8bb486).fillRoundedRect(this.platformX - 42, 453, 84, 14, 7);
    this.graphics.fillStyle(0x8bb486, 0.35).fillRoundedRect(this.platformX - 42, 389, 84, 14, 7);
    this.graphics.fillStyle(0x8bb486, 0.2).fillRoundedRect(this.platformX - 42, 325, 84, 14, 7);
    this.graphics.fillStyle(0xe2ad4e).fillEllipse(this.playerX, 428, 40, 18);
    this.glyph('🦘', this.playerX, 407, 36);
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(95, 485, 290, 12, 6);
    this.graphics.fillStyle(0x75a47c).fillRoundedRect(95, 485, 290 * Phaser.Math.Clamp(this.remainingMs / Math.max(1, 1550 - this.score * 12), 0, 1), 12, 6);
    this.glyph('◀                         ▶', 240, 502, 16, '#718176', 'DM Mono, monospace');
  }

  pointerDown(x: number, _y: number): void { this.move(x < this.playerX ? -1 : 1); }
  keyDown(event: KeyboardEvent): void { if (event.key === 'ArrowLeft' || event.key === 'a') { event.preventDefault(); this.move(-1); } else if (event.key === 'ArrowRight' || event.key === 'd') { event.preventDefault(); this.move(1); } }
}
