import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';

export interface DedicatedGame {
  create(): void;
  update(delta: number): void;
  pointerDown(x: number, y: number): void;
  pointerMove(x: number, y: number, isDown: boolean): void;
  pointerUp(x: number, y: number): void;
  keyDown(event: KeyboardEvent): void;
}

type Finish = (result: RunResult) => void;

function drawDirectionPad(graphics: Phaser.GameObjects.Graphics): void {
  const positions: [number, number, number, number][] = [
    [154, 632, -1, 0], [240, 602, 0, -1], [240, 663, 0, 1], [326, 632, 1, 0],
  ];
  for (const [x, y, dx, dy] of positions) {
    graphics.fillStyle(0xffffff).lineStyle(2, 0xded9ca).fillCircle(x, y, 22).strokeCircle(x, y, 22);
    graphics.lineStyle(3, 0x30483b).lineBetween(x - dx * 8, y - dy * 8, x + dx * 8, y + dy * 8);
    graphics.lineBetween(x + dx * 8, y + dy * 8, x + dx * 2 - dy * 5, y + dy * 2 + dx * 5);
    graphics.lineBetween(x + dx * 8, y + dy * 8, x + dx * 2 + dy * 5, y + dy * 2 - dx * 5);
  }
}

export function createVerticalSliceGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'gorrion-aleteador': return new SparrowGame(...args);
    case 'erizo-cruzacalles': return new HedgehogGame(...args);
    case 'ojo-de-halcon': return new HawkGame(...args);
    case 'raton-de-laberinto': return new MouseMazeGame(...args);
    case 'panal-de-la-abeja': return new BeePatternGame(...args);
    case 'pulpo-camuflaje': return new OctopusColorGame(...args);
    default: return undefined;
  }
}

abstract class MiniGame implements DedicatedGame {
  protected graphics!: Phaser.GameObjects.Graphics;
  protected scoreText!: Phaser.GameObjects.Text;
  protected timerText!: Phaser.GameObjects.Text;
  protected promptText!: Phaser.GameObjects.Text;
  protected feedbackText!: Phaser.GameObjects.Text;
  protected elapsedMs = 0;
  protected ended = false;

  constructor(protected scene: Phaser.Scene, protected game: GameManifest, protected onFinish: Finish) {}

  protected chrome(instructions: string): void {
    this.scene.add.rectangle(240, 360, 480, 720, 0xf7f4e9);
    this.scene.add.circle(50, 205, 92, 0xf2dfbc, 0.42);
    this.scene.add.circle(440, 490, 120, 0xdce9d9, 0.48);
    this.scene.add.text(28, 26, 'ZOOPLAY  /  PARTIDA', { fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#718176', letterSpacing: 1.4 });
    this.scene.add.text(28, 53, this.game.name, { fontFamily: 'DM Sans, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#213b32', wordWrap: { width: 395 } });
    this.scoreText = this.scene.add.text(28, 105, `${this.game.metric}: 0`, { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#213b32' });
    this.timerText = this.scene.add.text(452, 105, this.timeLabel(this.game.durationSec * 1000), { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#213b32' }).setOrigin(1, 0);
    this.promptText = this.scene.add.text(240, 164, instructions, { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#334f40', align: 'center', wordWrap: { width: 400 }, lineSpacing: 5 }).setOrigin(0.5);
    this.feedbackText = this.scene.add.text(240, 544, '', { fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#e26843', align: 'center', wordWrap: { width: 390 } }).setOrigin(0.5);
    this.graphics = this.scene.add.graphics();
    this.scene.add.rectangle(240, 633, 414, 92, 0xf0ede2, 0.86).setStrokeStyle(1, 0xe7e1d2);
  }

  protected tick(delta: number): boolean {
    if (this.ended) return true;
    this.elapsedMs += delta;
    const remaining = Math.max(0, this.game.durationSec * 1000 - this.elapsedMs);
    this.timerText.setText(this.timeLabel(remaining));
    return remaining <= 0;
  }

  protected scoreLabel(value: number, unit = this.game.unit): void {
    const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: value < 1 ? 3 : 1 }).format(value);
    this.scoreText.setText(`${this.game.metric}: ${formatted} ${unit}`.trim());
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

interface Pipe { x: number; gapY: number; passed: boolean; }

class SparrowGame extends MiniGame {
  private birdY = 374;
  private birdVelocity = 0;
  private birdX = 132;
  private points = 0;
  private pipes: Pipe[] = [];
  private bird!: Phaser.GameObjects.Text;
  private started = false;

  create(): void {
    this.chrome('Toca o pulsa espacio para aletear. Pasa por el centro de cada hueco.');
    this.started = false;
    this.pipes = [
      { x: 390, gapY: 350, passed: false },
      { x: 660, gapY: 415, passed: false },
      { x: 930, gapY: 305, passed: false },
    ];
    this.bird = this.scene.add.text(this.birdX, this.birdY, '🐦', { fontFamily: 'sans-serif', fontSize: '43px' }).setOrigin(0.5);
    this.drawWorld();
  }

  update(delta: number): void {
    if (this.ended) return;
    if (!this.started) { this.drawWorld(); return; }
    const expired = this.tick(delta);
    const dt = delta / 1000;
    this.birdVelocity += 920 * dt;
    this.birdY += this.birdVelocity * dt;
    const speed = 176 + this.points * 9;
    for (const pipe of this.pipes) {
      pipe.x -= speed * dt;
      if (!pipe.passed && pipe.x + 66 < this.birdX) {
        pipe.passed = true;
        this.points += 1;
        this.scoreLabel(this.points, 'puntos');
        if (this.points >= 15) { this.finish(this.points, 1); return; }
      }
      const inX = this.birdX + 15 > pipe.x && this.birdX - 15 < pipe.x + 66;
      const hitGap = this.birdY - 15 < pipe.gapY - 83 || this.birdY + 15 > pipe.gapY + 83;
      if (inX && hitGap) { this.finish(this.points, this.points ? 1 : 0); return; }
    }
    this.pipes = this.pipes.filter((pipe) => pipe.x > -80);
    const lastX = Math.max(...this.pipes.map((pipe) => pipe.x), 0);
    if (this.pipes.length < 4) this.pipes.push({ x: lastX + 270, gapY: Phaser.Math.Between(300, 430), passed: false });
    this.bird.setPosition(this.birdX, this.birdY).setRotation(Phaser.Math.Clamp(this.birdVelocity / 950, -0.45, 0.75));
    this.drawWorld();
    if (this.birdY < 226 || this.birdY > 500 || expired) this.finish(this.points, this.points ? 1 : 0);
  }

  private drawWorld(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xdceaf0).fillRoundedRect(48, 229, 384, 288, 22);
    g.fillStyle(0xf8f4e9).fillRect(55, 488, 370, 20);
    for (const pipe of this.pipes) {
      const topEnd = pipe.gapY - 83;
      const lowerStart = pipe.gapY + 83;
      g.fillStyle(0x64a27a).fillRoundedRect(pipe.x, 238, 60, Math.max(0, topEnd - 238), 7);
      g.fillStyle(0x4d8764).fillRoundedRect(pipe.x - 5, topEnd - 14, 70, 18, 5);
      g.fillStyle(0x64a27a).fillRoundedRect(pipe.x, lowerStart, 60, Math.max(0, 505 - lowerStart), 7);
      g.fillStyle(0x4d8764).fillRoundedRect(pipe.x - 5, lowerStart - 4, 70, 18, 5);
    }
    g.fillStyle(0xe6bc58).fillRect(53, 505, 374, 12);
    this.scoreLabel(this.points, 'puntos');
  }

  private flap(): void { if (!this.ended) { this.started = true; this.birdVelocity = -325; } }
  pointerDown(): void { this.flap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'ArrowUp') { event.preventDefault(); this.flap(); } }
}

interface Car { x: number; lane: number; speed: number; direction: number; }

class HedgehogGame extends MiniGame {
  private col = 2;
  private row = 6;
  private points = 0;
  private lives = 3;
  private collisionCooldown = 0;
  private dragStart?: { x: number; y: number };
  private cars: Car[] = Array.from({ length: 10 }, (_, index) => ({
    x: 70 + (index % 5) * 88,
    lane: Math.floor(index / 2),
    speed: 85 + (index % 3) * 28,
    direction: index % 2 ? -1 : 1,
  }));

  create(): void {
    this.chrome('Cruza cinco carriles de tráfico. Desliza o usa las flechas; tienes tres vidas.');
    this.drawWorld();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    const dt = delta / 1000;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - delta);
    for (const car of this.cars) {
      car.x += car.speed * car.direction * dt;
      if (car.direction > 0 && car.x > 445) car.x = 35;
      if (car.direction < 0 && car.x < 35) car.x = 445;
      if (this.collisionCooldown <= 0 && this.row === car.lane + 1 && Math.abs(80 + this.col * 80 - car.x) < 30) this.hitCar();
    }
    this.drawWorld();
    if (expired) this.finish(this.points, this.points ? 1 : 0);
  }

  private drawWorld(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x91b77a).fillRoundedRect(56, 260, 368, 254, 18);
    for (let lane = 0; lane < 5; lane += 1) {
      const y = 284 + lane * 40;
      g.fillStyle(lane % 2 ? 0x51575a : 0x5c6263).fillRect(60, y, 360, 38);
      g.lineStyle(2, 0xe8ddac, 0.72);
      for (let mark = 0; mark < 8; mark += 1) g.lineBetween(68 + mark * 48, y + 19, 91 + mark * 48, y + 19);
    }
    for (const car of this.cars) {
      const y = 288 + car.lane * 40;
      const fill = car.direction > 0 ? 0xe46f4e : 0x6c9fbc;
      g.fillStyle(fill).fillRoundedRect(car.x - 24, y, 48, 30, 8);
      g.fillStyle(0xdcebf0).fillRoundedRect(car.x - 12, y + 4, 20, 10, 3);
      g.fillStyle(0x283332).fillCircle(car.x - 13, y + 28, 4).fillCircle(car.x + 14, y + 28, 4);
    }
    const px = 80 + this.col * 80;
    const py = 263 + this.row * 40;
    g.fillStyle(0xe4b95b).fillCircle(px, py, 17);
    g.fillStyle(0x334938).fillCircle(px - 6, py - 3, 2).fillCircle(px + 6, py - 3, 2);
    g.fillStyle(0x6c926b).fillCircle(px + 16, py - 12, 5).fillCircle(px + 22, py - 16, 4);
    drawDirectionPad(g);
    this.scoreLabel(this.points, `puntos · ♥ ${this.lives}`);
  }

  private hitCar(): void {
    this.lives -= 1;
    this.collisionCooldown = 1000;
    this.col = 2;
    this.row = 6;
    this.feedbackText.setText(this.lives ? `¡Cuidado con el coche! Te quedan ${this.lives} vidas.` : '¡Se acabaron las vidas!');
    if (!this.lives) this.finish(this.points, this.points ? 0.7 : 0);
  }

  private move(dx: number, dy: number): void {
    if (this.ended) return;
    const oldRow = this.row;
    this.col = Phaser.Math.Clamp(this.col + dx, 0, 4);
    this.row = Phaser.Math.Clamp(this.row + dy, 0, 6);
    if (this.row < oldRow) {
      this.points += 1;
      if (this.row === 0) {
        this.points += 5;
        this.row = 6;
        this.col = 2;
        this.feedbackText.setText('¡Cruzaste la carretera! Vuelve a intentarlo.');
      }
    }
    this.drawWorld();
  }

  pointerDown(x: number, y: number): void {
    if (y > 575) {
      if (x < 195 && y > 612) this.move(-1, 0);
      else if (x > 285 && y > 612) this.move(1, 0);
      else if (x >= 195 && x <= 285 && y < 633) this.move(0, -1);
      else if (x >= 195 && x <= 285 && y >= 633) this.move(0, 1);
      return;
    }
    this.dragStart = { x, y };
  }

  pointerUp(x: number, y: number): void {
    if (!this.dragStart) return;
    const dx = x - this.dragStart.x;
    const dy = y - this.dragStart.y;
    this.dragStart = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1, 0);
    else this.move(0, dy > 0 ? 1 : -1);
  }

  keyDown(event: KeyboardEvent): void {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = moves[event.key];
    if (move) { event.preventDefault(); this.move(move[0], move[1]); }
  }
}

class HawkGame extends MiniGame {
  private hits = 0;
  private accuracySum = 0;
  private markerX = 80;
  private samples: number[] = [];

  create(): void {
    this.chrome('Toca cinco veces cuando la aguja esté en el centro verde.');
    this.promptText.setY(194);
    this.drawTrack();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.markerX = 240 + Math.sin(this.elapsedMs / 355) * 151;
    this.drawTrack();
    if (expired) this.completeRound();
  }

  private drawTrack(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xe9e3d5).fillRoundedRect(61, 302, 358, 30, 14);
    g.fillStyle(0x79b08a).fillRoundedRect(219, 298, 42, 38, 13);
    g.fillStyle(0x263d34).fillCircle(this.markerX, 317, 14);
    for (let i = 0; i < 5; i += 1) {
      g.fillStyle(i < this.hits ? 0xe56c46 : 0xffffff).fillCircle(171 + i * 34, 398, 10);
      g.lineStyle(2, 0xdfd9cb).strokeCircle(171 + i * 34, 398, 10);
    }
    if (this.samples.length) {
      this.samples.forEach((sample, index) => {
        const height = Math.max(4, sample * 90);
        g.fillStyle(sample > 0.8 ? 0x67a17b : 0xe0b558).fillRoundedRect(126 + index * 55, 483 - height, 32, height, 6);
      });
    }
    this.scoreLabel(this.hits ? Math.round(this.accuracySum / this.hits * 100) : 0, '%');
    this.promptText.setText(this.hits < 5 ? `Toque ${this.hits + 1} de 5 · apunta al centro verde` : '¡Cinco toques completados!');
  }

  pointerDown(_x: number, y: number): void {
    if (this.ended || y < 240 || y > 510) return;
    const accuracy = Phaser.Math.Clamp(1 - Math.abs(this.markerX - 240) / 150, 0, 1);
    this.hits += 1;
    this.accuracySum += accuracy;
    this.samples.push(accuracy);
    this.feedbackText.setText(accuracy > 0.92 ? '¡Centro perfecto!' : accuracy > 0.7 ? '¡Buen toque!' : 'Prueba más cerca del centro.');
    this.drawTrack();
    if (this.hits >= 5) this.completeRound();
  }

  private completeRound(): void {
    const accuracy = this.hits ? this.accuracySum / this.hits : 0;
    this.finish(Math.round(accuracy * 100), accuracy);
  }

  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') this.pointerDown(240, 320); }
}

const MAZE = [
  '##########',
  '#S....#..#',
  '#.#.#.#G.#',
  '#.#.#....#',
  '#.#.##.#G#',
  '#...H..#.#',
  '#G..#H...#',
  '##########',
];

class MouseMazeGame extends MiniGame {
  private col = 1;
  private row = 1;
  private goals = 3;
  private lives = 3;
  private dragStart?: { x: number; y: number };
  private map = MAZE.map((line) => [...line]);

  create(): void {
    this.chrome('Llega a las tres metas. Los agujeros te devuelven al inicio; evita perder tus tres vidas.');
    this.drawMaze();
  }

  update(delta: number): void {
    if (this.ended) return;
    if (this.tick(delta)) this.finish(this.elapsedMs / 1000, this.goals === 0 ? 1 : (3 - this.goals) / 3);
  }

  private drawMaze(): void {
    const g = this.graphics;
    g.clear();
    const originX = 60; const originY = 239; const cell = 36;
    for (let row = 0; row < this.map.length; row += 1) {
      for (let col = 0; col < this.map[row].length; col += 1) {
        const x = originX + col * cell; const y = originY + row * cell; const tile = this.map[row][col];
        g.fillStyle(tile === '#' ? 0x738576 : 0xf1eddf).fillRoundedRect(x + 1, y + 1, cell - 2, cell - 2, 5);
        if (tile === 'G') {
          g.fillStyle(0xe9bd59).fillCircle(x + 18, y + 18, 11);
          g.lineStyle(2, 0xfff5d5).strokeCircle(x + 18, y + 18, 11);
        } else if (tile === 'H') {
          g.fillStyle(0x25362e).fillCircle(x + 18, y + 18, 12);
          g.fillStyle(0x111c18).fillCircle(x + 18, y + 18, 7);
        } else if (tile === 'S') {
          g.fillStyle(0xc4dac2).fillCircle(x + 18, y + 18, 12);
        }
      }
    }
    const px = originX + this.col * cell + 18; const py = originY + this.row * cell + 18;
    g.fillStyle(0xdf8855).fillCircle(px, py, 12);
    g.fillStyle(0xffffff).fillCircle(px + 4, py - 4, 3);
    g.fillStyle(0x25362e).fillCircle(px + 5, py - 4, 1.5);
    drawDirectionPad(g);
    this.scoreLabel(this.elapsedMs / 1000, `s · metas ${3 - this.goals}/3 · ♥ ${this.lives}`);
  }

  private move(dx: number, dy: number): void {
    if (this.ended) return;
    const col = this.col + dx; const row = this.row + dy;
    if (row < 0 || row >= this.map.length || col < 0 || col >= this.map[row].length || this.map[row][col] === '#') return;
    const tile = this.map[row][col];
    this.col = col; this.row = row;
    if (tile === 'H') {
      this.lives -= 1;
      this.col = 1; this.row = 1;
      this.feedbackText.setText(this.lives ? `¡Agujero! Te quedan ${this.lives} vidas.` : '¡Se acabaron las vidas!');
      if (!this.lives) { this.finish(this.elapsedMs / 1000, (3 - this.goals) / 3); return; }
    } else if (tile === 'G') {
      this.goals -= 1;
      this.map[row][col] = '.';
      this.feedbackText.setText(this.goals ? `¡Meta encontrada! Quedan ${this.goals}.` : '¡Encontraste las tres metas!');
      if (!this.goals) { this.drawMaze(); this.finish(this.elapsedMs / 1000, 1); return; }
    }
    this.drawMaze();
  }

  pointerDown(x: number, y: number): void {
    if (y > 575) {
      if (x < 195 && y > 612) this.move(-1, 0);
      else if (x > 285 && y > 612) this.move(1, 0);
      else if (x >= 195 && x <= 285 && y < 633) this.move(0, -1);
      else if (x >= 195 && x <= 285 && y >= 633) this.move(0, 1);
      return;
    }
    this.dragStart = { x, y };
  }

  pointerUp(x: number, y: number): void {
    if (!this.dragStart) return;
    const dx = x - this.dragStart.x; const dy = y - this.dragStart.y;
    this.dragStart = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1, 0);
    else this.move(0, dy > 0 ? 1 : -1);
  }

  keyDown(event: KeyboardEvent): void {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = moves[event.key];
    if (move) { event.preventDefault(); this.move(move[0], move[1]); }
  }
}

class BeePatternGame extends MiniGame {
  private sequence: number[] = [];
  private inputIndex = 0;
  private level = 1;
  private lives = 3;
  private phase: 'show' | 'input' = 'show';
  private phaseTimer = 0;
  private flashIndex = -1;
  private flashOn = false;

  create(): void {
    this.chrome('Memoriza las celdas iluminadas y repítelas en el mismo orden. Cada nivel añade una más.');
    this.nextLevel();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    if (this.phase === 'show') {
      this.phaseTimer -= delta;
      if (this.phaseTimer <= 0) {
        this.flashOn = !this.flashOn;
        if (this.flashOn) {
          this.flashIndex += 1;
          if (this.flashIndex >= this.sequence.length) {
            this.phase = 'input';
            this.flashIndex = -1;
            this.feedbackText.setText('Tu turno: repite el patrón.');
          }
        }
        this.phaseTimer = this.flashOn ? 410 : 170;
      }
      this.drawGrid();
    }
    if (expired) this.finish(this.level - 1, this.lives / 3);
  }

  private nextLevel(): void {
    this.sequence = Array.from({ length: Math.min(10, this.level + 2) }, () => Phaser.Math.Between(0, 8));
    this.inputIndex = 0;
    this.flashIndex = -1;
    this.flashOn = false;
    this.phase = 'show';
    this.phaseTimer = 500;
    this.feedbackText.setText(`Nivel ${this.level}: observa el patrón.`);
    this.drawGrid();
  }

  private drawGrid(): void {
    const g = this.graphics;
    g.clear();
    for (let index = 0; index < 9; index += 1) {
      const col = index % 3; const row = Math.floor(index / 3);
      const x = 103 + col * 137; const y = 285 + row * 86;
      const isLit = this.phase === 'show' && this.flashIndex === index && this.flashOn;
      const isDone = this.phase === 'input' && index === this.sequence[this.inputIndex - 1];
      g.fillStyle(isLit ? 0xf0c254 : isDone ? 0x9ac493 : 0xfffdf5).lineStyle(3, isLit ? 0xe2a73e : 0xdedbce);
      g.fillRoundedRect(x - 48, y - 33, 96, 66, 20).strokeRoundedRect(x - 48, y - 33, 96, 66, 20);
      g.fillStyle(isLit ? 0xfff7dc : 0x94b28b).fillCircle(x, y, isLit ? 15 : 10);
    }
    g.fillStyle(0xe9e1ca).fillRoundedRect(142, 493, 196, 25, 12);
    g.fillStyle(0x65a47c).fillRoundedRect(142, 493, 196 * Math.max(0, this.lives / 3), 25, 12);
    this.scoreLabel(this.level - 1, `niveles · ♥ ${this.lives}`);
    this.promptText.setText(this.phase === 'show' ? `Nivel ${this.level} · ${this.sequence.length} celdas` : `Tu turno · ${this.inputIndex + 1} de ${this.sequence.length}`);
  }

  pointerDown(x: number, y: number): void {
    if (this.ended || this.phase !== 'input' || y < 250 || y > 520 || x < 55 || x > 425) return;
    const col = Phaser.Math.Clamp(Math.floor((x - 55) / 123.33), 0, 2);
    const row = Phaser.Math.Clamp(Math.floor((y - 252) / 86), 0, 2);
    this.choose(row * 3 + col);
  }

  private choose(index: number): void {
    if (index !== this.sequence[this.inputIndex]) {
      this.lives -= 1;
      this.feedbackText.setText(this.lives ? 'No era esa. Observa el patrón otra vez.' : '¡Se acabaron las vidas!');
      if (!this.lives) { this.finish(this.level - 1, 0); return; }
      this.phase = 'show';
      this.inputIndex = 0;
      this.flashIndex = -1;
      this.flashOn = false;
      this.phaseTimer = 450;
      this.drawGrid();
      return;
    }
    this.inputIndex += 1;
    if (this.inputIndex >= this.sequence.length) {
      this.level += 1;
      this.feedbackText.setText('¡Patrón correcto!');
      if (this.level > 8) { this.finish(8, this.lives / 3); return; }
      this.nextLevel();
    } else this.drawGrid();
  }

  keyDown(event: KeyboardEvent): void {
    if (/^[1-9]$/.test(event.key)) this.choose(Number(event.key) - 1);
  }
}

interface Hsv { h: number; s: number; v: number; }

class OctopusColorGame extends MiniGame {
  private target: Hsv = { h: 0, s: 0, v: 0 };
  private guess: Hsv = { h: 180, s: 55, v: 58 };
  private round = 0;
  private scoreSum = 0;
  private phase: 'preview' | 'mix' = 'preview';
  private previewMs = 1900;
  private draggingSlider = -1;
  private selectedSlider = 0;
  private boardLabels: Phaser.GameObjects.Text[] = [];

  create(): void {
    this.chrome('Recuerda la muestra y ajusta tono, saturación y brillo. Compara tres colores.');
    this.newRound();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    if (this.phase === 'preview') {
      this.previewMs -= delta;
      if (this.previewMs <= 0) {
        this.phase = 'mix';
        this.feedbackText.setText('Ajusta los controles para imitar el color.');
        this.drawColorBoard();
      }
    }
    if (expired) this.finish(this.round ? Math.round(this.scoreSum / this.round) : 0, this.round ? this.scoreSum / this.round / 100 : 0);
  }

  private newRound(): void {
    this.target = { h: Phaser.Math.Between(0, 359), s: Phaser.Math.Between(35, 100), v: Phaser.Math.Between(35, 100) };
    this.guess = { h: Phaser.Math.Between(0, 359), s: Phaser.Math.Between(25, 80), v: Phaser.Math.Between(25, 80) };
    this.selectedSlider = 0;
    this.draggingSlider = -1;
    this.phase = 'preview';
    this.previewMs = 1900;
    this.drawColorBoard();
  }

  private drawColorBoard(): void {
    this.boardLabels.forEach((label) => label.destroy());
    this.boardLabels = [];
    const g = this.graphics;
    g.clear();
    const targetColor = this.hsv(this.target);
    const guessedColor = this.hsv(this.guess);
    g.fillStyle(0xfffdf6).lineStyle(2, 0xe4dfd2);
    g.fillRoundedRect(74, 258, 150, 110, 14).strokeRoundedRect(74, 258, 150, 110, 14);
    g.fillStyle(this.phase === 'preview' ? targetColor : 0xddd9cd).fillRoundedRect(88, 274, 122, 72, 10);
    g.fillStyle(0xfffdf6).lineStyle(2, 0xe4dfd2);
    g.fillRoundedRect(256, 258, 150, 110, 14).strokeRoundedRect(256, 258, 150, 110, 14);
    g.fillStyle(guessedColor).fillRoundedRect(270, 274, 122, 72, 10);
    this.boardLabels.push(this.scene.add.text(149, 353, this.phase === 'preview' ? 'MEMORIZA' : 'MUESTRA OCULTA', { fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#6b7c6e' }).setOrigin(0.5).setDepth(4));
    this.boardLabels.push(this.scene.add.text(331, 353, 'TU COLOR', { fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#6b7c6e' }).setOrigin(0.5).setDepth(4));
    const labels = ['Tono', 'Saturación', 'Brillo'];
    const values = [this.guess.h, this.guess.s, this.guess.v];
    const maxValues = [359, 100, 100];
    for (let index = 0; index < 3; index += 1) {
      const y = 411 + index * 49;
      this.boardLabels.push(this.scene.add.text(80, y - 16, labels[index], { fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#334f40' }).setDepth(4));
      this.boardLabels.push(this.scene.add.text(400, y - 16, index === 0 ? `${values[index]}°` : `${values[index]}%`, { fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#547664' }).setOrigin(1, 0).setDepth(4));
      g.fillStyle(0xe9e3d5).fillRoundedRect(80, y, 320, 8, 4);
      const pct = values[index] / maxValues[index];
      g.fillStyle(index === 0 ? this.hsv({ h: values[index], s: 85, v: 82 }) : 0x67a27a).fillRoundedRect(80, y, 320 * pct, 8, 4);
      g.fillStyle(index === this.selectedSlider ? 0xe46c45 : 0x3e7056).fillCircle(80 + 320 * pct, y + 4, 9);
    }
    g.fillStyle(0x507f62).fillRoundedRect(141, 570, 198, 43, 13);
    this.boardLabels.push(this.scene.add.text(240, 580, this.phase === 'preview' ? 'OBSERVA EL COLOR…' : 'COMPARAR', { fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(4));
    this.promptText.setText(this.phase === 'preview' ? `Color ${this.round + 1} de 3 · memorízalo` : `Color ${this.round + 1} de 3 · ajusta y compara`);
    this.scoreLabel(this.round ? Math.round(this.scoreSum / this.round) : 0, '%');
  }

  private hsv(color: Hsv): number {
    const h = ((color.h % 360) + 360) % 360 / 60;
    const s = Phaser.Math.Clamp(color.s / 100, 0, 1);
    const v = Phaser.Math.Clamp(color.v / 100, 0, 1);
    const c = v * s;
    const x = c * (1 - Math.abs(h % 2 - 1));
    const m = v - c;
    let rgb: [number, number, number];
    if (h < 1) rgb = [c, x, 0];
    else if (h < 2) rgb = [x, c, 0];
    else if (h < 3) rgb = [0, c, x];
    else if (h < 4) rgb = [0, x, c];
    else if (h < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return Phaser.Display.Color.GetColor(...rgb.map((value) => Math.round((value + m) * 255)) as [number, number, number]);
  }

  private adjustSlider(index: number, x: number): void {
    const pct = Phaser.Math.Clamp((x - 80) / 320, 0, 1);
    if (index === 0) this.guess.h = Math.round(pct * 359);
    else if (index === 1) this.guess.s = Math.round(pct * 100);
    else this.guess.v = Math.round(pct * 100);
    this.selectedSlider = index;
    this.drawColorBoard();
  }

  private compare(): void {
    if (this.phase !== 'mix' || this.ended) return;
    const hueDistance = Math.min(Math.abs(this.target.h - this.guess.h), 360 - Math.abs(this.target.h - this.guess.h)) / 180;
    const error = hueDistance * 0.5 + Math.abs(this.target.s - this.guess.s) / 100 * 0.25 + Math.abs(this.target.v - this.guess.v) / 100 * 0.25;
    const score = Math.round(Math.max(0, 1 - error) * 100);
    this.scoreSum += score;
    this.round += 1;
    this.feedbackText.setText(`Parecido: ${score} %. ${this.round < 3 ? 'Siguiente color…' : '¡Ronda completada!'}`);
    if (this.round >= 3) { this.finish(Math.round(this.scoreSum / 3), this.scoreSum / 300); return; }
    this.newRound();
  }

  pointerDown(x: number, y: number): void {
    if (this.phase === 'preview') return;
    if (y >= 393 && y <= 538) {
      const index = Phaser.Math.Clamp(Math.floor((y - 393) / 49), 0, 2);
      this.draggingSlider = index;
      this.adjustSlider(index, x);
    } else if (y >= 555 && y <= 622) this.compare();
  }

  pointerMove(x: number, _y: number, isDown: boolean): void {
    if (isDown && this.draggingSlider >= 0 && this.phase === 'mix') this.adjustSlider(this.draggingSlider, x);
  }

  pointerUp(): void { this.draggingSlider = -1; }

  keyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { this.compare(); return; }
    if (event.key === 'ArrowUp') this.selectedSlider = Math.max(0, this.selectedSlider - 1);
    else if (event.key === 'ArrowDown') this.selectedSlider = Math.min(2, this.selectedSlider + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const amount = event.key === 'ArrowRight' ? 5 : -5;
      if (this.selectedSlider === 0) this.guess.h = Phaser.Math.Clamp(this.guess.h + amount, 0, 359);
      else if (this.selectedSlider === 1) this.guess.s = Phaser.Math.Clamp(this.guess.s + amount, 0, 100);
      else this.guess.v = Phaser.Math.Clamp(this.guess.v + amount, 0, 100);
      this.drawColorBoard();
    } else return;
    event.preventDefault();
    this.drawColorBoard();
  }
}
