import type Phaser from 'phaser';
import type { GameManifest } from '../data/games';
import { animalKey } from './animalArt';

interface Theme { sky: number; ground: number; panel: number; ink: string; accent: number; type: 'ice' | 'space' | 'sea' | 'forest' | 'sunset'; }
export function gameTheme(game: GameManifest): Theme {
  if (/espacial|electrica|propulsado/.test(game.id)) return { sky: 0x142646, ground: 0x213b60, panel: 0xe3edf9, ink: '#eef7ff', accent: 0x79e2d9, type: 'space' };
  if (/pinguino|foca|lobo/.test(game.id)) return { sky: 0xb7dfed, ground: 0xeaf6f5, panel: 0xe9f8fa, ink: '#244457', accent: 0x4da4c4, type: 'ice' };
  if (/medusa|pulpo|sepia|nutria|suricatas|cangrejo|anguila/.test(game.id)) return { sky: 0xa3ded9, ground: 0x388f9e, panel: 0xe4f5ed, ink: '#173f52', accent: 0x279b98, type: 'sea' };
  if (game.category === 'Velocidad contra reloj' || /guepardo|liebre|jirafa|gallo|vencejo/.test(game.id)) return { sky: 0xf4d196, ground: 0xd99568, panel: 0xfff2d8, ink: '#624735', accent: 0xde8057, type: 'sunset' };
  return { sky: 0xc0dcc5, ground: 0x72a187, panel: 0xf2f7e8, ink: '#234638', accent: 0x5a9c76, type: 'forest' };
}

export function controlHint(game: GameManifest): string {
  if (/medusa|pulga|rastro|golf|nutria|lobo|oso/.test(game.id)) return 'ARRASTRA Y SUELTA · RATÓN O DEDO';
  if (/raton|erizo|serpiente|burro|escarabajo/.test(game.id)) return 'DESLIZA O USA LAS FLECHAS';
  if (/dictado|telefonista|piton|dados/.test(game.id)) return 'TECLADO EN PANTALLA O CIFRAS 0–9';
  if (/camaleon|mantis|rana|lemur/.test(game.id)) return 'MANTÉN Y SUELTA · ESPACIO';
  if (/flamenco|tucan|foca|libelula|abejorro/.test(game.id)) return 'ARRASTRA PARA MOVER · FLECHAS';
  return 'TOCA LA ZONA DE JUEGO · TECLADO COMPATIBLE';
}

interface Chrome { graphics: Phaser.GameObjects.Graphics; scoreText: Phaser.GameObjects.Text; timerText: Phaser.GameObjects.Text; promptText: Phaser.GameObjects.Text; feedbackText: Phaser.GameObjects.Text; }
const chromes = new WeakMap<Phaser.Scene, Chrome>();
const animals = new WeakMap<Phaser.Scene, { images: Phaser.GameObjects.Image[]; cursor: number }>();
export function beginAnimalFrame(scene: Phaser.Scene): void {
  const pool = animals.get(scene);
  if (pool) { pool.cursor = 0; pool.images.forEach(image => image.setVisible(false)); }
}

export function animalGlyph(scene: Phaser.Scene, value: string, x: number, y: number, size: number): boolean {
  const key = animalKey(value);
  if (!key || !scene.textures?.exists(key)) return false;
  let pool = animals.get(scene);
  if (!pool) { pool = { images: [], cursor: 0 }; animals.set(scene, pool); }
  let image = pool.images[pool.cursor];
  if (!image) { image = scene.add.image(x, y, key).setDepth(5); pool.images.push(image); }
  image.setTexture(key).setPosition(x, y).setDisplaySize(size * 1.6, size * 1.6).setVisible(true);
  pool.cursor++;
  return true;
}

export function createGameChrome(scene: Phaser.Scene, game: GameManifest, instructions: string): Chrome {
  const theme = gameTheme(game);
  const bg = scene.add.graphics();
  bg.fillGradientStyle(theme.sky, theme.sky, theme.ground, theme.ground, 1).fillRect(0, 0, 480, 720);
  if (theme.type === 'space') {
    for (let i = 0; i < 60; i++) bg.fillStyle(0xe9f7ff, 0.22 + (i % 4) * 0.16).fillCircle((i * 137 + 23) % 480, (i * 83 + 13) % 720, i % 3 === 0 ? 2 : 1);
    bg.fillStyle(0x7a68b4, 0.28).fillCircle(406, 203, 56).fillCircle(426, 608, 121);
    bg.lineStyle(3, 0xb1a2e3, 0.2).strokeEllipse(404, 203, 152, 30);
  } else {
    bg.fillStyle(0xfff5ca, 0.6).fillCircle(390, 211, 46);
    for (let i = 0; i < 5; i++) {
      bg.fillStyle(0xffffff, 0.18).fillEllipse(45 + i * 119, 181 + (i % 2) * 65, 106, 31);
      const x = i * 130 - 50;
      bg.fillStyle(theme.ground, 0.3).fillTriangle(x - 70, 680, x + 80, 394 + i % 2 * 80, x + 200, 680);
    }
    if (theme.type === 'forest') for(let i=0;i<6;i++) {
      bg.fillStyle(0x2a6855, 0.16).fillRoundedRect(i * 92 - 20, 390 + i % 2 * 48, 36, 330, 14);
      bg.fillStyle(0x38795c, 0.17).fillCircle(i * 92, 388 + i % 2 * 48, 62);
    }
    if (theme.type === 'sea') for(let i=0;i<10;i++) bg.lineStyle(2, 0xd9ffff, 0.22).strokeCircle(22 + (i * 71) % 460, 285 + (i * 59) % 400, 5 + i % 4 * 3);
  }
  bg.fillStyle(0xffffff, theme.type === 'space' ? 0.08 : 0.56).fillRoundedRect(16, 16, 448, 125, 23);
  bg.fillStyle(0xffffff, theme.type === 'space' ? 0.07 : 0.3).fillRoundedRect(22, 582, 436, 113, 22);
  const base = { fontFamily: 'DM Sans, sans-serif', color: theme.ink };
  scene.add.text(30, 25, 'ZOO / ARCADE', { ...base, fontSize: '10px', fontStyle: 'bold', letterSpacing: 2 });
  scene.add.text(30, 48, game.name, { ...base, fontSize: game.name.length > 23 ? '23px' : '27px', fontStyle: 'bold', wordWrap: { width: 405 } });
  bg.fillStyle(0xffffff, theme.type === 'space' ? 0.09 : 0.55).fillRoundedRect(28, 94, 304, 34, 12).fillRoundedRect(345, 94, 105, 34, 12);
  const scoreText = scene.add.text(40, 102, `${game.metric}: 0`, { ...base, fontFamily: 'DM Mono, monospace', fontSize: '13px', fontStyle: 'bold' }).setDepth(8);
  const timerText = scene.add.text(434, 102, `${String(Math.floor(game.durationSec / 60)).padStart(2, '0')}:${String(game.durationSec % 60).padStart(2, '0')}`, { ...base, fontFamily: 'DM Mono, monospace', fontSize: '15px', fontStyle: 'bold' }).setOrigin(1, 0).setDepth(8);
  const promptText = scene.add.text(240, 178, instructions, { ...base, fontSize: '16px', fontStyle: 'bold', align: 'center', wordWrap: { width: 410 }, lineSpacing: 4 }).setOrigin(0.5).setDepth(8);
  bg.fillStyle(0xf5fbf6, 0.88).fillRoundedRect(29, 530, 422, 43, 14);
  const feedbackText = scene.add.text(240, 550, '', { ...base, fontSize: '16px', fontStyle: 'bold', align: 'center', wordWrap: { width: 405 } }).setOrigin(0.5).setDepth(8);
  scene.add.text(240, 705, controlHint(game), { ...base, fontFamily: 'DM Mono, monospace', fontSize: '9px', align: 'center' }).setOrigin(0.5).setAlpha(0.8);
  const graphics = scene.add.graphics();
  const chrome = { graphics, scoreText, timerText, promptText, feedbackText };
  chromes.set(scene, chrome);
  return chrome;
}

export function drawPlayfield(g: Phaser.GameObjects.Graphics, game: GameManifest): void {
  const t = gameTheme(game);
  g.clear();
  g.fillStyle(0x163c42, 0.12).fillRoundedRect(45, 240, 390, 289, 25);
  g.fillStyle(t.panel, 0.97).lineStyle(2, 0xffffff, 0.46).fillRoundedRect(44, 230, 392, 292, 25).strokeRoundedRect(44, 230, 392, 292, 25);
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: number; }
export class GameEffects {
  private g: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private feedback = '';
  private score = '';
  private audio?: AudioContext;
  public muted = true;
  constructor(private scene: Phaser.Scene) { this.g = scene.add.graphics().setDepth(30); }
  tap(x: number, y: number): void { this.burst(x, y, 0xffffff, 6); }
  private burst(x: number, y: number, color: number, amount = 15): void {
    for(let i=0;i<amount;i++) {
      const a = i / amount * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * (45 + Math.random()*60), vy: Math.sin(a) * 65 - 20, life: 500 + Math.random()*200, color });
    }
  }
  private beep(good: boolean): void {
    if(this.muted || typeof window === 'undefined') return;
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
      const osc=this.audio.createOscillator(), gain=this.audio.createGain(), now=this.audio.currentTime;
      osc.type=good ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(good ? 520 : 160, now);
      osc.frequency.exponentialRampToValueAtTime(good ? 880 : 90, now+0.12);
      gain.gain.setValueAtTime(0.055,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.16);
      osc.connect(gain);gain.connect(this.audio.destination);osc.start(now);osc.stop(now+0.18);
    } catch { /* Audio can remain unavailable until the first gesture. */ }
  }
  update(delta: number): void {
    const chrome = chromes.get(this.scene);
    if(chrome) {
      const value=chrome.feedbackText.text;
      if(value && value!==this.feedback) {
        this.feedback=value;
        const bad=/incorrect|choc|pincho|no era|error|ca[ií]|fuera|perdis|cuidado|rompi|desapareci|fall|no acert|saliste/i.test(value);
        chrome.feedbackText.setColor(bad ? '#bd4d52' : '#235e54');
        if(bad) { this.scene.cameras.main.shake(95,0.003); this.beep(false); }
        else if(/perfect|correct|buena|acierto|\+\d|patr[oó]n correcto|encest|clavada|meta|seguro/i.test(value)) {
          this.burst(240, 510, 0xf6c568);this.beep(true);
        }
      }
      if(chrome.scoreText.text!==this.score) {
        if(this.score) this.scene.tweens.add({targets:chrome.scoreText,scaleX:1.055,scaleY:1.055,duration:85,yoyo:true});
        this.score=chrome.scoreText.text;
      }
    }
    this.g.clear();
    this.particles=this.particles.filter(p=>p.life>0);
    for(const p of this.particles) {
      p.life-=delta;p.x+=p.vx*delta/1000;p.y+=p.vy*delta/1000;p.vy+=140*delta/1000;
      this.g.fillStyle(p.color,Math.min(1,p.life/250)).fillCircle(p.x,p.y,Math.max(1,p.life/200));
    }
  }
  destroy(): void { void this.audio?.close(); this.g.destroy(); }
}
