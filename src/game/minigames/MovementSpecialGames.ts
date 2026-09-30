import { createGameChrome, drawPlayfield, animalGlyph, beginAnimalFrame } from '../presentation';
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
    const chrome = createGameChrome(this.scene, this.game, instructions);
    this.graphics = chrome.graphics;
    this.scoreText = chrome.scoreText;
    this.timerText = chrome.timerText;
    this.promptText = chrome.promptText;
    this.feedbackText = chrome.feedbackText;
  }

  protected panel(): void { drawPlayfield(this.graphics, this.game); }

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

  protected glyphFrame(): void { beginAnimalFrame(this.scene); this.glyphCursor = 0; this.glyphs.forEach((glyph) => glyph.setVisible(false)); }

  protected glyph(value: string, x: number, y: number, size = 20, color = '#263d34', font = 'DM Sans, sans-serif'): void {
    if (animalGlyph(this.scene, value, x, y, size)) return;
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
  private lives = 3;
  private phase: 'swing' | 'flight' | 'recover' = 'swing';
  private player = { x: 240, y: 375, vx: 0, vy: 0 };
  private direction = 1;
  private recoverMs = 0;
  private trail: Point[] = [];

  create(): void { this.chrome('Balancea al pingüino y toca para saltar. Aterriza sobre la plataforma helada: el centro da +10 m.'); this.draw(); }
  private angle(): number { return Math.sin(this.elapsedMs / 600) * .95; }
  private launchValues(): {x:number;y:number;vx:number;vy:number} {
    const a=this.angle();
    return {x:240+Math.sin(a)*100,y:285+Math.cos(a)*90,vx:this.direction*(150+Math.cos(a)*20),vy:-130-Math.sin(a)*90};
  }
  update(delta: number): void {
    if (this.tick(delta)) { this.finish(this.score, this.perfect / Math.max(1, this.attempts)); return; }
    if(this.phase==='flight') {
      const steps=Math.max(1,Math.ceil(delta/16)),dt=delta/steps/1000;
      for(let step=0;step<steps && this.phase==='flight';step++) {
        const oldY=this.player.y;
        this.player.vy+=650*dt;this.player.x+=this.player.vx*dt;this.player.y+=this.player.vy*dt;
        if(oldY<=430 && this.player.y>=430 && this.player.vy>0) {
          const error=Math.abs(this.player.x-(this.direction>0?350:130));
          if(error<45) {
            const perfect=error<17;this.score+=perfect?10:5;this.perfect+=perfect?1:0;
            this.feedbackText.setText(perfect?'¡Aterrizaje perfecto! +10 m':'¡Buen salto! +5 m');
            this.direction*=-1;this.phase='recover';this.recoverMs=500;
          }
        }
        if(this.player.y>530 || this.player.x<-10 || this.player.x>490) this.miss();
      }
      this.trail.push({x:this.player.x,y:this.player.y});if(this.trail.length>14)this.trail.shift();
    } else if(this.phase==='recover') { this.recoverMs-=delta;if(this.recoverMs<=0)this.phase='swing'; }
    this.draw();
  }
  private miss():void {this.lives--;this.phase='recover';this.recoverMs=650;this.feedbackText.setText(`¡Al agua! Te quedan ${this.lives} vidas.`);if(!this.lives)this.finish(this.score,this.perfect/Math.max(1,this.attempts));}
  private tap(): void { if(this.ended || this.phase!=='swing')return;this.attempts++;this.player=this.launchValues();this.phase='flight';this.trail=[]; }
  private draw(): void {
    this.panel(); this.glyphFrame(); this.metric(this.score, 'm');
    const g=this.graphics,target=this.direction>0?350:130;
    this.promptText.setText(`Salta hacia la plataforma · ♥ ${this.lives}`);
    g.fillStyle(0xb0dce7).fillRoundedRect(47,233,386,286,22);
    g.fillStyle(0xeaf9fc).fillTriangle(50,470,145,287,260,470).fillTriangle(222,480,358,265,433,480);
    g.fillStyle(0x74bbd2).fillRect(48,486,384,33);
    for(let i=0;i<5;i++)g.lineStyle(2,0xc8f1f7,.6).lineBetween(56+i*81,503,101+i*81,503);
    g.fillStyle(0x6bacbf).fillRoundedRect(target-45,434,90,34,8);
    g.fillStyle(0xf8ffff).fillRoundedRect(target-45,429,90,11,5);
    g.fillStyle(0x7ecb8b).fillRoundedRect(target-17,429,34,9,4);
    g.fillStyle(0x6e8fa2).fillCircle(240,285,8);
    const p=this.phase==='swing'?this.launchValues():this.player;
    if(this.phase==='swing') {
      g.lineStyle(3,0x668fa2).lineBetween(240,285,p.x,p.y);
      const t=(-p.vy+Math.sqrt(p.vy*p.vy+2*650*(430-p.y)))/650;
      const landing=p.x+p.vx*t;
      for(let i=1;i<=12;i++){const time=t*i/12;g.fillStyle(Math.abs(landing-target)<45?0x4d9a77:0xffffff,.6).fillCircle(p.x+p.vx*time,p.y+p.vy*time+325*time*time,2);}
      this.glyph('TOCA PARA SOLTAR',240,630,16,'#35677b');
    }
    this.trail.forEach((point,i)=>g.fillStyle(0xffffff,i/this.trail.length*.65).fillCircle(point.x,point.y,3));
    this.glyph('🐧',p.x,p.y,32);
    this.glyph(`${this.score} metros escalados`,240,677,13,'#456a76','DM Mono, monospace');
  }
  pointerDown(_x:number,y:number):void {if(y>=235)this.tap();}
  keyDown(event:KeyboardEvent):void {if(event.code==='Space'||event.key==='Enter'){event.preventDefault();this.tap();}}
}

class LemurSwingGame extends MovementSpecialGame {
  private score=0;
  private attempts=0;
  private successful=0;
  private lives=3;
  private phase:'waiting'|'swing'|'flight'|'recover'='waiting';
  private angle=-1;
  private recoverMs=0;
  private player={x:156,y:354,vx:0,vy:0};
  private trail:Point[]=[];
  create():void {this.chrome('Mantén para engancharte a la liana. Suelta cuando el lémur mire hacia la plataforma siguiente.');this.draw();}
  update(delta:number):void {
    if(this.tick(delta)){this.finish(this.score,this.successful/Math.max(1,this.attempts));return;}
    const dt=delta/1000;
    if(this.phase==='swing'){
      this.angle+=dt*2;this.player.x=240+Math.sin(this.angle)*100;this.player.y=285+Math.cos(this.angle)*100;
      if(this.angle>1.25)this.release();
    }else if(this.phase==='flight'){
      const steps=Math.max(1,Math.ceil(delta/16)),sub=dt/steps;
      for(let i=0;i<steps&&this.phase==='flight';i++){
        const y=this.player.y;this.player.vy+=700*sub;this.player.x+=this.player.vx*sub;this.player.y+=this.player.vy*sub;
        if(y<=435&&this.player.y>=435&&this.player.vy>0&&Math.abs(this.player.x-360)<42){
          this.score++;this.successful++;this.feedbackText.setText('¡De liana en liana! +1');this.phase='recover';this.recoverMs=550;
        }
        if(this.player.x>455||this.player.y>527){this.lives--;this.feedbackText.setText(`Caíste de la liana · ♥ ${this.lives}`);this.phase='recover';this.recoverMs=650;if(!this.lives)this.finish(this.score,this.successful/Math.max(1,this.attempts));}
      }
      this.trail.push({x:this.player.x,y:this.player.y});if(this.trail.length>12)this.trail.shift();
    }else if(this.phase==='recover'){this.recoverMs-=delta;if(this.recoverMs<=0){this.phase='waiting';this.angle=-1;this.player={x:156,y:354,vx:0,vy:0};}}
    this.draw();
  }
  private attach():void{if(this.ended||this.phase!=='waiting')return;this.phase='swing';this.angle=-1;this.trail=[];}
  private release():void{
    if(this.ended||this.phase!=='swing')return;this.attempts++;this.phase='flight';this.player.vx=Math.cos(this.angle)*230;this.player.vy=-Math.sin(this.angle)*190-100;
  }
  private draw():void{
    this.panel();this.glyphFrame();this.metric(this.score,'puntos');const g=this.graphics;
    this.promptText.setText(this.phase==='waiting'?`Mantén para agarrar la liana · ♥ ${this.lives}`:this.phase==='swing'?'Suelta al pasar por la zona verde':'¡Busca la siguiente plataforma!');
    g.fillStyle(0x88b995,.2).fillCircle(115,294,65).fillCircle(365,304,70);
    g.fillStyle(0xa18159).fillRoundedRect(74,445,109,15,6).fillRoundedRect(318,438,85,17,6);
    g.fillStyle(0x7bc58c).fillRoundedRect(318,432,85,10,5);
    g.lineStyle(4,0x597954).lineBetween(240,244,240,285);
    g.lineStyle(4,0xb8d58b,.7).beginPath().arc(240,285,100,.35,2.75,false).strokePath();
    g.lineStyle(8,0x66b289).beginPath().arc(240,285,100,1.4,1.72,false).strokePath();
    if(this.phase==='waiting'||this.phase==='swing')g.lineStyle(3,0x91a362).lineBetween(240,285,this.player.x,this.player.y);
    this.trail.forEach((p,i)=>g.fillStyle(0xe6efc7,i/this.trail.length).fillCircle(p.x,p.y,3));
    this.glyph('🐒',this.player.x,this.player.y,32);
    this.glyph(this.phase==='swing'?'SUELTA':'MANTÉN PARA AGARRAR',240,630,16,'#3d6c4c');
    this.glyph('Espacio: agarrar / soltar',240,670,12,'#5d796b','DM Mono, monospace');
  }
  pointerDown(_x:number,y:number):void{if(y>=235)this.attach();}
  pointerUp():void{this.release();}
  keyDown(event:KeyboardEvent):void{if(event.code==='Space'||event.key==='Enter'){event.preventDefault();if(this.phase==='waiting')this.attach();else this.release();}}
}

class CheetahZigzagGame extends MovementSpecialGame {
  private score=0;
  private lives=3;
  private turns=0;
  private hit=0;
  private along=0;
  private segment=0;
  private recovery=0;
  private path:Point[]=[];
  create():void{this.chrome('Toca antes de cada curva para derrapar. Si no giras a tiempo, el guepardo se sale de la pista.');this.path=Array.from({length:7},(_,i)=>({x:i%2?340:140,y:275+i*35}));this.draw();}
  update(delta:number):void{
    if(this.tick(delta)){this.finish(this.score,this.hit/Math.max(1,this.turns));return;}
    if(this.recovery>0){this.recovery-=delta;this.draw();return;}
    this.along+=delta/Math.max(600,1250-this.score*15);
    if(this.along>1.12){this.turns++;this.lives--;this.feedbackText.setText(`Te saliste de la curva · ♥ ${this.lives}`);this.along=0;this.segment=(this.segment+1)%6;this.recovery=450;if(!this.lives){this.finish(this.score,this.hit/Math.max(1,this.turns));return;}}
    this.draw();
  }
  private tap():void{
    if(this.ended||this.recovery>0)return;
    if(this.along<.66){this.feedbackText.setText('Todavía falta: espera a la curva.');return;}
    this.turns++;this.hit++;this.score++;this.feedbackText.setText(this.along>.85?'¡Derrape perfecto! +1':'¡Buena curva! +1');this.segment=(this.segment+1)%6;this.along=0;this.draw();
  }
  private draw():void{
    this.panel();this.glyphFrame();this.metric(this.score,'curvas');const g=this.graphics;
    this.promptText.setText(`Gira cuando el guepardo llegue a la marca · ♥ ${this.lives}`);
    for(let i=1;i<this.path.length;i++){g.lineStyle(30,0xc6cfab).lineBetween(this.path[i-1].x,this.path[i-1].y,this.path[i].x,this.path[i].y);g.lineStyle(2,0xfffdf3,.8).lineBetween(this.path[i-1].x,this.path[i-1].y,this.path[i].x,this.path[i].y);}
    const a=this.path[this.segment],b=this.path[this.segment+1],t=Math.min(1.13,this.along);
    g.fillStyle(this.along>.66?0x77b876:0xe5a25a).fillCircle(b.x,b.y,18);g.lineStyle(3,0xffffff).strokeCircle(b.x,b.y,13);
    this.glyph('🐆',a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,26);
    g.fillStyle(0xd1dfc3).fillRoundedRect(95,615,290,12,6);g.fillStyle(this.along>.66?0x71a97a:0xe5a15b).fillRoundedRect(95,615,290*Math.min(1,this.along),12,6);
    this.glyph(this.along>.66?'¡GIRA AHORA!':'ACÉRCATE A LA CURVA',240,658,14,'#416943','DM Mono, monospace');
  }
  pointerDown(_x:number,y:number):void{if(y>=235)this.tap();}
  keyDown(event:KeyboardEvent):void{if(event.code==='Space'||event.key==='Enter'){event.preventDefault();this.tap();}}
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
