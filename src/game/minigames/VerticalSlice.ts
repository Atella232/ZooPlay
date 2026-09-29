import Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import { createMemoryTypingGame } from './MemoryTypingGames';

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
    case 'trile-del-mapache':
    case 'chimpance-memorion':
    case 'elefante-memorioso':
    case 'cotorra-telefonista':
    case 'loro-dictado':
    case 'piton-pi': return createMemoryTypingGame(...args);
    case 'gorrion-aleteador': return new SparrowGame(...args);
    case 'erizo-cruzacalles': return new HedgehogGame(...args);
    case 'ojo-de-halcon': return new HawkGame(...args);
    case 'raton-de-laberinto': return new MouseMazeGame(...args);
    case 'panal-de-la-abeja': return new BeePatternGame(...args);
    case 'pulpo-camuflaje': return new OctopusColorGame(...args);
    case 'gallo-puntual': return new RoosterClockGame(...args);
    case 'marmota-cronometro': return new MarmotClockGame(...args);
    case 'sepia-reflejos': return new CuttlefishReflexGame(...args);
    case 'paloma-mensajera': return new PigeonMailGame(...args);
    case 'grillo-ritmico': return new CricketRhythmGame(...args);
    case 'puas-de-puercoespin':
    case 'castor-lanzador': return new RotatingPinGame(...args);
    case 'lobo-lunar': return new WolfLauncherGame(...args);
    case 'nutria-lanzadora': return new OtterLauncherGame(...args);
    case 'rinoceronte-rompemuros': return new RhinoBreakoutGame(...args);
    case 'topo-golfista':
    case 'topo-golfista-2':
    case 'suricatas-del-minigolf': return new MiniGolfGame(...args);
    case 'ardilla-contadora': return new SquirrelNumberGridGame(...args);
    case 'buho-calculador': return new OwlMathGame(...args);
    case 'zorro-de-los-dados': return new FoxDiceGame(...args);
    case 'cuervo-contacajas': return new CrowCountGame(...args);
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
  private glyphs: Phaser.GameObjects.Text[] = [];
  private glyphCursor = 0;

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

  protected beginGlyphFrame(): void {
    this.glyphCursor = 0;
    this.glyphs.forEach((glyph) => glyph.setVisible(false));
  }

  protected glyphText(text: string, x: number, y: number, size: number, color: string, fontFamily = 'DM Sans, sans-serif'): void {
    let glyph = this.glyphs[this.glyphCursor];
    if (!glyph) {
      glyph = this.scene.add.text(-100, -100, '', { fontFamily, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5).setDepth(4);
      this.glyphs.push(glyph);
    }
    glyph.setText(text).setPosition(x, y).setStyle({ fontFamily, fontSize: `${size}px`, color, align: 'center' }).setVisible(true);
    this.glyphCursor += 1;
  }

  protected finish(score: number, accuracy: number): void {
    if (this.ended) return;
    this.ended = true;
    this.feedbackText.setText('¡Partida terminada!');
    this.onFinish({ score: Math.max(0, score), elapsedMs: Math.max(1, Math.round(this.elapsedMs)), accuracy: Phaser.Math.Clamp(accuracy, 0, 1) });
  }

  protected finishTime(accuracy: number): void { this.finish(Math.max(0.01, this.elapsedMs / 1000), accuracy); }

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

class RoosterClockGame extends MiniGame {
  private round = 1;
  private roundMs = 0;
  private deviations: number[] = [];
  private targetMs = 7000;

  create(): void {
    this.chrome('Detén el reloj cuando marque 7,00 segundos. Son cinco rondas.');
    this.promptText.setY(198);
    this.drawClock();
  }

  update(delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.roundMs += delta;
    this.timerText.setText(this.timeLabel(Math.max(0, this.game.durationSec * 1000 - this.elapsedMs)));
    this.drawClock();
    if (this.roundMs >= 9000) this.stopRound();
    if (this.elapsedMs >= this.game.durationSec * 1000) this.complete();
  }

  private drawClock(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xf1eee4).fillRoundedRect(74, 277, 332, 173, 24);
    const progress = Phaser.Math.Clamp(this.roundMs / 9000, 0, 1);
    g.fillStyle(0xe3ded1).fillRoundedRect(96, 408, 288, 17, 9);
    g.fillStyle(this.roundMs >= this.targetMs ? 0x71a67f : 0xe4b957).fillRoundedRect(96, 408, 288 * progress, 17, 9);
    const shown = (this.roundMs / 1000).toFixed(2);
    this.promptText.setText(`Ronda ${this.round} de 5 · objetivo 7,00 s`);
    this.scoreLabel(this.deviations.length ? this.deviations.reduce((a, b) => a + b, 0) / this.deviations.length : 0, 's de desviación');
    this.glyphText(shown, 240, 349, 48, '#263d34', 'DM Mono, monospace');
    this.glyphText('TOCA PARA PARAR', 240, 466, 14, '#718176', 'DM Mono, monospace');
  }

  private stopRound(): void {
    if (this.ended || this.round > 5) return;
    this.deviations.push(Math.abs(this.roundMs - this.targetMs) / 1000);
    this.feedbackText.setText(`Desviación: ${this.deviations[this.deviations.length - 1].toFixed(2)} s`);
    this.round += 1;
    this.roundMs = 0;
    if (this.deviations.length >= 5) this.complete();
  }

  private complete(): void {
    if (!this.deviations.length) this.deviations.push(Math.abs(this.roundMs - this.targetMs) / 1000);
    const mean = this.deviations.reduce((a, b) => a + b, 0) / this.deviations.length;
    this.finish(mean, Phaser.Math.Clamp(1 - mean / 7, 0, 1));
  }

  pointerDown(_x: number, y: number): void { if (y >= 225 && y <= 520) this.stopRound(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.stopRound(); } }
}

class MarmotClockGame extends MiniGame {
  private round = 1;
  private roundMs = 0;
  private readonly targetMs = 3000;
  private deviations: number[] = [];

  create(): void {
    this.chrome('Toca cuando la barra llegue al final. Repite cinco veces.');
    this.promptText.setY(198);
    this.drawClock();
  }

  update(delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.roundMs += delta;
    this.timerText.setText(this.timeLabel(Math.max(0, this.game.durationSec * 1000 - this.elapsedMs)));
    if (this.roundMs >= this.targetMs + 1400) this.stopRound(true);
    this.drawClock();
    if (this.elapsedMs >= this.game.durationSec * 1000) this.complete();
  }

  private drawClock(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xf0ede4).fillRoundedRect(77, 304, 326, 92, 20);
    const remaining = Phaser.Math.Clamp(1 - this.roundMs / this.targetMs, 0, 1);
    g.fillStyle(0xe3ded1).fillRoundedRect(100, 339, 280, 23, 12);
    g.fillStyle(remaining > 0.2 ? 0x73a781 : 0xe56c4c).fillRoundedRect(100, 339, 280 * remaining, 23, 12);
    this.promptText.setText(`Ronda ${this.round} de 5 · toca justo al vaciarse`);
    this.scoreLabel(this.deviations.length ? this.deviations.reduce((a, b) => a + b, 0) / this.deviations.length : 0, 's de desviación');
    this.glyphText(remaining > 0 ? 'ESPERA…' : '¡AHORA!', 240, 425, 25, '#263d34', 'DM Sans, sans-serif');
  }

  private stopRound(timedOut = false): void {
    if (this.ended || this.round > 5) return;
    const deviation = timedOut ? 1.4 : Math.abs(this.roundMs - this.targetMs) / 1000;
    this.deviations.push(deviation);
    this.feedbackText.setText(timedOut ? 'Se acabó el tiempo: toca antes.' : `Desviación: ${deviation.toFixed(2)} s`);
    this.round += 1;
    this.roundMs = 0;
    if (this.deviations.length >= 5) this.complete();
  }

  private complete(): void {
    if (!this.deviations.length) this.deviations.push(Math.abs(this.roundMs - this.targetMs) / 1000);
    const mean = this.deviations.reduce((a, b) => a + b, 0) / this.deviations.length;
    this.finish(mean, Phaser.Math.Clamp(1 - mean / this.targetMs, 0, 1));
  }

  pointerDown(_x: number, y: number): void { if (y >= 225 && y <= 520) this.stopRound(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.stopRound(); } }
}

class CuttlefishReflexGame extends MiniGame {
  private phase: 'wait' | 'go' = 'wait';
  private waitMs = 0;
  private goMs = 0;
  private hits = 0;
  private misses = 0;
  private points = 0;

  create(): void {
    this.chrome('Espera al cambio de color y toca enseguida. Tocar antes resta puntos.');
    this.waitMs = Phaser.Math.Between(1300, 2800);
    this.drawSignal();
  }

  update(delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.timerText.setText(this.timeLabel(Math.max(0, this.game.durationSec * 1000 - this.elapsedMs)));
    if (this.phase === 'wait') {
      this.waitMs -= delta;
      if (this.waitMs <= 0) { this.phase = 'go'; this.goMs = 0; }
    } else {
      this.goMs += delta;
      if (this.goMs >= 1700) { this.misses += 1; this.phase = 'wait'; this.waitMs = Phaser.Math.Between(1000, 2400); }
    }
    this.drawSignal();
    if (this.elapsedMs >= this.game.durationSec * 1000) this.complete();
  }

  private drawSignal(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(this.phase === 'go' ? 0x73aa81 : 0x343f3b).fillRoundedRect(70, 246, 340, 247, 24);
    this.glyphText(this.phase === 'go' ? '¡TOCA!' : 'ESPERA', 240, 347, 38, '#fffdf6');
    this.glyphText(`Aciertos ${this.hits} · Fallos ${this.misses}`, 240, 432, 17, '#fffdf6', 'DM Mono, monospace');
    this.scoreLabel(this.points, 'puntos');
    this.promptText.setText(this.phase === 'go' ? '¡Cambio de color! Toca ya.' : 'No toques hasta que cambie el fondo.');
  }

  private tap(): void {
    if (this.phase === 'wait') {
      this.misses += 1;
      this.points = Math.max(0, this.points - 1);
      this.feedbackText.setText('Demasiado pronto: −1 punto.');
      this.waitMs = Phaser.Math.Between(950, 2100);
    } else {
      this.hits += 1;
      const bonus = this.goMs < 360 ? 2 : this.goMs < 750 ? 1 : 0;
      this.points += 1 + bonus;
      this.feedbackText.setText(bonus ? `¡Reflejos! +${1 + bonus} puntos.` : '+1 punto');
      this.phase = 'wait';
      this.waitMs = Phaser.Math.Between(1050, 2450);
    }
  }

  private complete(): void { this.finish(this.points, this.hits + this.misses ? this.hits / (this.hits + this.misses) : 0); }
  pointerDown(_x: number, y: number): void { if (y >= 225 && y <= 520) this.tap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.tap(); } }
}

interface MailCard { x: number; needsSeal: boolean; handled: boolean; label: string; }

class PigeonMailGame extends MiniGame {
  private card: MailCard = { x: 78, needsSeal: true, handled: false, label: 'URGENTE' };
  private points = 0;
  private correct = 0;
  private decisions = 0;
  private cardNumber = 0;

  create(): void {
    this.chrome('Sella las cartas bajo el matasellos. Deja pasar las que no necesitan sello.');
    this.drawBelt();
  }

  update(delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.timerText.setText(this.timeLabel(Math.max(0, this.game.durationSec * 1000 - this.elapsedMs)));
    this.card.x += 135 * delta / 1000;
    if (!this.card.handled && this.card.x > 286) this.resolveCard(false);
    if (this.card.x > 426) this.nextCard();
    this.drawBelt();
    if (this.elapsedMs >= this.game.durationSec * 1000) this.finish(this.points, this.decisions ? this.correct / this.decisions : 0);
  }

  private drawBelt(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xd8e1d5).fillRoundedRect(66, 367, 348, 38, 18);
    for (let x = 86; x < 414; x += 30) g.fillStyle(0x9aa99a).fillCircle(x, 386, 5);
    g.fillStyle(0xf4d475, 0.28).fillRoundedRect(210, 285, 60, 202, 13);
    g.lineStyle(3, 0xe27a58).lineBetween(240, 282, 240, 485);
    g.fillStyle(0x427b59).fillRoundedRect(208, 282, 64, 22, 6);
    g.fillStyle(0xfffdf6).lineStyle(2, 0xded9ca).fillRoundedRect(this.card.x - 53, 333, 106, 75, 10).strokeRoundedRect(this.card.x - 53, 333, 106, 75, 10);
    this.glyphText(this.card.label, this.card.x, 349, 13, '#314c3d', 'DM Mono, monospace');
    this.glyphText(this.card.needsSeal ? 'SELLAR' : 'SIN SELLO', this.card.x, 373, 11, this.card.needsSeal ? '#d36446' : '#718176', 'DM Mono, monospace');
    this.promptText.setText('Toca cuando la carta esté centrada en el matasellos.');
    this.scoreLabel(this.points, 'puntos');
  }

  private resolveCard(sealed: boolean): void {
    if (this.card.handled) return;
    if (sealed && this.card.needsSeal && Math.abs(this.card.x - 240) >= 45) {
      this.feedbackText.setText(this.card.x < 195 ? 'Espera a que la carta llegue al matasellos.' : 'La carta ya pasó el matasellos.');
      return;
    }
    this.card.handled = true;
    this.decisions += 1;
    const correct = sealed === this.card.needsSeal;
    if (correct) {
      this.correct += 1;
      this.points += sealed ? (Math.abs(this.card.x - 240) < 18 ? 3 : 2) : 1;
      this.feedbackText.setText(sealed ? (Math.abs(this.card.x - 240) < 18 ? '¡Perfecto! +3' : 'Carta sellada +2') : 'Bien visto: no necesitaba sello.');
    } else {
      this.points = Math.max(0, this.points - 1);
      this.feedbackText.setText(sealed ? 'Esta carta no debía sellarse. −1' : 'La carta necesitaba sello. −1');
    }
  }

  private nextCard(): void {
    this.cardNumber += 1;
    const needsSeal = this.cardNumber % 4 !== 0;
    const labels = needsSeal ? ['URGENTE', 'CERTIFICADA', 'AÉREA'] : ['PUBLICIDAD', 'YA FRANQUEADA'];
    this.card = { x: 78, needsSeal, handled: false, label: labels[this.cardNumber % labels.length] };
  }

  pointerDown(_x: number, y: number): void { if (y >= 270 && y <= 490) this.resolveCard(true); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.resolveCard(true); } }
}

class CricketRhythmGame extends MiniGame {
  private phase: 'follow' | 'repeat' = 'follow';
  private readonly guideBeatMs = 720;
  private round = 1;
  private taps = 0;
  private lastTap?: number;
  private guideIntervals: number[] = [];
  private repeatErrors: number[] = [];
  private roundScores: number[] = [];

  create(): void {
    this.chrome('Sigue cinco pulsos de luz. Después repite el mismo ritmo cuando se apague.');
    this.drawPulse();
  }

  update(delta: number): void {
    if (this.ended) return;
    this.elapsedMs += delta;
    this.timerText.setText(this.timeLabel(Math.max(0, this.game.durationSec * 1000 - this.elapsedMs)));
    this.drawPulse();
    if (this.elapsedMs >= this.game.durationSec * 1000) this.complete();
  }

  private drawPulse(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    const visiblePulse = this.phase === 'follow' && (this.elapsedMs % this.guideBeatMs) < 230;
    g.fillStyle(visiblePulse ? 0xf0c95f : 0xe8e4d8).lineStyle(3, 0xded9ca).fillCircle(240, 356, 70).strokeCircle(240, 356, 70);
    this.glyphText(this.phase === 'follow' ? (visiblePulse ? '●' : '◌') : '♪', 240, 329, 42, '#314c3d');
    this.glyphText(`Toque ${this.taps + 1} de 5`, 240, 452, 18, '#314c3d', 'DM Mono, monospace');
    this.promptText.setText(this.phase === 'follow' ? `Ronda ${this.round} · toca con la luz` : `Ronda ${this.round} · repite el ritmo sin luz`);
    const mean = this.roundScores.length ? this.roundScores.reduce((a, b) => a + b, 0) / this.roundScores.length : 0;
    this.scoreLabel(Math.round(mean), '%');
  }

  private tap(): void {
    if (this.ended || this.elapsedMs < 500) return;
    if (this.lastTap !== undefined) {
      const interval = this.elapsedMs - this.lastTap;
      if (this.phase === 'follow') this.guideIntervals.push(interval);
      else {
        const reference = this.guideIntervals.length ? this.guideIntervals.reduce((a, b) => a + b, 0) / this.guideIntervals.length : this.guideBeatMs;
        this.repeatErrors.push(Math.abs(interval - reference) / reference);
      }
    }
    this.lastTap = this.elapsedMs;
    this.taps += 1;
    this.feedbackText.setText(this.phase === 'follow' ? 'Pulso anotado.' : 'Ritmo anotado.');
    if (this.taps >= 5 && this.phase === 'follow') {
      this.phase = 'repeat'; this.taps = 0; this.lastTap = undefined;
      this.feedbackText.setText('Se apagó la luz. Repite el pulso.');
    } else if (this.taps >= 5 && this.phase === 'repeat') {
      const accuracy = this.repeatErrors.length ? this.repeatErrors.reduce((sum, error) => sum + Math.max(0, 1 - error), 0) / this.repeatErrors.length : 0;
      this.roundScores.push(accuracy * 100);
      if (this.round >= 3) { this.complete(); return; }
      this.round += 1; this.phase = 'follow'; this.taps = 0; this.lastTap = undefined; this.guideIntervals = []; this.repeatErrors = [];
    }
    this.drawPulse();
  }

  private complete(): void {
    const accuracy = this.roundScores.length ? this.roundScores.reduce((a, b) => a + b, 0) / this.roundScores.length / 100 : 0;
    this.finish(Math.round(accuracy * 100), accuracy);
  }

  pointerDown(_x: number, y: number): void { if (y >= 225 && y <= 520) this.tap(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.tap(); } }
}

class RotatingPinGame extends MiniGame {
  private rotor = 0;
  private speed = 1.05;
  private pegs: number[] = [];
  private points = 0;
  private readonly shotAngle = Math.PI / 2;

  create(): void {
    const isCastor = this.game.id === 'castor-lanzador';
    this.chrome(isCastor
      ? 'Lanza dientes al tronco que gira. No choques con los que ya están clavados.'
      : 'Dispara la púa móvil por un hueco libre entre las púas clavadas.');
    this.pegs = isCastor ? [-2.7, -1.85, -0.95, -0.12, 0.75] : [-2.8, -2.05, -1.26, -0.46, 0.34, 1.14];
    this.drawRotor();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.rotor = (this.rotor + delta / 1000 * this.speed) % (Math.PI * 2);
    this.speed = Math.min(2.7, 1.05 + this.points * 0.025);
    this.drawRotor();
    if (expired) this.finish(this.points, this.points ? 1 : 0);
  }

  private drawRotor(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    const castor = this.game.id === 'castor-lanzador';
    g.clear();
    g.fillStyle(castor ? 0xc59a67 : 0xe5e5da).fillCircle(240, 367, 104);
    g.lineStyle(10, castor ? 0x936541 : 0xb8c5b5).strokeCircle(240, 367, 104);
    g.lineStyle(5, castor ? 0x76543b : 0x8ca18f).strokeCircle(240, 367, 77);
    g.fillStyle(castor ? 0x9e7048 : 0x7d9582).fillRoundedRect(221, 277, 38, 181, 16);
    for (let stripe = -1; stripe <= 1; stripe += 1) {
      g.lineStyle(2, castor ? 0xd5b087 : 0xbac7b9, 0.9).lineBetween(226 + stripe * 10, 291, 226 + stripe * 10, 444);
    }
    for (const peg of this.pegs) {
      const angle = peg + this.rotor;
      const inner = 78; const outer = 120;
      const x1 = 240 + Math.cos(angle) * inner; const y1 = 367 + Math.sin(angle) * inner;
      const x2 = 240 + Math.cos(angle) * outer; const y2 = 367 + Math.sin(angle) * outer;
      g.lineStyle(5, 0x36453c).lineBetween(x1, y1, x2, y2);
      g.fillStyle(0xe5ba60).fillCircle(x2, y2, 7);
    }
    const movingX = 240 + Math.cos(this.shotAngle) * 139;
    const movingY = 367 + Math.sin(this.shotAngle) * 139;
    g.lineStyle(5, 0xe46b4b).lineBetween(240, 367, movingX, movingY);
    g.fillStyle(0xe46b4b).fillCircle(movingX, movingY, 10);
    this.glyphText('↻', 240, 244, 29, '#526b59');
    this.promptText.setText(castor ? 'Toca para clavar el siguiente diente sin chocar.' : 'Toca para disparar por un hueco libre.');
    this.scoreLabel(this.points, 'puntos');
  }

  private shoot(): void {
    if (this.ended) return;
    const collision = this.pegs.some((peg) => {
      const diff = Math.atan2(Math.sin(peg + this.rotor - this.shotAngle), Math.cos(peg + this.rotor - this.shotAngle));
      return Math.abs(diff) < 0.23;
    });
    if (collision) {
      this.feedbackText.setText('¡Chocaste con una púa!');
      this.finish(this.points, this.points ? 1 : 0);
      return;
    }
    this.pegs.push(this.shotAngle - this.rotor);
    this.points += 1;
    this.feedbackText.setText('¡Púa clavada en un hueco!');
    const target = this.game.id === 'castor-lanzador' ? 54 : 26;
    if (this.points >= target) this.finish(this.points, 1);
    this.drawRotor();
  }

  pointerDown(_x: number, y: number): void { if (y >= 225 && y <= 520) this.shoot(); }
  keyDown(event: KeyboardEvent): void { if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.shoot(); } }
}

class WolfLauncherGame extends MiniGame {
  private phase: 'aim' | 'flight' = 'aim';
  private angle = 32;
  private power = 30;
  private drag?: { x: number; y: number };
  private distance = 0;
  private height = 0;
  private velocityX = 0;
  private velocityY = 0;
  private flightSeconds = 0;
  private bestMeters = 0;
  private shots = 0;
  private perfectShots = 0;
  private freezeMs = 0;
  private perfectLaunch = false;

  create(): void {
    this.chrome('Arrastra hacia atrás desde el lobo para elegir el ángulo y la fuerza. Un ángulo perfecto congela el reloj.');
    this.promptText.setY(184);
    this.drawFlight();
  }

  update(delta: number): void {
    if (this.ended) return;
    if (this.freezeMs > 0) {
      this.freezeMs = Math.max(0, this.freezeMs - delta);
      this.drawFlight();
      return;
    }
    const expired = this.tick(delta);
    if (this.phase === 'flight') {
      this.flightSeconds += delta / 1000;
      const flightDuration = 2 * this.velocityY / 9.81;
      const flightTime = Math.min(this.flightSeconds, flightDuration);
      this.distance = this.velocityX * flightTime;
      this.height = Math.max(0, this.velocityY * flightTime - 4.905 * flightTime * flightTime);
      if (this.flightSeconds >= flightDuration) {
        this.height = 0;
        this.bestMeters = Math.max(this.bestMeters, this.distance);
        this.shots += 1;
        this.phase = 'aim';
        this.distance = 0;
        this.feedbackText.setText(this.perfectLaunch ? `¡Perfecto! ${this.bestMeters.toFixed(1)} m · elige otro ángulo.` : `El lobo aterrizó · mejor marca ${this.bestMeters.toFixed(1)} m.`);
      }
    }
    this.drawFlight();
    if (expired) this.finish(this.bestMeters, this.shots ? this.perfectShots / this.shots : 0);
  }

  private drawFlight(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xdde9dc).fillRoundedRect(58, 236, 364, 274, 20);
    g.fillStyle(0x8da96f).fillTriangle(60, 465, 206, 337, 344, 465);
    g.fillStyle(0x719260).fillTriangle(208, 465, 330, 351, 423, 465);
    g.lineStyle(4, 0x9a7048).lineBetween(60, 466, 420, 466);
    const screenX = Phaser.Math.Clamp(94 + this.distance * 3.1, 94, 408);
    const screenY = Phaser.Math.Clamp(453 - this.height * 2.2, 247, 453);
    if (this.phase === 'flight') this.glyphText('🐺', screenX, screenY, 31, '#263d34', 'sans-serif');
    else this.glyphText('🐺', 94, 444, 31, '#263d34', 'sans-serif');
    if (this.phase === 'aim') {
      const radians = Phaser.Math.DegToRad(this.angle);
      const line = this.power * 3.5;
      g.lineStyle(4, 0xe36c4d).lineBetween(96, 440, 96 + Math.cos(radians) * line, 440 - Math.sin(radians) * line);
      this.glyphText(`${this.angle}°`, 157, 415, 17, '#324d3c', 'DM Mono, monospace');
    }
    const score = this.bestMeters.toFixed(1);
    this.promptText.setText(this.freezeMs > 0 ? '¡PERFECTO! El reloj se ha detenido.' : this.phase === 'aim' ? `Ángulo ${this.angle}° · fuerza ${this.power} · arrastra para apuntar` : '¡En vuelo! Espera a que aterrice.');
    this.scoreLabel(Number(score), 'm');
  }

  private launch(): void {
    if (this.phase !== 'aim' || this.ended) return;
    const radians = Phaser.Math.DegToRad(this.angle);
    this.velocityX = Math.cos(radians) * this.power;
    this.velocityY = Math.sin(radians) * this.power;
    this.distance = 0;
    this.height = 0.1;
    this.flightSeconds = 0;
    this.phase = 'flight';
    this.perfectLaunch = Math.abs(this.angle - 45) <= 4 && this.power >= 27;
    if (this.perfectLaunch) { this.perfectShots += 1; this.freezeMs = 1400; }
    this.feedbackText.setText(this.perfectLaunch ? '¡PERFECTO! Reloj congelado.' : '¡Lanzamiento! Sigue la trayectoria.');
  }

  pointerDown(_x: number, _y: number): void { if (this.phase === 'aim') this.drag = { x: 96, y: 440 }; }
  pointerMove(x: number, y: number, isDown: boolean): void {
    if (!isDown || !this.drag || this.phase !== 'aim') return;
    const pullX = this.drag.x - x; const pullY = y - this.drag.y;
    if (Math.hypot(pullX, pullY) > 12) {
      this.angle = Phaser.Math.Clamp(Math.round(Phaser.Math.RadToDeg(Math.atan2(pullY, pullX))), 15, 78);
      this.power = Phaser.Math.Clamp(Math.round(Math.hypot(pullX, pullY) / 2), 18, 34);
    }
    this.drawFlight();
  }
  pointerUp(_x: number, _y: number): void { if (this.phase === 'aim') this.launch(); this.drag = undefined; }
  keyDown(event: KeyboardEvent): void {
    if (this.phase === 'aim' && event.key === 'ArrowLeft') { event.preventDefault(); this.angle = Phaser.Math.Clamp(this.angle - 3, 15, 78); this.drawFlight(); }
    else if (this.phase === 'aim' && event.key === 'ArrowRight') { event.preventDefault(); this.angle = Phaser.Math.Clamp(this.angle + 3, 15, 78); this.drawFlight(); }
    else if (this.phase === 'aim' && event.key === 'ArrowUp') { event.preventDefault(); this.power = Phaser.Math.Clamp(this.power + 1, 18, 34); this.drawFlight(); }
    else if (this.phase === 'aim' && event.key === 'ArrowDown') { event.preventDefault(); this.power = Phaser.Math.Clamp(this.power - 1, 18, 34); this.drawFlight(); }
    else if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.launch(); }
  }
}

class OtterLauncherGame extends MiniGame {
  private phase: 'aim' | 'flight' = 'aim';
  private angle = 48;
  private power = 30;
  private drag?: { x: number; y: number };
  private ballX = 88;
  private ballY = 460;
  private velocityX = 0;
  private velocityY = 0;
  private wind = Phaser.Math.Between(-3, 3);
  private points = 0;
  private shots = 0;
  private hits = 0;

  create(): void {
    this.chrome('Lanza bolas a los flotadores. Ajusta el tiro a la dirección y fuerza del viento.');
    this.promptText.setY(190);
    this.drawRange();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    let targetX = 330 + Math.sin(this.elapsedMs / 760) * 42;
    let targetY = 337 + Math.sin(this.elapsedMs / 510) * 16;
    if (this.phase === 'flight') {
      const steps = Math.max(1, Math.ceil(delta / 30));
      const stepMs = delta / steps;
      for (let stepIndex = 0; stepIndex < steps && this.phase === 'flight'; stepIndex += 1) {
        const stepTimeMs = this.elapsedMs - delta + stepMs * (stepIndex + 1);
        targetX = 330 + Math.sin(stepTimeMs / 760) * 42;
        targetY = 337 + Math.sin(stepTimeMs / 510) * 16;
        const dt = stepMs / 1000;
        this.velocityX += this.wind * 13 * dt;
        this.ballX += this.velocityX * dt;
        this.ballY += this.velocityY * dt;
        this.velocityY += 184 * dt;
        if (Math.hypot(this.ballX - targetX, this.ballY - (targetY - 27)) < 27) {
          this.hits += 1;
          this.points += 100;
          this.phase = 'aim';
          this.wind = Phaser.Math.Between(-3, 3);
          this.feedbackText.setText('¡Flotador alcanzado! +100 puntos.');
        } else if (this.ballX > 430 || this.ballY > 500 || this.ballY < 230) {
          this.phase = 'aim';
          this.feedbackText.setText('La bola cayó al agua. Ajusta el tiro y prueba de nuevo.');
        }
      }
    }
    targetX = 330 + Math.sin(this.elapsedMs / 760) * 42;
    targetY = 337 + Math.sin(this.elapsedMs / 510) * 16;
    if (this.phase === 'aim') { this.ballX = 88; this.ballY = 460; }
    this.drawRange(targetX, targetY);
    if (expired) this.finish(this.points, this.shots ? this.hits / this.shots : 0);
  }

  private drawRange(targetX = 330, targetY = 337): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xd9edf0).fillRoundedRect(58, 236, 364, 274, 20);
    g.fillStyle(0x86b0a3, 0.8).fillRect(60, 420, 360, 88);
    g.lineStyle(4, 0xf2d074).lineBetween(61, 420, 419, 420);
    g.lineStyle(5, 0x987149).lineBetween(61, 460, 119, 460);
    g.fillStyle(0x78ac91).fillEllipse(targetX, targetY + 18, 76, 22);
    g.lineStyle(3, 0x547d70).lineBetween(targetX, targetY - 24, targetX, targetY + 22);
    g.fillStyle(0xf4d56f).fillCircle(targetX, targetY - 27, 23);
    g.lineStyle(3, 0xffffff).strokeCircle(targetX, targetY - 27, 23);
    if (this.phase === 'aim') {
      const radians = Phaser.Math.DegToRad(this.angle);
      const velocity = this.power * 10;
      for (let step = 1; step <= 7; step += 1) {
        const t = step * 0.13;
        const x = 88 + Math.cos(radians) * velocity * t + this.wind * 6.5 * t * t;
        const y = 460 - Math.sin(radians) * velocity * t + 0.5 * 184 * t * t;
        g.fillStyle(0xffffff, 0.85 - step * 0.08).fillCircle(x, y, Math.max(2, 6 - step * 0.5));
      }
    }
    this.glyphText('🦦', 88, 432, 27, '#263d34', 'sans-serif');
    g.fillStyle(0xe96e4e).fillCircle(this.ballX, this.ballY, 9);
    g.fillStyle(0xfff7e7).fillCircle(this.ballX - 2, this.ballY - 3, 3);
    this.glyphText(`Viento ${this.wind > 0 ? '→' : this.wind < 0 ? '←' : '·'} ${Math.abs(this.wind)}`, 331, 275, 15, '#314c3d', 'DM Mono, monospace');
    this.promptText.setText(this.phase === 'aim' ? `Ángulo ${this.angle}° · fuerza ${this.power} · arrastra y suelta` : '¡La bola va hacia el flotador!');
    this.scoreLabel(this.points, 'puntos');
  }

  private launch(): void {
    if (this.phase !== 'aim' || this.ended) return;
    const radians = Phaser.Math.DegToRad(this.angle);
    const velocity = this.power * 10;
    this.velocityX = Math.cos(radians) * velocity;
    this.velocityY = -Math.sin(radians) * velocity;
    this.ballX = 88; this.ballY = 460;
    this.phase = 'flight';
    this.shots += 1;
    this.feedbackText.setText('¡Lanzamiento! El viento desvía la bola.');
  }

  pointerDown(_x: number, _y: number): void { if (this.phase === 'aim') this.drag = { x: 88, y: 460 }; }
  pointerMove(x: number, y: number, isDown: boolean): void {
    if (!isDown || !this.drag || this.phase !== 'aim') return;
    const pullX = this.drag.x - x; const pullY = y - this.drag.y;
    if (Math.hypot(pullX, pullY) > 12) {
      this.angle = Phaser.Math.Clamp(Math.round(Phaser.Math.RadToDeg(Math.atan2(pullY, pullX))), 18, 75);
      this.power = Phaser.Math.Clamp(Math.round(Math.hypot(pullX, pullY) / 2), 18, 34);
    }
    this.drawRange();
  }
  pointerUp(_x: number, _y: number): void { if (this.phase === 'aim') this.launch(); this.drag = undefined; }
  keyDown(event: KeyboardEvent): void {
    if (this.phase === 'aim' && event.key === 'ArrowLeft') { event.preventDefault(); this.angle = Phaser.Math.Clamp(this.angle - 3, 18, 75); this.drawRange(); }
    else if (this.phase === 'aim' && event.key === 'ArrowRight') { event.preventDefault(); this.angle = Phaser.Math.Clamp(this.angle + 3, 18, 75); this.drawRange(); }
    else if (this.phase === 'aim' && event.key === 'ArrowUp') { event.preventDefault(); this.power = Phaser.Math.Clamp(this.power + 1, 18, 34); this.drawRange(); }
    else if (this.phase === 'aim' && event.key === 'ArrowDown') { event.preventDefault(); this.power = Phaser.Math.Clamp(this.power - 1, 18, 34); this.drawRange(); }
    else if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.launch(); }
  }
}

interface RhinoBrick { x: number; y: number; hp: number; }
interface RhinoBall { x: number; y: number; vx: number; vy: number; }

class RhinoBreakoutGame extends MiniGame {
  private bricks: RhinoBrick[] = [];
  private balls: RhinoBall[] = [];
  private points = 0;
  private hits = 0;
  private shots = 0;
  private rowMs = 3300;
  private shotCooldown = 0;
  private aimX = 240;

  create(): void {
    this.chrome('Apunta y dispara bolas a los ladrillos. El número muestra cuántos golpes faltan antes de que bajen.');
    this.bricks = [];
    [279, 324, 369].forEach((y) => this.addRow(y));
    this.drawWall();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.shotCooldown = Math.max(0, this.shotCooldown - delta);
    this.rowMs -= delta;
    while (this.rowMs <= 0 && !this.ended) {
      this.bricks.forEach((brick) => { brick.y += 43; });
      if (this.bricks.some((brick) => brick.y >= 474)) { this.finish(this.points, this.shots ? this.hits / this.shots : 0); return; }
      this.addRow(278);
      this.rowMs += Math.max(1150, 3300 - this.points * 11);
    }
    const dt = delta / 1000;
    for (let ballIndex = this.balls.length - 1; ballIndex >= 0; ballIndex -= 1) {
      const ball = this.balls[ballIndex];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < 76 || ball.x > 404) { ball.x = Phaser.Math.Clamp(ball.x, 76, 404); ball.vx *= -1; }
      if (ball.y < 258) { ball.y = 258; ball.vy = Math.abs(ball.vy); }
      const brick = this.bricks.find((item) => Math.abs(ball.x - item.x) < 36 && Math.abs(ball.y - item.y) < 23);
      if (brick) {
        brick.hp -= 1;
        this.hits += 1;
        this.points += 1;
        ball.vy *= -1;
        if (brick.hp <= 0) {
          this.bricks.splice(this.bricks.indexOf(brick), 1);
          this.points += 2;
          this.feedbackText.setText('¡Ladrillo roto! +3 puntos.');
        } else this.feedbackText.setText(`¡Impacto! Le quedan ${brick.hp} golpes.`);
      }
      if (ball.y > 510) this.balls.splice(ballIndex, 1);
    }
    this.drawWall();
    if (expired) this.finish(this.points, this.shots ? this.hits / this.shots : 0);
  }

  private addRow(y: number): void {
    for (let column = 0; column < 5; column += 1) {
      if (Phaser.Math.Between(0, 9) < 2) continue;
      this.bricks.push({ x: 105 + column * 67, y, hp: Phaser.Math.Between(1, 3) });
    }
  }

  private drawWall(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x315442).fillRoundedRect(59, 234, 362, 284, 17);
    g.lineStyle(2, 0x88a98b, 0.55).lineBetween(72, 478, 408, 478);
    for (const brick of this.bricks) {
      const tint = brick.hp === 1 ? 0xe5b856 : brick.hp === 2 ? 0xe98358 : 0xc16b55;
      g.fillStyle(tint).lineStyle(2, 0xf4dfaf).fillRoundedRect(brick.x - 29, brick.y - 14, 58, 28, 6).strokeRoundedRect(brick.x - 29, brick.y - 14, 58, 28, 6);
      this.glyphText(String(brick.hp), brick.x, brick.y - 10, 17, '#fffaf0', 'DM Mono, monospace');
    }
    for (const ball of this.balls) g.fillStyle(0xf4d26a).lineStyle(2, 0xfff8db).fillCircle(ball.x, ball.y, 8).strokeCircle(ball.x, ball.y, 8);
    g.lineStyle(3, 0xe77755).lineBetween(240, 492, this.aimX, 450);
    g.fillStyle(0xe77755).fillRoundedRect(210, 486, 60, 11, 6);
    this.promptText.setText(`Apunta tocando una dirección · ${this.bricks.length} ladrillos en pantalla`);
    this.scoreLabel(this.points, 'puntos');
  }

  private fire(x: number): void {
    if (this.ended || this.shotCooldown > 0) return;
    this.aimX = Phaser.Math.Clamp(x, 78, 402);
    const vx = Phaser.Math.Clamp((this.aimX - 240) * 0.75, -165, 165);
    this.balls.push({ x: 240, y: 478, vx, vy: -420 });
    this.shots += 1;
    this.shotCooldown = 220;
    this.feedbackText.setText('¡Disparo! Golpea los ladrillos antes de que lleguen abajo.');
  }

  pointerDown(x: number, y: number): void { if (y >= 230 && y <= 515) this.fire(x); }
  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') { event.preventDefault(); this.aimX = Phaser.Math.Clamp(this.aimX - 24, 78, 402); this.drawWall(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); this.aimX = Phaser.Math.Clamp(this.aimX + 24, 78, 402); this.drawWall(); }
    else if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); this.fire(this.aimX); }
  }
}

interface GolfObstacle { x: number; y: number; width: number; height: number; }
interface GolfHoleLayout { startX: number; startY: number; cupX: number; cupY: number; obstacles: GolfObstacle[]; }

const GOLF_LAYOUTS: GolfHoleLayout[] = [
  { startX: 100, startY: 454, cupX: 355, cupY: 290, obstacles: [{ x: 208, y: 390, width: 92, height: 19 }, { x: 280, y: 329, width: 20, height: 68 }] },
  { startX: 105, startY: 287, cupX: 365, cupY: 450, obstacles: [{ x: 197, y: 365, width: 105, height: 18 }, { x: 295, y: 406, width: 18, height: 54 }] },
  { startX: 105, startY: 450, cupX: 355, cupY: 303, obstacles: [{ x: 159, y: 360, width: 18, height: 83 }, { x: 252, y: 316, width: 104, height: 17 }] },
  { startX: 365, startY: 454, cupX: 118, cupY: 289, obstacles: [{ x: 250, y: 390, width: 90, height: 18 }, { x: 185, y: 330, width: 17, height: 66 }] },
];
const PERSPECTIVE_GOLF_LAYOUT: GolfHoleLayout = {
  startX: 165, startY: 456, cupX: 270, cupY: 286,
  obstacles: [{ x: 188, y: 382, width: 74, height: 18 }, { x: 225, y: 330, width: 16, height: 56 }],
};

class MiniGolfGame extends MiniGame {
  private layout = GOLF_LAYOUTS[0];
  private ballX = 100;
  private ballY = 454;
  private velocityX = 0;
  private velocityY = 0;
  private drag?: { x: number; y: number; currentX: number; currentY: number };
  private strokes = 0;
  private holesCompleted = 0;
  private shots = 0;

  create(): void {
    const copy = this.game.id === 'suricatas-del-minigolf'
      ? 'Arrastra desde la bola para apuntar y elegir la fuerza. Completa tantos hoyos como puedas en 30 segundos.'
      : 'Arrastra hacia atrás desde la bola para apuntar y elegir potencia. Puedes golpear otra vez aunque siga rodando.';
    this.chrome(copy);
    this.promptText.setY(192);
    this.setHole(0);
    this.drawCourse();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    if (Math.hypot(this.velocityX, this.velocityY) > 8) {
      const steps = Math.max(1, Math.ceil(delta / 30));
      const dt = delta / steps / 1000;
      for (let index = 0; index < steps; index += 1) {
        const oldX = this.ballX; const oldY = this.ballY;
        this.ballX += this.velocityX * dt;
        this.ballY += this.velocityY * dt;
        if (this.ballX < 72 || this.ballX > 408) { this.ballX = Phaser.Math.Clamp(this.ballX, 72, 408); this.velocityX *= -0.76; }
        if (this.ballY < 258 || this.ballY > 493) { this.ballY = Phaser.Math.Clamp(this.ballY, 258, 493); this.velocityY *= -0.76; }
        for (const obstacle of this.layout.obstacles) {
          const left = obstacle.x - obstacle.width / 2 - 8; const right = obstacle.x + obstacle.width / 2 + 8;
          const top = obstacle.y - obstacle.height / 2 - 8; const bottom = obstacle.y + obstacle.height / 2 + 8;
          if (this.ballX > left && this.ballX < right && this.ballY > top && this.ballY < bottom) {
            if (oldX <= left || oldX >= right) { this.ballX = oldX; this.velocityX *= -0.72; }
            else { this.ballY = oldY; this.velocityY *= -0.72; }
          }
        }
        this.velocityX *= Math.pow(0.986, dt * 60);
        this.velocityY *= Math.pow(0.986, dt * 60);
        if (Math.hypot(this.ballX - this.layout.cupX, this.ballY - this.layout.cupY) < 18 && Math.hypot(this.velocityX, this.velocityY) < 175) {
          this.sinkCup();
          break;
        }
      }
    }
    this.drawCourse();
    if (expired) {
      if (this.game.id === 'suricatas-del-minigolf') this.finish(this.holesCompleted, this.shots ? this.holesCompleted / this.shots : 0);
      else this.finishTime(this.shots ? this.holesCompleted / this.shots : 0);
    }
  }

  private setHole(index: number): void {
    this.layout = this.game.id === 'topo-golfista-2' ? PERSPECTIVE_GOLF_LAYOUT : GOLF_LAYOUTS[index % GOLF_LAYOUTS.length];
    this.ballX = this.layout.startX; this.ballY = this.layout.startY;
    this.velocityX = 0; this.velocityY = 0; this.strokes = 0;
  }

  private sinkCup(): void {
    this.holesCompleted += 1;
    this.feedbackText.setText('¡Hoyo conseguido!');
    if (this.game.id !== 'suricatas-del-minigolf') {
      this.finishTime(1 / Math.max(1, this.strokes));
      return;
    }
    this.setHole(this.holesCompleted);
  }

  private screenX(x: number, y: number): number {
    if (this.game.id !== 'topo-golfista-2') return x;
    const perspective = 0.36 + Phaser.Math.Clamp((y - 258) / 235, 0, 1) * 0.64;
    return 240 + (x - 240) * perspective;
  }

  private worldX(x: number, y: number): number {
    if (this.game.id !== 'topo-golfista-2') return x;
    const perspective = 0.36 + Phaser.Math.Clamp((y - 258) / 235, 0, 1) * 0.64;
    return 240 + (x - 240) / perspective;
  }

  private drawCourse(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    const perspective = this.game.id === 'topo-golfista-2';
    g.clear();
    g.fillStyle(0x7ba36d).fillRoundedRect(59, 236, 362, 276, 18);
    if (perspective) {
      g.fillStyle(0x689260, 0.82).fillTriangle(240, 247, 413, 506, 67, 506);
      g.lineStyle(3, 0xf0e7ca, 0.9).lineBetween(240, 247, 67, 506).lineBetween(240, 247, 413, 506);
      for (const y of [319, 377, 438]) {
        const half = 68 + (y - 247) * 0.67;
        g.lineStyle(2, 0xd7e4b5, 0.48).lineBetween(240 - half, y, 240 + half, y);
      }
    } else {
      g.lineStyle(4, 0xf0e7ca).strokeRoundedRect(67, 244, 346, 260, 15);
    }
    for (const obstacle of this.layout.obstacles) {
      const x = this.screenX(obstacle.x, obstacle.y);
      const width = perspective ? obstacle.width * (0.36 + (obstacle.y - 258) / 235 * 0.64) : obstacle.width;
      g.fillStyle(0x937c55).fillRoundedRect(x - width / 2, obstacle.y - obstacle.height / 2, width, obstacle.height, 8);
      g.lineStyle(2, 0xd6c493).strokeRoundedRect(x - width / 2, obstacle.y - obstacle.height / 2, width, obstacle.height, 8);
    }
    const cupX = this.screenX(this.layout.cupX, this.layout.cupY);
    const ballX = this.screenX(this.ballX, this.ballY);
    g.fillStyle(0x243830).fillEllipse(cupX, this.layout.cupY, perspective ? 25 : 30, perspective ? 14 : 18);
    g.lineStyle(2, 0xfff9e8).strokeCircle(cupX, this.layout.cupY, 18);
    g.fillStyle(0xe4b956).fillCircle(ballX, this.ballY, 8);
    g.fillStyle(0xfff8e7).fillCircle(ballX - 2, this.ballY - 3, 2);
    if (this.drag) {
      const endX = this.screenX(this.drag.currentX, this.drag.currentY);
      const endY = this.drag.currentY;
      g.lineStyle(4, 0xe76e4b).lineBetween(ballX, this.ballY, ballX + (ballX - endX) * 1.4, this.ballY + (this.ballY - endY) * 1.4);
      this.glyphText('SUELTA', ballX, this.ballY - 32, 12, '#fff9e8', 'DM Mono, monospace');
    }
    this.promptText.setText(this.game.id === 'suricatas-del-minigolf'
      ? `Hoyo ${this.holesCompleted + 1} · golpes ${this.strokes} · arrastra y suelta`
      : `Hoyo 1 · golpes ${this.strokes} · arrastra desde la bola para tirar`);
    if (this.game.id === 'suricatas-del-minigolf') this.scoreLabel(this.holesCompleted, 'hoyos');
    else this.scoreLabel(this.elapsedMs / 1000, 's');
  }

  private stroke(dx: number, dy: number): void {
    const strength = Math.hypot(dx, dy);
    if (strength < 1) return;
    const impulse = Phaser.Math.Clamp(strength * 3.1, 125, 520);
    const magnitude = Math.max(1, strength);
    this.velocityX += dx / magnitude * impulse;
    this.velocityY += dy / magnitude * impulse;
    this.strokes += 1; this.shots += 1;
    this.feedbackText.setText(this.strokes === 1 ? '¡Primer golpe! Puedes volver a golpearla en movimiento.' : '¡Golpe añadido!');
  }

  pointerDown(x: number, y: number): void {
    if (Math.hypot(x - this.screenX(this.ballX, this.ballY), y - this.ballY) < 58) {
      this.drag = { x: this.ballX, y: this.ballY, currentX: this.ballX, currentY: y };
    }
  }
  pointerMove(x: number, y: number, isDown: boolean): void { if (isDown && this.drag) { this.drag.currentX = this.worldX(x, y); this.drag.currentY = y; this.drawCourse(); } }
  pointerUp(x: number, y: number): void {
    if (!this.drag) return;
    let dx = this.drag.x - this.worldX(x, y); let dy = this.drag.y - y;
    if (Math.hypot(dx, dy) < 14) {
      const towardCupX = this.layout.cupX - this.ballX; const towardCupY = this.layout.cupY - this.ballY;
      const length = Math.max(1, Math.hypot(towardCupX, towardCupY));
      dx = towardCupX / length * 62; dy = towardCupY / length * 62;
    }
    this.stroke(dx, dy);
    this.drag = undefined;
    this.drawCourse();
  }
  keyDown(event: KeyboardEvent): void {
    const impulses: Record<string, [number, number]> = { ArrowLeft: [-55, 0], ArrowRight: [55, 0], ArrowUp: [0, -55], ArrowDown: [0, 55] };
    if (impulses[event.key]) { event.preventDefault(); const [dx, dy] = impulses[event.key]; this.stroke(dx, dy); }
    else if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); const dx = this.layout.cupX - this.ballX; const dy = this.layout.cupY - this.ballY; const length = Math.max(1, Math.hypot(dx, dy)); this.stroke(dx / length * 60, dy / length * 60); }
  }
}

class SquirrelNumberGridGame extends MiniGame {
  private cells: number[] = [];
  private nextNumber = 1;

  create(): void {
    this.chrome('Toca los números del 1 al 16 en orden en la cuadrícula mezclada.');
    this.cells = Array.from({ length: 16 }, (_, index) => index + 1);
    for (let index = this.cells.length - 1; index > 0; index -= 1) {
      const swap = Phaser.Math.Between(0, index);
      [this.cells[index], this.cells[swap]] = [this.cells[swap], this.cells[index]];
    }
    this.drawGrid();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.drawGrid();
    if (expired) this.finishTime((this.nextNumber - 1) / 16);
  }

  private drawGrid(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    for (let index = 0; index < 16; index += 1) {
      const x = 122 + (index % 4) * 59;
      const y = 290 + Math.floor(index / 4) * 52;
      const value = this.cells[index];
      const done = value < this.nextNumber;
      g.fillStyle(done ? 0x82ad83 : 0xffffff).lineStyle(2, 0xe1dccf).fillRoundedRect(x - 23, y - 21, 46, 42, 10).strokeRoundedRect(x - 23, y - 21, 46, 42, 10);
      this.glyphText(done ? '✓' : String(value), x, y - 9, 18, done ? '#fffdf6' : '#314c3d', 'DM Mono, monospace');
    }
    this.promptText.setText(this.nextNumber <= 16 ? `Toca el ${this.nextNumber} · quedan ${17 - this.nextNumber}` : '¡Cuadrícula completada!');
    this.scoreLabel(this.elapsedMs / 1000, 's');
  }

  private selectCell(x: number, y: number): void {
    const col = Math.floor((x - 99) / 59);
    const row = Math.floor((y - 266) / 52);
    if (col < 0 || col > 3 || row < 0 || row > 3) return;
    const value = this.cells[row * 4 + col];
    if (value === this.nextNumber) {
      this.nextNumber += 1;
      this.feedbackText.setText(this.nextNumber > 16 ? '¡Del 1 al 16 sin fallos!' : '¡Correcto! Sigue el orden.');
      if (this.nextNumber > 16) this.finishTime(1);
    } else this.feedbackText.setText(`Busca el ${this.nextNumber}.`);
    this.drawGrid();
  }

  pointerDown(x: number, y: number): void { this.selectCell(x, y); }
  keyDown(event: KeyboardEvent): void { if (/^\d+$/.test(event.key)) this.selectCell(122 + (this.cells.indexOf(Number(event.key)) % 4) * 59, 290 + Math.floor(this.cells.indexOf(Number(event.key)) / 4) * 52); }
}

class OwlMathGame extends MiniGame {
  private round = 1;
  private left = 3;
  private right = 4;
  private operator: '+' | '−' | '×' = '+';
  private answer = 7;
  private choices: number[] = [];
  private correct = 0;

  create(): void {
    this.chrome('Resuelve cinco operaciones. Elige la respuesta correcta entre cuatro opciones.');
    this.makeQuestion();
    this.drawQuestion();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.drawQuestion();
    if (expired) this.finishTime(this.correct / 5);
  }

  private makeQuestion(): void {
    this.operator = (['+', '−', '×'] as const)[Phaser.Math.Between(0, 2)];
    this.left = Phaser.Math.Between(2, 12);
    this.right = Phaser.Math.Between(2, 12);
    if (this.operator === '−' && this.right > this.left) [this.left, this.right] = [this.right, this.left];
    this.answer = this.operator === '+' ? this.left + this.right : this.operator === '−' ? this.left - this.right : this.left * this.right;
    const values = new Set([this.answer]);
    for (let offset = 1; values.size < 4; offset += 1) {
      values.add(this.answer + offset);
      if (this.answer - offset >= 0) values.add(this.answer - offset);
    }
    this.choices = [...values].slice(0, 4);
    for (let index = this.choices.length - 1; index > 0; index -= 1) {
      const swap = Phaser.Math.Between(0, index);
      [this.choices[index], this.choices[swap]] = [this.choices[swap], this.choices[index]];
    }
  }

  private drawQuestion(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    g.fillStyle(0xf0ede4).fillRoundedRect(104, 271, 272, 88, 20);
    this.glyphText(`${this.left} ${this.operator} ${this.right} = ?`, 240, 304, 31, '#314c3d', 'DM Sans, sans-serif');
    for (let index = 0; index < 4; index += 1) {
      const x = 154 + (index % 2) * 172;
      const y = 397 + Math.floor(index / 2) * 68;
      g.fillStyle(0xffffff).lineStyle(2, 0xe1dccf).fillRoundedRect(x - 57, y - 25, 114, 50, 12).strokeRoundedRect(x - 57, y - 25, 114, 50, 12);
      this.glyphText(String(this.choices[index]), x, y - 12, 24, '#314c3d', 'DM Mono, monospace');
      this.glyphText(String(index + 1), x + 42, y + 12, 11, '#87958a', 'DM Mono, monospace');
    }
    this.promptText.setText(`Operación ${this.round} de 5 · elige 1, 2, 3 o 4`);
    this.scoreLabel(this.elapsedMs / 1000, 's');
  }

  private choose(index: number): void {
    if (index < 0 || index > 3 || this.ended) return;
    if (this.choices[index] === this.answer) {
      this.correct += 1;
      this.feedbackText.setText('¡Correcto!');
    } else this.feedbackText.setText(`No: ${this.left} ${this.operator} ${this.right} = ${this.answer}.`);
    if (this.round >= 5) { this.finishTime(this.correct / 5); return; }
    this.round += 1;
    this.makeQuestion();
    this.drawQuestion();
  }

  pointerDown(x: number, y: number): void {
    if (x < 97 || x > 383 || y < 365 || y > 490) return;
    const col = x > 240 ? 1 : 0; const row = y > 432 ? 1 : 0;
    this.choose(row * 2 + col);
  }
  keyDown(event: KeyboardEvent): void { if (/^[1-4]$/.test(event.key)) this.choose(Number(event.key) - 1); }
}

class FoxDiceGame extends MiniGame {
  private round = 1;
  private dice: number[] = [];
  private answer = '';
  private expected = 0;
  private correct = 0;
  private readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];

  create(): void {
    this.chrome('Suma los cuatro dados y escribe el total con el teclado. Son tres rondas.');
    this.makeDice();
    this.drawDice();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    this.drawDice();
    if (expired) this.finishTime(this.correct / 3);
  }

  private makeDice(): void {
    this.dice = Array.from({ length: 4 }, () => Phaser.Math.Between(1, 6));
    this.expected = this.dice.reduce((sum, die) => sum + die, 0);
    this.answer = '';
  }

  private drawDice(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    for (let index = 0; index < 4; index += 1) {
      const x = 144 + index * 64;
      g.fillStyle(0xffffff).lineStyle(2, 0xe2dccf).fillRoundedRect(x - 25, 279, 50, 50, 11).strokeRoundedRect(x - 25, 279, 50, 50, 11);
      this.glyphText(String(this.dice[index]), x, 292, 26, '#314c3d', 'DM Mono, monospace');
    }
    g.fillStyle(0xf0ede4).fillRoundedRect(161, 342, 158, 45, 10);
    this.glyphText(this.answer || '¿Suma?', 240, 354, 21, '#314c3d', 'DM Mono, monospace');
    for (let index = 0; index < this.keys.length; index += 1) {
      const col = index % 3; const row = Math.floor(index / 3);
      const x = 159 + col * 81; const y = 414 + row * 28;
      g.fillStyle(0xffffff).lineStyle(1, 0xe2dccf).fillRoundedRect(x - 31, y - 11, 62, 22, 6).strokeRoundedRect(x - 31, y - 11, 62, 22, 6);
      this.glyphText(this.keys[index], x, y - 7, 12, '#314c3d', 'DM Mono, monospace');
    }
    this.promptText.setText(`Ronda ${this.round} de 3 · escribe la suma de los cuatro dados`);
    this.scoreLabel(this.elapsedMs / 1000, 's');
  }

  private press(value: string): void {
    if (value === '⌫') this.answer = this.answer.slice(0, -1);
    else if (value === 'OK') this.submit();
    else if (this.answer.length < 2) this.answer += value;
    this.drawDice();
  }

  private submit(): void {
    if (!this.answer) return;
    if (Number(this.answer) === this.expected) {
      this.correct += 1;
      this.feedbackText.setText('¡Suma correcta!');
      if (this.round >= 3) { this.finishTime(1); return; }
      this.round += 1;
      this.makeDice();
    } else {
      this.feedbackText.setText('Esa suma no coincide. Prueba otra vez.');
      this.answer = '';
    }
    this.drawDice();
  }

  pointerDown(x: number, y: number): void {
    if (x < 119 || x > 361 || y < 399 || y > 508) return;
    const col = Phaser.Math.Clamp(Math.floor((x - 119) / 81), 0, 2);
    const row = Phaser.Math.Clamp(Math.floor((y - 399) / 28), 0, 3);
    this.press(this.keys[row * 3 + col]);
  }
  keyDown(event: KeyboardEvent): void {
    if (/^\d$/.test(event.key)) this.press(event.key);
    else if (event.key === 'Backspace') { event.preventDefault(); this.press('⌫'); }
    else if (event.key === 'Enter') { event.preventDefault(); this.press('OK'); }
  }
}

class CrowCountGame extends MiniGame {
  private phase: 'show' | 'answer' = 'show';
  private phaseMs = 0;
  private displayMs = 1150;
  private level = 1;
  private targetCount = 0;
  private answer = 0;
  private lives = 3;
  private correct = 0;
  private mistakes = 0;

  create(): void {
    this.chrome('Cuenta las cajas que aparecen. Después usa − y + y pulsa OK. Tienes tres vidas.');
    this.newRound();
    this.drawBoxes();
  }

  update(delta: number): void {
    if (this.ended) return;
    const expired = this.tick(delta);
    if (this.phase === 'show') {
      this.phaseMs -= delta;
      if (this.phaseMs <= 0) this.phase = 'answer';
    }
    this.drawBoxes();
    if (expired) this.finish(this.level - 1, this.correct / Math.max(1, this.correct + this.mistakes));
  }

  private newRound(): void {
    this.targetCount = Phaser.Math.Between(4, Math.min(18, 4 + this.level));
    this.answer = 0;
    this.displayMs = Math.max(520, 1250 - this.level * 36);
    this.phaseMs = this.displayMs;
    this.phase = 'show';
  }

  private drawBoxes(): void {
    this.beginGlyphFrame();
    const g = this.graphics;
    g.clear();
    if (this.phase === 'show') {
      for (let index = 0; index < this.targetCount; index += 1) {
        const col = index % 5; const row = Math.floor(index / 5);
        const x = 112 + col * 56; const y = 296 + row * 35;
        g.fillStyle(0xc59663).lineStyle(2, 0x815f42).fillRoundedRect(x - 19, y - 15, 38, 30, 5).strokeRoundedRect(x - 19, y - 15, 38, 30, 5);
        g.lineStyle(1, 0xe2c69f).lineBetween(x - 17, y, x + 17, y);
      }
    }
    this.glyphText(this.phase === 'show' ? '¡Mira las cajas!' : `¿Cuántas viste?  ${this.answer}`, 240, 434, 20, '#314c3d');
    for (const [x, label] of [[145, '−'], [240, 'OK'], [335, '+']] as const) {
      g.fillStyle(0xffffff).lineStyle(2, 0xe2dccf).fillRoundedRect(x - 34, 474, 68, 34, 8).strokeRoundedRect(x - 34, 474, 68, 34, 8);
      this.glyphText(label, x, 482, 15, '#314c3d', 'DM Mono, monospace');
    }
    this.promptText.setText(this.phase === 'show' ? `Nivel ${this.level} · cuenta antes de que desaparezcan` : `Nivel ${this.level} · ♥ ${this.lives} · responde con − / +`);
    this.scoreLabel(this.level - 1, 'niveles');
  }

  private submit(): void {
    if (this.phase !== 'answer') return;
    if (this.answer === this.targetCount) {
      this.correct += 1;
      this.level += 1;
      this.feedbackText.setText(`¡Correcto! Nivel ${this.level}.`);
      this.newRound();
    } else {
      this.mistakes += 1;
      this.lives -= 1;
      this.feedbackText.setText(`Eran ${this.targetCount} · quedan ${this.lives} vidas.`);
      if (this.lives <= 0) { this.finish(this.level - 1, this.correct / Math.max(1, this.correct + this.mistakes)); return; }
      this.phase = 'show'; this.phaseMs = Math.max(520, this.displayMs * 0.75); this.answer = 0;
    }
    this.drawBoxes();
  }

  pointerDown(x: number, y: number): void {
    if (this.phase !== 'answer' || y < 456 || y > 515) return;
    if (x < 194) this.answer = Math.max(0, this.answer - 1);
    else if (x > 286) this.answer += 1;
    else this.submit();
    this.drawBoxes();
  }
  keyDown(event: KeyboardEvent): void {
    if (this.phase !== 'answer') return;
    if (event.key === '+' || event.key === 'ArrowUp') { event.preventDefault(); this.answer += 1; this.drawBoxes(); }
    else if (event.key === '-' || event.key === 'ArrowDown') { event.preventDefault(); this.answer = Math.max(0, this.answer - 1); this.drawBoxes(); }
    else if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); this.submit(); }
  }
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
