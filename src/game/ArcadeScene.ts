import Phaser from 'phaser';
import type { GameManifest, Mechanic } from '../data/games';

export interface RunResult {
  score: number;
  elapsedMs: number;
  accuracy: number;
}

interface SceneData {
  game: GameManifest;
  onFinish: (result: RunResult) => void;
}

const COLORS = ['#ef6942', '#f1b64c', '#61a58b', '#709bd0', '#bd84bb'];
const DARK = '#213b32';
const CONTROL_KEYS: Record<string, number> = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 };

export class ArcadeScene extends Phaser.Scene {
  private manifest!: GameManifest;
  private onFinish!: SceneData['onFinish'];
  private elapsedMs = 0;
  private timeLeftMs = 60_000;
  private score = 0;
  private actions = 0;
  private hits = 0;
  private misses = 0;
  private ended = false;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private markerX = 240;
  private targetX = 240;
  private targetY = 320;
  private playerX = 240;
  private playerY = 390;
  private answer = 0;
  private sequence: number[] = [];
  private sequenceIndex = 0;
  private typingText = '';
  private typingIndex = 0;
  private promptText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private mascotText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private drawing!: Phaser.GameObjects.Graphics;
  private randomState = 1;

  constructor() {
    super('arcade-run');
  }

  init(data: SceneData): void {
    this.manifest = data.game;
    this.onFinish = data.onFinish;
    this.elapsedMs = 0;
    this.timeLeftMs = Math.max(15, data.game.durationSec) * 1000;
    this.score = 0;
    this.actions = 0;
    this.hits = 0;
    this.misses = 0;
    this.ended = false;
    this.dragging = false;
    this.answer = 0;
    this.sequenceIndex = 0;
    this.typingIndex = 0;
    this.typingText = data.game.id === 'piton-pi' ? '1415926535' : '583104';
    this.randomState = [...data.game.id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 941);
    this.random(0, COLORS.length - 1);
    this.sequence = Array.from({ length: 7 }, () => this.random(0, 3));
  }

  create(): void {
    this.targetX = 240;
    this.targetY = 325;
    this.playerX = 240;
    this.playerY = 440;
    this.drawing = this.add.graphics();
    this.add.rectangle(240, 360, 480, 720, 0xf7f4e9);
    this.add.circle(45, 128, 80, 0xf2dfbc, 0.48);
    this.add.circle(442, 478, 112, 0xdce9d9, 0.48);
    this.add.text(28, 27, 'ZOOPLAY  /  RETO DIARIO', { fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#718176', letterSpacing: 1.4 });
    this.add.text(28, 55, this.manifest.name, { fontFamily: 'DM Sans, sans-serif', fontSize: '28px', fontStyle: 'bold', color: DARK, wordWrap: { width: 395 } });
    this.scoreText = this.add.text(28, 105, `${this.manifest.metric}: 0`, { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: DARK });
    this.timeText = this.add.text(450, 105, this.formatTime(this.timeLeftMs), { fontFamily: 'DM Mono, monospace', fontSize: '14px', color: DARK }).setOrigin(1, 0);
    this.promptText = this.add.text(240, 155, '', { fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontStyle: 'bold', color: DARK, align: 'center', wordWrap: { width: 400 }, lineSpacing: 5 }).setOrigin(0.5);
    this.feedbackText = this.add.text(240, 515, '', { fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ee6942', align: 'center' }).setOrigin(0.5);
    this.mascotText = this.add.text(240, 415, this.manifest.emoji, { fontFamily: 'sans-serif', fontSize: '48px' }).setOrigin(0.5);
    this.targetText = this.add.text(this.targetX, this.targetY, this.targetGlyph(), { fontFamily: 'sans-serif', fontSize: '58px' }).setOrigin(0.5);
    this.drawButtons();
    this.setPrompt();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer.x, pointer.y));
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer.x, pointer.y));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleKey(event));
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.timeLeftMs = Math.max(0, this.manifest.durationSec * 1000 - this.elapsedMs);
    this.timeText.setText(this.formatTime(this.timeLeftMs));
    this.targetX = 240 + Math.sin(this.elapsedMs / 400) * 128;
    this.markerX = 240 + Math.sin(this.elapsedMs / 245) * 152;
    this.targetText.setPosition(this.targetX, this.targetY);
    this.scoreText.setText(`${this.manifest.metric}: ${this.displayCurrentScore()}`);
    this.drawMechanic();
    if (this.manifest.mechanic === 'balance') this.score = Math.max(this.score, Math.floor(this.elapsedMs / 1000));
    if (this.manifest.mechanic === 'flap') {
      this.playerY += delta * 0.018;
      if (this.playerY > 490) this.finish();
    }
    if (this.manifest.mechanic === 'dodge' || this.manifest.mechanic === 'race' || this.manifest.mechanic === 'swerve') {
      this.playerY = 425 + Math.sin(this.elapsedMs / 320) * 24;
    }
    if (this.timeLeftMs <= 0) this.finish();
  }

  private drawButtons(): void {
    if (this.usesDirections()) {
      const positions = [80, 186, 294, 400];
      const labels = ['←', '↑', '→', '↓'];
      for (let i = 0; i < positions.length; i += 1) {
        const x = positions[i];
        this.add.circle(x, 633, 34, 0xffffff).setStrokeStyle(2, 0xe7e1d2);
        this.add.text(x, 633, labels[i], { fontFamily: 'DM Sans, sans-serif', fontSize: '25px', color: DARK }).setOrigin(0.5);
      }
    }
    if (this.manifest.mechanic === 'typing') {
      for (let digit = 0; digit < 10; digit += 1) {
        const x = 56 + (digit % 5) * 92;
        const y = digit < 5 ? 570 : 632;
        this.add.rectangle(x, y, 60, 43, 0xffffff).setStrokeStyle(2, 0xe7e1d2);
        this.add.text(x, y, String(digit), { fontFamily: 'DM Mono, monospace', fontSize: '18px', color: DARK }).setOrigin(0.5);
      }
    }
    const labels2 = this.manifest.mechanic === 'count' ? ['−', '+', 'OK'] : ['TOCA', 'APUNTA', 'MUEVE'];
    if (this.manifest.mechanic === 'count') {
      [130, 240, 350].forEach((x, index) => {
        this.add.rectangle(x, 570, 86, 42, 0xffffff).setStrokeStyle(2, 0xe7e1d2);
        this.add.text(x, 570, labels2[index], { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontStyle: 'bold', color: DARK }).setOrigin(0.5);
      });
    }
  }

  private setPrompt(): void {
    const prompts: Record<Mechanic, string> = {
      target: 'Toca el objetivo antes de que desaparezca.',
      dodge: 'Muévete con las flechas y esquiva los obstáculos.',
      timing: 'Toca cuando la marca esté centrada.',
      balance: 'Mantén la barra cerca del centro.',
      sequence: 'Memoriza la secuencia y repítela con las flechas.',
      count: 'Cuenta los objetos y confirma con OK.',
      color: 'Elige el color que más se parece al modelo.',
      typing: 'Teclea la secuencia que aparece.',
      maze: 'Llega a la meta con las flechas.',
      race: 'Guía tu animal por la pista; usa las flechas.',
      aim: 'Apunta al objetivo y toca para lanzar.',
      stack: 'Toca para soltar el bloque sobre la torre.',
      sort: 'Clasifica cada objeto en el contenedor correcto.',
      tiles: 'Toca las casillas objetivo.',
      rhythm: 'Toca cuando el pulso llegue al centro.',
      sokoban: 'Mueve las cajas hasta las metas.',
      flap: 'Toca para aletear y mantenerte en el aire.',
      swing: 'Mantén para engancharte y suelta en el momento justo.',
      catch: 'Toca la pelota para mantenerla en el aire.',
      swerve: 'Cambia de dirección en las curvas.',
      bingo: 'Marca los números del cartón cuando aparezcan.',
      basket: 'Toca para encestar.',
      draw: 'Arrastra el dedo para trazar la línea.',
    };
    this.promptText.setText(prompts[this.manifest.mechanic]);
  }

  private drawMechanic(): void {
    const g = this.drawing;
    g.clear();
    const mechanic = this.manifest.mechanic;
    if (mechanic === 'timing' || mechanic === 'rhythm') {
      g.fillStyle(0xe8e2d3).fillRoundedRect(70, 290, 340, 24, 12);
      g.fillStyle(0xeed294).fillRoundedRect(212, 290, 56, 24, 12);
      g.fillStyle(0x263d34).fillCircle(this.markerX, 302, 13);
    } else if (mechanic === 'balance') {
      const drift = Math.sin(this.elapsedMs / 480) * 96 + Math.cos(this.elapsedMs / 210) * 42;
      const ballX = Phaser.Math.Clamp(240 + drift + (this.playerX - 240) * 0.58, 80, 400);
      g.lineStyle(8, 0xe8e2d3).lineBetween(82, 345, 398, 345);
      g.lineStyle(8, 0x63a88d).lineBetween(208, 345, 272, 345);
      g.fillStyle(0xee6942).fillCircle(ballX, 345, 18);
      if (Math.abs(ballX - 240) > 154) this.finish();
    } else if (mechanic === 'maze' || mechanic === 'sokoban') {
      g.lineStyle(3, 0xd7d1c1);
      for (let i = 0; i < 6; i += 1) {
        g.lineBetween(112 + i * 52, 276, 112 + i * 52, 446);
        g.lineBetween(112, 276 + i * 34, 372, 276 + i * 34);
      }
      const x = 130 + (this.actions % 5) * 48;
      const y = 294 + (Math.floor(this.actions / 5) % 4) * 30;
      g.fillStyle(0x61a58b).fillRoundedRect(x, y, 24, 24, 7);
      g.fillStyle(0xecc568).fillRoundedRect(328, 412, 24, 24, 7);
    } else if (mechanic === 'stack') {
      g.fillStyle(0x61a58b).fillRoundedRect(175, 380, 130, 42, 10);
      g.fillStyle(0xeec568).fillRoundedRect(175 + Math.sin(this.elapsedMs / 300) * 55, 334 - (this.actions % 6) * 24, 128, 38, 10);
    } else if (mechanic === 'color') {
      const swatches = [0xe76e53, 0xe7bb51, 0x76aa82];
      g.fillStyle(swatches[this.actions % 3]).fillRoundedRect(200, 280, 80, 70, 15);
      swatches.forEach((color, i) => g.fillStyle(color).fillRoundedRect(105 + i * 100, 385, 70, 54, 12));
    } else if (mechanic === 'sort' || mechanic === 'bingo') {
      [0xef6942, 0xf1b64c, 0x61a58b, 0x709bd0].forEach((color, i) => {
        g.fillStyle(color, 0.85).fillRoundedRect(82 + i * 82, 400, 62, 60, 13);
      });
    } else if (mechanic === 'race' || mechanic === 'dodge' || mechanic === 'swerve' || mechanic === 'flap') {
      g.fillStyle(0xe8e2d3).fillRoundedRect(92, 257, 296, 230, 75);
      g.lineStyle(4, 0xffffff).lineBetween(240, 275, 240, 474);
      g.lineStyle(4, 0xffffff).lineBetween(167, 275, 167, 474);
      g.lineStyle(4, 0xffffff).lineBetween(313, 275, 313, 474);
      this.mascotText.setPosition(this.playerX, this.playerY);
    } else if (mechanic === 'sequence') {
      const shown = this.elapsedMs < 2200 ? this.sequence.slice(0, 4) : [];
      const arrows = ['←', '↑', '→', '↓'];
      shown.forEach((_direction, index) => {
        g.fillStyle(index === this.sequenceIndex && this.elapsedMs >= 2200 ? 0xef6942 : 0xdde9df)
          .fillRoundedRect(84 + index * 76, 300, 60, 60, 14);
      });
      this.promptText.setText(this.elapsedMs < 2200
        ? `Memoriza: ${this.sequence.slice(0, 4).map((direction) => arrows[direction]).join('  ')}`
        : `Repite ${arrows[this.sequence[this.sequenceIndex] ?? 0]}`);
    } else if (mechanic === 'typing') {
      const shown = this.typingText.slice(this.typingIndex, this.typingIndex + 4).split('').join(' ');
      this.targetText.setText(shown || '✓').setPosition(240, 330);
    } else if (mechanic === 'count') {
      const visible = this.elapsedMs % 3600 < 1500;
      this.targetText.setVisible(visible).setText('● '.repeat(3 + (this.randomState % 6))).setPosition(240, 330);
      if (!visible) this.promptText.setText('¿Cuántos objetos has visto?');
    } else if (mechanic === 'draw') {
      g.lineStyle(8, 0x61a58b).lineBetween(135, 380, 235, 290);
      g.lineStyle(8, 0xf1b64c).lineBetween(235, 290, 345, 380);
      g.fillStyle(0xee6942).fillCircle(135, 380, 13);
      g.fillStyle(0x709bd0).fillCircle(345, 380, 13);
    } else if (mechanic === 'aim' || mechanic === 'basket') {
      g.lineStyle(5, 0xf1b64c).strokeCircle(this.targetX, 330, 38);
      g.lineStyle(3, 0xef6942).strokeCircle(this.targetX, 330, 20);
    } else if (mechanic === 'swing') {
      g.lineStyle(5, 0xd7d1c1).lineBetween(112, 280, 240, 365);
      g.lineStyle(5, 0x61a58b).lineBetween(240, 365, 365, 280);
      g.fillStyle(0xee6942).fillCircle(this.targetX, this.dragging ? 365 : 330, 20);
    } else {
      g.fillStyle(0xe8e2d3, 0.9).fillRoundedRect(94, 260, 292, 220, 26);
    }
  }

  private handlePointerDown(x: number, y: number): void {
    if (this.ended) return;
    this.dragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    if (this.manifest.mechanic === 'typing' && y >= 545) {
      const column = Math.max(0, Math.min(4, Math.floor(x / 96)));
      const row = y < 601 ? 0 : 1;
      this.typeDigit(String(row * 5 + column));
      return;
    }
    if (this.manifest.mechanic === 'count' && y >= 545 && y < 595) {
      const index = Math.max(0, Math.min(2, Math.round((x - 130) / 110)));
      if (index === 0) this.answer = Math.max(0, this.answer - 1);
      else if (index === 1) this.answer += 1;
      else this.submitAnswer();
      this.feedbackText.setText(`Tu respuesta: ${this.answer}`);
      return;
    }
    if (y >= 590 && this.usesDirections()) {
      const index = Math.max(0, Math.min(3, Math.round((x - 80) / 106)));
      this.action(index);
      return;
    }
    if (y >= 590) return;
    const mechanic = this.manifest.mechanic;
    if (mechanic === 'balance') {
      this.playerX = x;
      this.hits += 1;
    } else if (mechanic === 'timing' || mechanic === 'rhythm') {
      const error = Math.abs(x - this.markerX) / 160;
      this.recordTiming(Math.max(0, 1 - error));
    } else if (mechanic === 'aim' || mechanic === 'basket') {
      const error = Math.abs(x - this.targetX) / 165;
      this.recordHit(error < 0.25);
    } else if (mechanic === 'stack') {
      const error = Math.abs(x - (240 + Math.sin(this.elapsedMs / 300) * 55)) / 100;
      this.recordHit(error < 0.55);
    } else if (mechanic === 'color') {
      const index = Math.max(0, Math.min(2, Math.floor((x - 100) / 100)));
      this.recordHit(index === (this.actions % 3));
    } else if (mechanic === 'sort' || mechanic === 'bingo') {
      const index = Math.max(0, Math.min(3, Math.floor((x - 80) / 82)));
      this.recordHit(index === (this.actions % 4));
    } else if (mechanic === 'count') {
      if (x < 180) this.answer = Math.max(0, this.answer - 1);
      else if (x > 300) this.answer += 1;
      else this.submitAnswer();
      this.feedbackText.setText(`Tu respuesta: ${this.answer}`);
    } else if (mechanic === 'typing') {
      const digit = String(Math.max(0, Math.min(9, Math.floor(x / 48))));
      this.typeDigit(digit);
    } else if (mechanic === 'draw') {
      this.feedbackText.setText('Sigue la línea hasta el otro extremo');
    } else if (mechanic === 'catch' || mechanic === 'target' || mechanic === 'tiles') {
      const hit = Math.hypot(x - this.targetX, y - this.targetY) < 92;
      this.recordHit(hit);
    } else if (mechanic === 'swing') {
      this.feedbackText.setText('¡Enganchado! Suelta al llegar al centro');
    } else if (mechanic === 'maze' || mechanic === 'sokoban') {
      this.action(Math.floor(x / 120) % 4);
    } else if (mechanic === 'dodge' || mechanic === 'race' || mechanic === 'swerve' || mechanic === 'flap') {
      if (mechanic === 'flap') this.playerY = Math.max(280, this.playerY - 55);
      else this.action(Math.floor(x / 120) % 4);
      this.recordHit(true);
    } else {
      this.action(0);
    }
  }

  private handlePointerUp(x: number, y: number): void {
    if (!this.dragging || this.ended) return;
    this.dragging = false;
    if (this.manifest.mechanic === 'draw') {
      const distance = Math.hypot(x - this.dragStartX, y - this.dragStartY);
      this.recordHit(distance > 100 && Math.abs((x - this.dragStartX) - (y - this.dragStartY)) < 180);
    } else if (this.manifest.mechanic === 'swing') {
      const alignment = 1 - Math.abs(this.targetX - 240) / 140;
      this.recordTiming(Math.max(0, alignment));
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.ended) return;
    if (event.key in CONTROL_KEYS) {
      this.action(CONTROL_KEYS[event.key]);
      if (this.manifest.mechanic === 'flap') this.playerY = Math.max(280, this.playerY - 55);
    } else if (/^\d$/.test(event.key)) this.typeDigit(event.key);
    else if (event.key === 'Enter') this.submitAnswer();
    else if (event.key === ' ' && this.manifest.mechanic === 'flap') this.playerY = Math.max(280, this.playerY - 55);
  }

  private action(direction: number): void {
    if (this.ended) return;
    const mechanic = this.manifest.mechanic;
    if (mechanic === 'sequence') {
      if (this.elapsedMs < 2200) return;
      if (direction === this.sequence[this.sequenceIndex]) {
        this.sequenceIndex += 1;
        this.score += 1;
        this.hits += 1;
        if (this.sequenceIndex >= 4) this.completeRound();
      } else this.misses += 1;
      return;
    }
    if (mechanic === 'maze' || mechanic === 'sokoban') {
      this.actions += 1;
      this.score += 1;
      this.hits += 1;
      this.playerX = Phaser.Math.Clamp(this.playerX + (direction === 2 ? 40 : direction === 0 ? -40 : 0), 120, 360);
      this.playerY = Phaser.Math.Clamp(this.playerY + (direction === 3 ? 28 : direction === 1 ? -28 : 0), 290, 440);
      if (this.actions >= (mechanic === 'maze' ? 12 : 15)) this.finish();
      return;
    }
    if (mechanic === 'race' || mechanic === 'dodge' || mechanic === 'swerve') {
      const desiredLane = direction;
      const safeLane = (Math.floor(this.elapsedMs / 1600) + 1) % 4;
      this.actions += 1;
      if (desiredLane === safeLane || direction === 1 || direction === 3) {
        this.hits += 1;
        this.score += 1;
        this.playerX = 100 + safeLane * 93;
        if (this.actions >= 8) this.finish();
      } else this.misses += 1;
      return;
    }
    if (mechanic === 'sort') {
      this.recordHit(direction === this.actions % 4);
      return;
    }
    if (mechanic === 'stack' || mechanic === 'tiles' || mechanic === 'target' || mechanic === 'bingo' || mechanic === 'basket' || mechanic === 'aim' || mechanic === 'rhythm') {
      this.recordHit(direction === (this.actions % 4));
      return;
    }
    this.recordHit(true);
  }

  private recordHit(hit: boolean): void {
    this.actions += 1;
    if (hit) {
      this.hits += 1;
      this.score += 1;
      this.feedbackText.setText(['¡Bien!', '¡Perfecto!', '¡Sigue así!'][this.random(0, 2)]);
      if (this.actions >= this.goal()) this.completeRound();
    } else {
      this.misses += 1;
      this.score = Math.max(0, this.score - 1);
      this.feedbackText.setText('Casi. Prueba otra vez');
    }
  }

  private recordTiming(accuracy: number): void {
    this.actions += 1;
    this.hits += accuracy >= 0.65 ? 1 : 0;
    this.misses += accuracy < 0.65 ? 1 : 0;
    if (accuracy >= 0.65) this.score += 1;
    this.feedbackText.setText(accuracy > 0.9 ? '¡Perfecto!' : accuracy > 0.65 ? '¡Buen toque!' : 'Un poco tarde');
    if (this.actions >= 5) this.finish();
  }

  private submitAnswer(): void {
    const expected = 3 + (this.randomState % 6);
    const correct = this.answer === expected;
    this.recordHit(correct);
    this.answer = 0;
    this.feedbackText.setText(correct ? '¡Lo has contado bien!' : `Era ${expected}`);
  }

  private typeDigit(digit: string): void {
    if (this.typingText[this.typingIndex] === digit) {
      this.typingIndex += 1;
      this.hits += 1;
      this.score += 1;
      if (this.typingIndex >= Math.min(7, this.typingText.length)) this.finish();
    } else {
      this.misses += 1;
      this.feedbackText.setText('Ese dígito no toca todavía');
    }
  }

  private completeRound(): void {
    this.actions = 0;
    this.sequenceIndex = 0;
    this.answer = 0;
    if (this.manifest.mechanic === 'sequence') this.sequence = Array.from({ length: Math.min(7, 4 + Math.floor(this.score / 4)) }, () => this.random(0, 3));
    if (this.score >= this.goal() || this.manifest.metric.includes('Tiempo')) this.finish();
    else this.feedbackText.setText('¡Nivel superado! Sigue');
  }

  private goal(): number {
    if (this.manifest.mechanic === 'stack') return 8;
    if (this.manifest.mechanic === 'rhythm' || this.manifest.mechanic === 'sequence') return 8;
    if (this.manifest.mechanic === 'sort' || this.manifest.mechanic === 'tiles' || this.manifest.mechanic === 'bingo') return 10;
    if (this.manifest.mechanic === 'maze') return 12;
    if (this.manifest.mechanic === 'sokoban') return 15;
    return 5;
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    const elapsedMs = Math.max(1, Math.round(this.elapsedMs));
    const accuracy = this.actions ? this.hits / (this.hits + this.misses || 1) : 1;
    let score: number;
    if (this.manifest.metric === 'Desviación') score = Math.max(0.01, (1 - accuracy) * 0.8 + 0.02);
    else if (this.manifest.direction === 'lower') score = Math.max(0.1, elapsedMs / 1000);
    else if (this.manifest.unit === '%') score = Math.round(accuracy * 10000) / 100;
    else if (this.manifest.unit === 'm') score = Math.round(this.score * 1.8 * 10) / 10;
    else if (this.manifest.unit === 's') score = Math.round((elapsedMs / 1000) * 100) / 100;
    else score = Math.max(1, this.score);
    this.onFinish({ score, elapsedMs, accuracy });
  }

  private displayCurrentScore(): string {
    if (this.manifest.metric === 'Desviación') return `${Math.max(0.01, (1 - this.hits / Math.max(1, this.actions)) * 0.8).toFixed(2)} s`;
    return this.manifest.direction === 'lower' ? `${(this.elapsedMs / 1000).toFixed(1)} s` : String(this.score);
  }

  private targetGlyph(): string {
    if (this.manifest.mechanic === 'basket') return '🏀';
    if (this.manifest.mechanic === 'aim') return '🎯';
    if (this.manifest.mechanic === 'catch') return '⚽';
    if (this.manifest.mechanic === 'target' || this.manifest.mechanic === 'tiles') return '✨';
    return this.manifest.emoji;
  }

  private formatTime(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  private random(min: number, max: number): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return min + (this.randomState % (max - min + 1));
  }

  private usesDirections(): boolean {
    return ['dodge', 'maze', 'race', 'sequence', 'sokoban', 'sort', 'swerve'].includes(this.manifest.mechanic);
  }
}
