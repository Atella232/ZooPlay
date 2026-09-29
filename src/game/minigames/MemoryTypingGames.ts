import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';

type Finish = (result: RunResult) => void;

export function createMemoryTypingGame(scene: Phaser.Scene, game: GameManifest, onFinish: Finish): DedicatedGame | undefined {
  const args: [Phaser.Scene, GameManifest, Finish] = [scene, game, onFinish];
  switch (game.id) {
    case 'trile-del-mapache': return new RaccoonShellGame(...args);
    case 'chimpance-memorion': return new ChimpNumberGame(...args);
    case 'elefante-memorioso': return new ElephantSequenceGame(...args);
    case 'cotorra-telefonista': return new ParrotPhoneGame(...args);
    case 'loro-dictado': return new ParrotDictationGame(...args);
    case 'piton-pi': return new PythonPiGame(...args);
    default: return undefined;
  }
}

abstract class MemoryTypingGame implements DedicatedGame {
  protected graphics!: Phaser.GameObjects.Graphics;
  protected scoreText!: Phaser.GameObjects.Text;
  protected timerText!: Phaser.GameObjects.Text;
  protected promptText!: Phaser.GameObjects.Text;
  protected feedbackText!: Phaser.GameObjects.Text;
  protected elapsedMs = 0;
  protected ended = false;
  private glyphs: Phaser.GameObjects.Text[] = [];
  private glyphCursor = 0;
  private randomSeed: number;

  constructor(protected scene: Phaser.Scene, protected game: GameManifest, protected onFinish: Finish) {
    this.randomSeed = (Date.now() ^ [...game.id].reduce((total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619), 2166136261)) >>> 0;
    if (!this.randomSeed) this.randomSeed = 1;
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
    let value = this.randomSeed;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.randomSeed = value >>> 0;
    return min + (this.randomSeed % (max - min + 1));
  }

  protected shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = this.randomInt(0, index);
      [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
  }

  protected glyphFrame(): void {
    this.glyphCursor = 0;
    this.glyphs.forEach((glyph) => glyph.setVisible(false));
  }

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

  protected keypad(digits: string[], topY: number, columns = 5): void {
    const startX = columns === 5 ? 88 : 126;
    const gapX = columns === 5 ? 76 : 76;
    const gapY = 65;
    digits.forEach((digit, index) => {
      const x = startX + (index % columns) * gapX;
      const y = topY + Math.floor(index / columns) * gapY;
      const color = [0xd96c50, 0xdfa943, 0x73a17d, 0x668eb2, 0x9278ae][index % 5];
      this.graphics.fillStyle(color).fillRoundedRect(x - 26, y - 25, 52, 50, 12);
      this.glyph(digit, x, y, 23, '#ffffff', 'DM Mono, monospace');
    });
  }

  protected keypadDigit(x: number, y: number, topY: number, columns = 5): string | undefined {
    const startX = columns === 5 ? 88 : 126;
    const gapX = 76;
    const row = Math.round((y - topY) / 65);
    const column = Math.round((x - startX) / gapX);
    if (row < 0 || column < 0 || column >= columns || Math.abs(y - (topY + row * 65)) > 27 || Math.abs(x - (startX + column * gapX)) > 29) return undefined;
    const index = row * columns + column;
    return index < 10 ? String((index + 1) % 10) : undefined;
  }

  create(): void {}
  update(_delta: number): void {}
  pointerDown(_x: number, _y: number): void {}
  pointerMove(_x: number, _y: number, _isDown: boolean): void {}
  pointerUp(_x: number, _y: number): void {}
  keyDown(_event: KeyboardEvent): void {}
}

class RaccoonShellGame extends MemoryTypingGame {
  private phase: 'reveal' | 'shuffle' | 'guess' = 'reveal';
  private phaseMs = 0;
  private ballCup = 1;
  private cupX = [110, 240, 370];
  private swapsLeft = 0;
  private pair?: [number, number];
  private level = 0;
  private guesses = 0;
  private correct = 0;
  private lives = 3;

  create(): void {
    this.chrome('Sigue la bola bajo uno de los tres vasos. Los vasos se mezclarán; toca el correcto.');
    this.startRound();
  }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.level, this.guesses ? this.correct / this.guesses : 0); return; }
    this.phaseMs += delta;
    if (this.phase === 'reveal' && this.phaseMs >= 1000) { this.phase = 'shuffle'; this.phaseMs = 0; this.choosePair(); }
    else if (this.phase === 'shuffle' && this.phaseMs >= 430) {
      if (this.pair) [this.cupX[this.pair[0]], this.cupX[this.pair[1]]] = [this.cupX[this.pair[1]], this.cupX[this.pair[0]]];
      this.swapsLeft -= 1;
      if (this.swapsLeft <= 0) { this.phase = 'guess'; this.phaseMs = 0; this.pair = undefined; }
      else { this.phaseMs = 0; this.choosePair(); }
    }
    this.draw();
  }

  private startRound(): void {
    this.phase = 'reveal'; this.phaseMs = 0; this.ballCup = this.randomInt(0, 2); this.cupX = [110, 240, 370];
    this.swapsLeft = 3 + Math.floor(this.level / 2); this.pair = undefined;
    this.draw();
  }

  private choosePair(): void {
    const first = this.randomInt(0, 2);
    let second = this.randomInt(0, 1);
    if (second >= first) second += 1;
    this.pair = [first, second];
  }

  private draw(): void {
    this.panel(); this.glyphFrame();
    const g = this.graphics;
    this.metric(this.level, 'niveles');
    this.promptText.setText(this.phase === 'reveal' ? '¡Memoriza dónde está la bola!' : this.phase === 'shuffle' ? 'Sigue el vaso que esconde la bola…' : '¿Bajo qué vaso quedó? Toca una posición.');
    const positions = [...this.cupX];
    if (this.phase === 'shuffle' && this.pair) {
      const progress = Phaser.Math.Clamp(this.phaseMs / 430, 0, 1);
      const [a, b] = this.pair;
      positions[a] = this.cupX[a] + (this.cupX[b] - this.cupX[a]) * progress;
      positions[b] = this.cupX[b] + (this.cupX[a] - this.cupX[b]) * progress;
    }
    for (let cup = 0; cup < 3; cup += 1) {
      const x = positions[cup];
      if (this.phase === 'reveal' && this.ballCup === cup) {
        g.fillStyle(0xf0c84e).fillCircle(x, 405, 15);
        this.glyph('●', x, 405, 24, '#d69d32');
      }
      g.fillStyle(0xc68b55).lineStyle(3, 0x815637).fillRoundedRect(x - 38, 320, 76, 82, 16).strokeRoundedRect(x - 38, 320, 76, 82, 16);
      g.fillStyle(0xe0ae70).fillEllipse(x, 321, 76, 25);
      this.glyph('◡', x, 365, 30, '#fff8e8');
    }
    this.glyph(`♥ ${this.lives}     Mezclas: ${Math.max(0, this.swapsLeft)}`, 240, 463, 17, '#718176', 'DM Mono, monospace');
  }

  private choose(x: number, y: number): void {
    if (this.ended || this.phase !== 'guess' || y < 280 || y > 440) return;
    const position = x < 167 ? 110 : x < 300 ? 240 : 370;
    const cup = this.cupX.findIndex((cupX) => cupX === position);
    this.guesses += 1;
    if (cup === this.ballCup) {
      this.correct += 1; this.level += 1;
      this.feedbackText.setText(`¡Lo encontraste! Nivel ${this.level}.`);
    } else {
      this.lives -= 1;
      this.feedbackText.setText(`Ese vaso estaba vacío. ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.level, this.correct / this.guesses); return; }
    }
    this.startRound();
  }

  pointerDown(x: number, y: number): void { this.choose(x, y); }
  keyDown(event: KeyboardEvent): void { if (['1', '2', '3'].includes(event.key)) this.choose([110, 240, 370][Number(event.key) - 1], 360); }
}

interface NumberTile { value: number; x: number; y: number; found: boolean; }

class ChimpNumberGame extends MemoryTypingGame {
  private phase: 'show' | 'recall' = 'show';
  private phaseMs = 0;
  private tiles: NumberTile[] = [];
  private size = 4;
  private next = 1;
  private score = 0;
  private lives = 3;
  private attempts = 0;
  private correct = 0;

  create(): void { this.chrome('Memoriza la cuadrícula; cuando los números desaparezcan, tócalos del 1 en adelante.'); this.newRound(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.attempts ? this.correct / this.attempts : 0); return; }
    if (this.phase === 'show') {
      this.phaseMs += delta;
      if (this.phaseMs >= Math.max(700, 1800 - this.size * 65)) { this.phase = 'recall'; this.phaseMs = 0; }
    }
    this.draw();
  }

  private newRound(): void {
    this.size = Math.min(12, 4 + this.score / 4);
    const slots = this.shuffle(Array.from({ length: 12 }, (_, index) => index));
    this.tiles = Array.from({ length: this.size }, (_, index) => {
      const slot = slots[index];
      return { value: index + 1, x: 105 + (slot % 4) * 90, y: 300 + Math.floor(slot / 4) * 68, found: false };
    });
    this.phase = 'show'; this.phaseMs = 0; this.next = 1;
  }

  private draw(): void {
    this.panel(); this.glyphFrame();
    this.metric(this.score, 'puntos');
    this.promptText.setText(this.phase === 'show' ? `Memoriza ${this.size} números…` : `Toca el ${this.next} · ♥ ${this.lives}`);
    for (const tile of this.tiles) {
      this.graphics.fillStyle(tile.found ? 0xdcebdc : this.phase === 'show' ? 0xf2ead8 : 0xf4f1e8).lineStyle(2, tile.found ? 0x73a17d : 0xded7c8).fillRoundedRect(tile.x - 31, tile.y - 26, 62, 52, 12).strokeRoundedRect(tile.x - 31, tile.y - 26, 62, 52, 12);
      if (this.phase === 'show') this.glyph(String(tile.value), tile.x, tile.y, 22, '#263d34', 'DM Mono, monospace');
      else if (tile.found) this.glyph('✓', tile.x, tile.y, 24, '#478054');
    }
  }

  private tap(x: number, y: number): void {
    if (this.ended || this.phase !== 'recall') return;
    const tile = this.tiles.find((candidate) => Math.abs(candidate.x - x) <= 33 && Math.abs(candidate.y - y) <= 28);
    if (!tile || tile.found) return;
    this.attempts += 1;
    if (tile.value === this.next) {
      this.correct += 1; tile.found = true; this.next += 1;
      if (this.next > this.size) { this.score += this.size; this.feedbackText.setText(`¡Completado! +${this.size} puntos.`); this.newRound(); }
    } else {
      this.lives -= 1; this.feedbackText.setText(`Ese no era. Busca el ${this.next} · ♥ ${this.lives}`);
      if (!this.lives) this.finish(this.score, this.correct / this.attempts);
    }
    this.draw();
  }

  pointerDown(x: number, y: number): void { this.tap(x, y); }
}

const DIRECTIONS = [
  { symbol: '↑', dx: 0, dy: -1, x: 240, y: 360 },
  { symbol: '→', dx: 1, dy: 0, x: 330, y: 423 },
  { symbol: '↓', dx: 0, dy: 1, x: 240, y: 450 },
  { symbol: '←', dx: -1, dy: 0, x: 150, y: 423 },
];

class ElephantSequenceGame extends MemoryTypingGame {
  private phase: 'show' | 'input' = 'show';
  private sequence: number[] = [];
  private cursor = 0;
  private phaseMs = 0;
  private level = 2;
  private score = 0;
  private lives = 3;
  private correct = 0;
  private attempts = 0;

  create(): void { this.chrome('Observa las flechas y repítelas con las flechas del teclado o la cruceta.'); this.newRound(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.attempts ? this.correct / this.attempts : 0); return; }
    if (this.phase === 'show') {
      this.phaseMs += delta;
      if (this.phaseMs >= 580) {
        this.phaseMs = 0; this.cursor += 1;
        if (this.cursor >= this.sequence.length) { this.cursor = 0; this.phase = 'input'; }
      }
    }
    this.draw();
  }

  private newRound(): void {
    this.sequence = Array.from({ length: this.level }, () => this.randomInt(0, 3));
    this.cursor = 0; this.phaseMs = 0; this.phase = 'show';
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(this.phase === 'show' ? `Ronda ${this.level - 1} · observa la secuencia` : `Ronda ${this.level - 1} · repite las ${this.level} flechas · ♥ ${this.lives}`);
    const active = this.phase === 'show' ? this.sequence[this.cursor] : -1;
    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      const direction = DIRECTIONS[index];
      const selected = index === active;
      this.graphics.fillStyle(selected ? 0xe4b957 : 0xffffff).lineStyle(2, selected ? 0xc89336 : 0xded9ca).fillCircle(direction.x, direction.y, 36).strokeCircle(direction.x, direction.y, 36);
      this.glyph(direction.symbol, direction.x, direction.y, 34, '#30483b');
    }
    this.glyph(this.phase === 'show' ? 'MEMORIZA' : `Flecha ${this.cursor + 1} de ${this.sequence.length}`, 240, 493, 16, '#718176', 'DM Mono, monospace');
  }

  private choose(direction: number): void {
    if (this.ended || this.phase !== 'input') return;
    this.attempts += 1;
    if (direction === this.sequence[this.cursor]) {
      this.correct += 1; this.cursor += 1;
      if (this.cursor === this.sequence.length) {
        this.score += this.sequence.length; this.level = Math.min(13, this.level + 1);
        this.feedbackText.setText('¡Secuencia correcta! La siguiente será más larga.'); this.newRound();
      }
    } else {
      this.lives -= 1; this.feedbackText.setText(`Flecha incorrecta. Repítela · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.score, this.correct / this.attempts); return; }
      this.cursor = 0; this.phase = 'show'; this.phaseMs = 0;
    }
    this.draw();
  }

  pointerDown(x: number, y: number): void {
    const index = DIRECTIONS.findIndex((direction) => Math.hypot(direction.x - x, direction.y - y) <= 43);
    if (index >= 0) this.choose(index);
  }

  keyDown(event: KeyboardEvent): void {
    const index = ({ ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 } as Record<string, number>)[event.key];
    if (index !== undefined) { event.preventDefault(); this.choose(index); }
  }
}

abstract class DigitKeypadGame extends MemoryTypingGame {
  protected keypadTop = 390;

  protected drawKeys(): void { this.keypad(['1','2','3','4','5','6','7','8','9','0'], this.keypadTop); }

  protected pointerDigit(x: number, y: number): string | undefined {
    if (y < this.keypadTop - 27 || y > this.keypadTop + 65 + 27) return undefined;
    return this.keypadDigit(x, y, this.keypadTop);
  }

  protected handleDigitKey(event: KeyboardEvent, onDigit: (digit: string) => void): void {
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); onDigit(event.key); }
  }
}

class ParrotPhoneGame extends DigitKeypadGame {
  private digits = '';
  private phase: 'show' | 'input' = 'show';
  private revealMs = 0;
  private entered = 0;
  private mistakes = 0;
  private penaltyMs = 0;
  protected keypadTop = 389;

  create(): void {
    this.chrome('Memoriza el teléfono de ocho cifras; después márcalo con el teclado de colores.');
    this.digits = Array.from({ length: 8 }, () => this.randomInt(0, 9)).join('');
    this.draw();
  }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish((this.elapsedMs + this.penaltyMs) / 1000, this.entered / Math.max(1, this.entered + this.mistakes)); return; }
    if (this.phase === 'show') {
      this.revealMs += delta;
      if (this.revealMs >= 1900) { this.phase = 'input'; this.promptText.setText('Marca el número que memorizaste.'); }
    }
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame();
    this.metric((this.elapsedMs + this.penaltyMs) / 1000, 's');
    const spaces = Array.from({ length: 8 }, (_, index) => index < this.entered ? '●' : '·').join(' ');
    this.glyph(this.phase === 'show' ? this.digits : spaces, 240, 314, this.phase === 'show' ? 36 : 30, '#263d34', 'DM Mono, monospace');
    this.glyph(this.phase === 'show' ? 'MEMORIZA' : `${this.entered} / 8`, 240, 351, 14, '#718176', 'DM Mono, monospace');
    this.drawKeys();
  }

  private press(digit: string): void {
    if (this.ended || this.phase !== 'input') return;
    if (digit === this.digits[this.entered]) {
      this.entered += 1;
      if (this.entered === 8) this.finish((this.elapsedMs + this.penaltyMs) / 1000, this.entered / (this.entered + this.mistakes));
    } else {
      this.mistakes += 1; this.penaltyMs += 350;
      this.feedbackText.setText('Esa cifra no va ahí. Prueba otra vez.');
    }
    this.draw();
  }

  pointerDown(x: number, y: number): void { const digit = this.pointerDigit(x, y); if (digit) this.press(digit); }
  keyDown(event: KeyboardEvent): void { this.handleDigitKey(event, (digit) => this.press(digit)); }
}

class ParrotDictationGame extends DigitKeypadGame {
  private digit = 0;
  private life = 3;
  private score = 0;
  private windowMs = 1800;
  private remainingMs = this.windowMs;
  private correct = 0;
  private errors = 0;
  protected keypadTop = 404;

  create(): void { this.chrome('Teclea cada cifra antes de que desaparezca. Cada acierto suma; tienes tres vidas.'); this.nextDigit(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.correct / Math.max(1, this.correct + this.errors)); return; }
    this.remainingMs -= delta;
    if (this.remainingMs <= 0) {
      this.errors += 1; this.life -= 1; this.feedbackText.setText(`La cifra desapareció · ♥ ${this.life}`);
      if (!this.life) { this.finish(this.score, this.correct / Math.max(1, this.correct + this.errors)); return; }
      this.nextDigit();
    }
    this.draw();
  }

  private nextDigit(): void { this.digit = this.randomInt(0, 9); this.remainingMs = this.windowMs; }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'puntos');
    this.promptText.setText(`Teclea antes de que acabe la barra · ♥ ${this.life}`);
    this.glyph(String(this.digit), 240, 321, 55, '#263d34', 'DM Mono, monospace');
    this.graphics.fillStyle(0xe6e0d3).fillRoundedRect(96, 367, 288, 12, 6);
    this.graphics.fillStyle(0x75a37c).fillRoundedRect(96, 367, 288 * Phaser.Math.Clamp(this.remainingMs / this.windowMs, 0, 1), 12, 6);
    this.keypadTop = 403; this.drawKeys();
  }

  private press(digit: string): void {
    if (this.ended) return;
    if (digit === String(this.digit)) {
      this.score += 1; this.correct += 1; this.feedbackText.setText('+1'); this.windowMs = Math.max(750, this.windowMs - 20);
    } else {
      this.errors += 1; this.life -= 1; this.feedbackText.setText(`Cifra incorrecta · ♥ ${this.life}`);
      if (!this.life) { this.finish(this.score, this.correct / Math.max(1, this.correct + this.errors)); return; }
    }
    this.nextDigit(); this.draw();
  }

  pointerDown(x: number, y: number): void { const digit = this.pointerDigit(x, y); if (digit) this.press(digit); }
  keyDown(event: KeyboardEvent): void { this.handleDigitKey(event, (digit) => this.press(digit)); }
}

const PI_DECIMALS = '1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679';

class PythonPiGame extends DigitKeypadGame {
  private index = 0;
  private best = 0;
  private lives = 3;
  private errors = 0;
  protected keypadTop = 389;

  create(): void { this.chrome('Escribe los decimales de π en orden. Un error reinicia la secuencia; tienes tres vidas.'); this.draw(); }

  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.best, this.best / Math.max(1, this.best + this.errors)); return; }
    this.draw();
  }

  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.best, 'dígitos');
    this.promptText.setText(`Continúa π · ♥ ${this.lives}`);
    const typed = PI_DECIMALS.slice(Math.max(0, this.index - 8), this.index);
    this.glyph(`3,${typed.padEnd(Math.min(8, this.index + 1), '·')}`, 240, 313, 31, '#263d34', 'DM Mono, monospace');
    this.glyph(`${this.index} dígitos correctos consecutivos`, 240, 350, 14, '#718176', 'DM Mono, monospace');
    this.keypadTop = 389; this.drawKeys();
  }

  private press(digit: string): void {
    if (this.ended) return;
    if (digit === PI_DECIMALS[this.index]) {
      this.index += 1; this.best = Math.max(this.best, this.index);
      if (this.index >= PI_DECIMALS.length) { this.finish(this.best, 1); return; }
    } else {
      this.errors += 1; this.lives -= 1; this.index = 0;
      this.feedbackText.setText(`Cifra incorrecta: π empieza de nuevo · ♥ ${this.lives}`);
      if (!this.lives) { this.finish(this.best, this.best / Math.max(1, this.best + this.errors)); return; }
    }
    this.draw();
  }

  pointerDown(x: number, y: number): void { const digit = this.pointerDigit(x, y); if (digit) this.press(digit); }
  keyDown(event: KeyboardEvent): void { this.handleDigitKey(event, (digit) => this.press(digit)); }
}
