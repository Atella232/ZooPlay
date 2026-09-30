import type Phaser from 'phaser';
import type { GameManifest } from '../../data/games';
import type { RunResult } from '../ArcadeScene';
import type { DedicatedGame } from './VerticalSlice';
import { createGameChrome, drawPlayfield, animalGlyph, beginAnimalFrame } from '../presentation';

type Point = { x: number; y: number };
type Finish = (result: RunResult) => void;
export function createPolishedClassicGame(scene: Phaser.Scene, game: GameManifest, finish: Finish): DedicatedGame | undefined {
  switch (game.id) {
    case 'jirafa-apiladora': return new StackTowerGame(scene, game, finish);
    case 'foca-malabarista': return new SealJuggleGame(scene, game, finish);
    case 'burro-de-carga': return new DonkeyPuzzleGame(scene, game, finish);
    case 'escarabajo-pelotero': return new BeetleRollGame(scene, game, finish);
    default: return undefined;
  }
}
abstract class ClassicGame implements DedicatedGame {
  protected g!: Phaser.GameObjects.Graphics;
  protected scoreText!: Phaser.GameObjects.Text;
  protected timer!: Phaser.GameObjects.Text;
  protected prompt!: Phaser.GameObjects.Text;
  protected feedback!: Phaser.GameObjects.Text;
  protected elapsed = 0;
  protected ended = false;
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  constructor(protected scene: Phaser.Scene, protected game: GameManifest, private finishRun: Finish) {}
  protected chrome(instructions: string): void {
    const c = createGameChrome(this.scene, this.game, instructions);
    this.g=c.graphics;this.scoreText=c.scoreText;this.timer=c.timerText;this.prompt=c.promptText;this.feedback=c.feedbackText;
  }
  protected frame(): void { drawPlayfield(this.g,this.game);beginAnimalFrame(this.scene);this.cursor=0;this.labels.forEach(l=>l.setVisible(false)); }
  protected label(value:string,x:number,y:number,size=16,color='#315948'):void {
    if(animalGlyph(this.scene,value,x,y,size))return;
    let text=this.labels[this.cursor];if(!text){text=this.scene.add.text(x,y,'',{fontFamily:'DM Sans, sans-serif',fontSize:`${size}px`,color}).setOrigin(.5).setDepth(5);this.labels.push(text);}
    text.setPosition(x,y).setText(value).setStyle({fontSize:`${size}px`,color}).setVisible(true);this.cursor++;
  }
  protected tick(delta:number):boolean {if(this.ended)return true;this.elapsed+=delta;const s=Math.ceil(Math.max(0,this.game.durationSec*1000-this.elapsed)/1000);this.timer.setText(`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`);return s<=0;}
  protected metric(score:number,unit=this.game.unit):void {this.scoreText.setText(`${this.game.metric}: ${new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(score)} ${unit}`);}
  protected finish(score:number,accuracy:number):void {if(this.ended)return;this.ended=true;this.finishRun({score:Math.max(0,score),elapsedMs:Math.max(1,this.elapsed),accuracy:Math.max(0,Math.min(1,accuracy))});}
  abstract create():void;
  abstract update(delta:number):void;
  pointerDown(_x:number,_y:number):void {}
  pointerMove(_x:number,_y:number,_down:boolean):void {}
  pointerUp(_x:number,_y:number):void {}
  keyDown(_event:KeyboardEvent):void {}
}

class StackTowerGame extends ClassicGame {
  private blocks = [{ x: 240, width: 180 }];
  private movingX=151;
  private direction=1;
  private falling=false;
  private fallY=0;
  private dropX=0;
  private score=0;
  private perfects=0;
  private streak=0;
  private failedMs=0;
  private fragments:{x:number;y:number;width:number;vy:number}[]=[];
  create():void{this.chrome('Toca para soltar el bloque. Alinea los bordes: tres perfectos seguidos recuperan anchura.');this.draw();}
  private topY():number{return 485-Math.min(5,this.blocks.length-1)*31;}
  update(delta:number):void{
    if(this.tick(delta)){this.finish(this.score,this.perfects/Math.max(1,this.score));return;}
    const dt=delta/1000;
    if(this.failedMs>0){this.failedMs-=delta;if(this.failedMs<=0){this.finish(this.score,this.perfects/Math.max(1,this.score));return;}}
    else if(this.falling){this.fallY+=dt*440;if(this.fallY>=this.topY()-31)this.land();}
    else {this.movingX+=this.direction*dt*(135+Math.min(145,this.score*8));const half=this.blocks.at(-1)!.width/2;if(this.movingX>419-half){this.movingX=419-half;this.direction=-1;}if(this.movingX<61+half){this.movingX=61+half;this.direction=1;}}
    for(const f of this.fragments){f.vy+=600*dt;f.y+=f.vy*dt;}this.fragments=this.fragments.filter(f=>f.y<525);this.draw();
  }
  private drop():void{if(this.ended||this.falling||this.failedMs>0)return;this.dropX=this.movingX;this.fallY=this.topY()-105;this.falling=true;}
  private land():void{
    const top=this.blocks.at(-1)!,left=Math.max(this.dropX-top.width/2,top.x-top.width/2),right=Math.min(this.dropX+top.width/2,top.x+top.width/2),overlap=right-left;
    this.falling=false;
    if(overlap<10){this.failedMs=500;this.feedback.setText('¡La torre se cayó!');return;}
    const perfect=Math.abs(this.dropX-top.x)<6;let width=perfect?top.width:overlap;let x=perfect?top.x:(left+right)/2;
    if(perfect){this.perfects++;this.streak++;this.feedback.setText(`¡Perfecto! ×${this.streak}`);if(this.streak%3===0){width=Math.min(180,width+12);this.feedback.setText('¡Tres perfectos! Recuperas anchura.');}}
    else {this.streak=0;this.feedback.setText('¡Bloque colocado!');const cut=top.width-overlap;this.fragments.push({x:this.dropX>top.x?right+cut/2:left-cut/2,y:this.topY()-31,width:cut,vy:0});}
    this.score++;this.blocks.push({x,width});this.movingX=this.direction>0?61+width/2:419-width/2;
  }
  private draw():void{
    this.frame();this.metric(this.score,'bloques');const g=this.g;
    this.prompt.setText(`Piso ${this.score+1} · ${this.streak?`racha ×${this.streak}`:'alinea los bordes'}`);
    g.fillStyle(0xe6d6b4).fillRoundedRect(61,498,358,19,6);
    const start=Math.max(0,this.blocks.length-6),colors=[0xe9b552,0x6ea8a0,0xdf8c71,0x9594be];
    this.blocks.slice(start).forEach((b,i)=>{const y=485-i*31;g.fillStyle(0x39514a,.12).fillRoundedRect(b.x-b.width/2+3,y+4,b.width,28,5);g.fillStyle(colors[(start+i)%4]).fillRoundedRect(b.x-b.width/2,y,b.width,27,5);g.fillStyle(0xffffff,.3).fillRoundedRect(b.x-b.width/2+4,y+3,b.width-8,5,2);});
    const width=this.blocks.at(-1)!.width,y=this.falling?this.fallY:this.topY()-105,x=this.falling?this.dropX:this.movingX;
    g.fillStyle(0xf4c871).fillRoundedRect(x-width/2,y,width,27,5);g.fillStyle(0xfff4c2).fillRoundedRect(x-width/2+3,y+3,width-6,5,2);
    g.lineStyle(1,0x75927a,.55).lineBetween(this.blocks.at(-1)!.x-width/2,244,this.blocks.at(-1)!.x-width/2,495);
    for(const f of this.fragments)g.fillStyle(0xe7a867,.6).fillRect(f.x-f.width/2,f.y,f.width,27);
    this.label('🦒',388,458,32);this.label('TOCA PARA SOLTAR',240,630,18);this.label('Tres perfectos = torre más ancha',240,668,12);
  }
  pointerDown(_x:number,y:number):void{if(y>230)this.drop();}
  keyDown(e:KeyboardEvent):void{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();this.drop();}}
}

class SealJuggleGame extends ClassicGame {
  private paddle=240;
  private aim=240;
  private ball={x:220,y:310,vx:80,vy:-170};
  private score=0;
  private lives=3;
  private cooldown=0;
  private trail:Point[]=[];
  create():void{this.chrome('Arrastra la foca bajo la pelota. Cada rebote suma; controla el ángulo con el borde de su nariz.');this.draw();}
  update(delta:number):void{
    if(this.tick(delta)){this.finish(this.score,this.score/Math.max(1,this.score+3-this.lives));return;}
    const dt=delta/1000;this.paddle+=(this.aim-this.paddle)*Math.min(1,dt*14);
    if(this.cooldown>0){this.cooldown-=delta;this.draw();return;}
    const steps=Math.max(1,Math.ceil(delta/16)),sub=dt/steps;
    for(let i=0;i<steps;i++){
      const oldY=this.ball.y;this.ball.vy+=440*sub;this.ball.x+=this.ball.vx*sub;this.ball.y+=this.ball.vy*sub;
      if(this.ball.x<72||this.ball.x>408){this.ball.x=Math.max(72,Math.min(408,this.ball.x));this.ball.vx*=-1;}
      if(oldY<461&&this.ball.y>=461&&this.ball.vy>0&&Math.abs(this.ball.x-this.paddle)<53){this.ball.y=460;this.ball.vy=-Math.min(390,305+this.score*3);this.ball.vx=(this.ball.x-this.paddle)*3.2;this.score++;this.feedback.setText('¡Pelota arriba! +1');}
      if(this.ball.y>535){this.lives--;this.feedback.setText(`Se cayó la pelota · ♥ ${this.lives}`);if(!this.lives){this.finish(this.score,this.score/Math.max(1,this.score+3));return;}this.ball={x:160+(this.lives%2)*140,y:315,vx:55,vy:-155};this.cooldown=750;break;}
    }
    this.trail.push({x:this.ball.x,y:this.ball.y});if(this.trail.length>13)this.trail.shift();this.draw();
  }
  private draw():void{
    this.frame();this.metric(this.score,'toques');this.prompt.setText(`Mantén la pelota en el aire · ♥ ${this.lives}`);const g=this.g;
    g.fillStyle(0xbadfe4).fillRoundedRect(47,233,386,286,22);g.fillStyle(0xeaf9f9).fillEllipse(260,511,520,61);
    this.trail.forEach((p,i)=>g.fillStyle(0xffffff,i/this.trail.length*.5).fillCircle(p.x,p.y,4));
    g.fillStyle(0x6a98a9,.2).fillEllipse(this.ball.x,507,30+this.ball.y/50,8);
    g.fillStyle(0xf5bc5e).fillCircle(this.ball.x,this.ball.y,13);g.fillStyle(0xe7756a).fillTriangle(this.ball.x,this.ball.y-13,this.ball.x+13,this.ball.y,this.ball.x,this.ball.y+13);g.fillStyle(0xfff4ce).fillCircle(this.ball.x-4,this.ball.y-5,4);
    this.label('🦭',this.paddle,492,41);g.fillStyle(0x4e7e8d).fillRoundedRect(this.paddle-49,468,98,6,3);
    this.label('← ARRASTRA LA FOCA →',240,630,15);this.label('También puedes usar las flechas',240,669,12);
  }
  pointerDown(x:number,y:number):void{if(y>=230)this.aim=Math.max(97,Math.min(383,x));}
  pointerMove(x:number,_y:number,down:boolean):void{if(down)this.aim=Math.max(97,Math.min(383,x));}
  keyDown(e:KeyboardEvent):void{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.aim=Math.max(97,Math.min(383,this.aim+(e.key==='ArrowLeft'?-35:35)));}}
}

export const DONKEY_LEVELS = [
  ['#######','#.....#','#..G..#','#..B..#','#..P..#','#.....#','#######'],
  ['#######','#.G.G.#','#.B.B.#','#.....#','#..P..#','#.....#','#######'],
  ['#######','#..G..#','#..B..#','#G.B.G#','#..B..#','#..P..#','#######'],
];
class DonkeyPuzzleGame extends ClassicGame {
  private level=0;
  private map:string[]=[];
  private player:Point={x:3,y:4};
  private boxes:Point[]=[];
  private goals:Point[]=[];
  private history:{player:Point;boxes:Point[]}[]=[];
  private score=0;
  private moves=0;
  private nextMs=0;
  private swipe?:Point;
  create():void{this.chrome('Empuja las cajas a las estrellas. Desliza o usa las flechas; puedes deshacer y reiniciar el nivel.');this.load();this.draw();}
  private load():void{this.map=DONKEY_LEVELS[this.level%DONKEY_LEVELS.length];this.boxes=[];this.goals=[];this.history=[];for(let y=0;y<7;y++)for(let x=0;x<7;x++){const ch=this.map[y][x];if(ch==='B')this.boxes.push({x,y});if(ch==='G')this.goals.push({x,y});if(ch==='P')this.player={x,y};}}
  update(delta:number):void{if(this.tick(delta)){this.finish(this.score,1);return;}if(this.nextMs>0){this.nextMs-=delta;if(this.nextMs<=0){this.level++;this.load();}}this.draw();}
  private move(dx:number,dy:number):void{
    if(this.ended||this.nextMs>0)return;const x=this.player.x+dx,y=this.player.y+dy;if(this.map[y]?.[x]===undefined||this.map[y][x]==='#')return;
    const box=this.boxes.find(b=>b.x===x&&b.y===y);if(box&&(this.map[y+dy]?.[x+dx]==='#'||this.map[y+dy]?.[x+dx]===undefined||this.boxes.some(b=>b.x===x+dx&&b.y===y+dy)))return;
    this.history.push({player:{...this.player},boxes:this.boxes.map(b=>({...b}))});if(this.history.length>100)this.history.shift();
    this.player={x,y};if(box){box.x+=dx;box.y+=dy;}this.moves++;
    if(this.boxes.every(b=>this.goals.some(g=>b.x===g.x&&b.y===g.y))){this.score+=5;this.nextMs=700;this.feedback.setText('¡Nivel resuelto! +5 puntos');}this.draw();
  }
  private undo():void{if(this.nextMs>0||this.ended)return;const prev=this.history.pop();if(prev){this.player=prev.player;this.boxes=prev.boxes;this.feedback.setText('Movimiento deshecho.');this.draw();}}
  private draw():void{
    this.frame();this.metric(this.score,'puntos');this.prompt.setText(`Nivel ${this.level+1} · ${this.moves} movimientos`);const g=this.g,size=36,ox=114,oy=245;
    for(let y=0;y<7;y++)for(let x=0;x<7;x++){
      const sx=ox+x*size,sy=oy+y*size,wall=this.map[y][x]==='#';
      g.fillStyle(wall?0x718a70:(x+y)%2?0xe8edd8:0xf3f5e2).fillRoundedRect(sx,sy,34,34,wall?5:2);
      if(wall)g.fillStyle(0x91a082).fillRoundedRect(sx+2,sy+2,30,5,2);
    }
    for(const goal of this.goals){g.fillStyle(0xf4ce65,.4).fillCircle(ox+goal.x*size+17,oy+goal.y*size+17,14);this.label('✦',ox+goal.x*size+17,oy+goal.y*size+17,24,'#c39d43');}
    for(const box of this.boxes){const x=ox+box.x*size+17,y=oy+box.y*size+17,done=this.goals.some(p=>p.x===box.x&&p.y===box.y);g.fillStyle(done?0x77b382:0xc49365).lineStyle(2,done?0x4f8c64:0x9f7047).fillRoundedRect(x-14,y-14,28,28,4).strokeRoundedRect(x-14,y-14,28,28,4);g.lineStyle(2,0xffffff,.4).lineBetween(x-9,y-9,x+9,y+9).lineBetween(x+9,y-9,x-9,y+9);}
    this.label('🫏',ox+this.player.x*size+17,oy+this.player.y*size+17,24);
    for(const [x,y,a] of [[154,632,'←'],[240,602,'↑'],[326,632,'→'],[240,663,'↓']] as const){g.fillStyle(0xffffff,.75).fillCircle(x,y,23);this.label(a,x,y,24);}
    this.label('↶ Deshacer',86,665,12);this.label('↻ Nivel',391,665,12);
  }
  pointerDown(x:number,y:number):void{
    if(y>645&&x<140){this.undo();return;}if(y>645&&x>348){if(!this.ended&&this.nextMs<=0){this.load();this.draw();}return;}
    if(y>565){if(x<195&&y>610)this.move(-1,0);else if(x>285&&y>610)this.move(1,0);else if(x>=195&&x<=285)this.move(0,y<632?-1:1);return;}this.swipe={x,y};
  }
  pointerUp(x:number,y:number):void{if(!this.swipe)return;const dx=x-this.swipe.x,dy=y-this.swipe.y;this.swipe=undefined;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;if(Math.abs(dx)>Math.abs(dy))this.move(Math.sign(dx),0);else this.move(0,Math.sign(dy));}
  keyDown(e:KeyboardEvent):void{const dirs:Record<string,Point>={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};if(dirs[e.key]){e.preventDefault();this.move(dirs[e.key].x,dirs[e.key].y);}else if(e.key.toLowerCase()==='u')this.undo();else if(e.key.toLowerCase()==='r'&&this.nextMs<=0){this.load();this.draw();}}
}

const BEETLE_COURSES = [
  ['#######','#....G#','#.###.#','#...#.#','###.#.#','#S....#','#######'],
  ['#######','#G....#','#.###.#','#.#...#','#.#.###','#....S#','#######'],
];
class BeetleRollGame extends ClassicGame {
  private round=0;
  private map:string[]=BEETLE_COURSES[0];
  private ball={x:176,y:427,vx:0,vy:0};
  private start:Point={x:176,y:427};
  private goal:Point={x:304,y:299};
  private joystick:Point={x:0,y:0};
  private roundMs=0;
  private penalty=0;
  private best=Infinity;
  private nextMs=0;
  private keys=new Set<string>();
  create():void{this.chrome('Guía la bola con el joystick o las flechas. Dos circuitos: se conserva tu mejor tiempo.');this.load();this.draw();}
  private load():void{this.map=BEETLE_COURSES[this.round];for(let y=0;y<7;y++)for(let x=0;x<7;x++){if(this.map[y][x]==='S')this.start={x:128+x*32+16,y:251+y*32+16};if(this.map[y][x]==='G')this.goal={x:128+x*32+16,y:251+y*32+16};}this.ball={...this.start,vx:0,vy:0};this.joystick={x:0,y:0};this.roundMs=0;this.penalty=0;}
  private safe(x:number,y:number):boolean{return [[-9,-9],[9,-9],[-9,9],[9,9]].every(([dx,dy])=>this.map[Math.floor((y+dy-251)/32)]?.[Math.floor((x+dx-128)/32)]!==undefined&&this.map[Math.floor((y+dy-251)/32)]?.[Math.floor((x+dx-128)/32)]!=='#');}
  update(delta:number):void{
    if(this.tick(delta)){this.finish(Number.isFinite(this.best)?this.best:this.game.durationSec+this.penalty/1000,Number.isFinite(this.best)?1:0);return;}
    if(this.nextMs>0){this.nextMs-=delta;if(this.nextMs<=0){this.round++;this.load();}this.draw();return;}
    this.roundMs+=delta;
    const dt=delta/1000,kx=Number(this.keys.has('ArrowRight'))-Number(this.keys.has('ArrowLeft')),ky=Number(this.keys.has('ArrowDown'))-Number(this.keys.has('ArrowUp'));
    const inputX=kx||this.joystick.x,inputY=ky||this.joystick.y;
    this.ball.vx=(this.ball.vx+inputX*320*dt)*Math.pow(.04,dt);this.ball.vy=(this.ball.vy+inputY*320*dt)*Math.pow(.04,dt);
    this.ball.vx=Math.max(-95,Math.min(95,this.ball.vx));this.ball.vy=Math.max(-95,Math.min(95,this.ball.vy));
    const steps=Math.max(1,Math.ceil(delta/12));for(let i=0;i<steps;i++){const nx=this.ball.x+this.ball.vx*dt/steps,ny=this.ball.y+this.ball.vy*dt/steps;if(this.safe(nx,this.ball.y))this.ball.x=nx;else this.ball.vx*=-.25;if(this.safe(this.ball.x,ny))this.ball.y=ny;else this.ball.vy*=-.25;}
    if(Math.hypot(this.ball.x-this.goal.x,this.ball.y-this.goal.y)<12){const time=(this.roundMs+this.penalty)/1000;this.best=Math.min(this.best,time);this.feedback.setText(`¡Circuito completado! ${time.toFixed(2)} s`);if(this.round===1){this.finish(this.best,1);return;}this.nextMs=900;this.keys.clear();}
    this.draw();
  }
  private draw():void{
    this.frame();this.metric((this.roundMs+this.penalty)/1000,'s');this.prompt.setText(`Circuito ${this.round+1} de 2${Number.isFinite(this.best)?` · mejor ${this.best.toFixed(2)} s`:''}`);const g=this.g;
    for(let y=0;y<7;y++)for(let x=0;x<7;x++){const sx=128+x*32,sy=251+y*32,wall=this.map[y][x]==='#';g.fillStyle(wall?0x708a66:(x+y)%2?0xebead1:0xf8f3dd).fillRoundedRect(sx,sy,31,31,wall?4:1);if(wall)g.fillStyle(0xa9bd87).fillRoundedRect(sx+2,sy+2,27,5,2);}
    g.fillStyle(0xefc66b).fillCircle(this.goal.x,this.goal.y,14);this.label('⚑',this.goal.x,this.goal.y,21,'#8b7044');
    g.fillStyle(0x384638,.2).fillEllipse(this.ball.x,this.ball.y+5,23,16);g.fillStyle(0xb69059).fillCircle(this.ball.x,this.ball.y,11);g.fillStyle(0xdec18b).fillCircle(this.ball.x-3,this.ball.y-4,4);
    this.label('🪲',this.ball.x-12,this.ball.y+17,17);
    g.fillStyle(0xffffff,.5).lineStyle(2,0x729883,.7).fillCircle(240,629,43).strokeCircle(240,629,43);g.fillStyle(0x618d77).fillCircle(240+this.joystick.x*28,629+this.joystick.y*28,19);
    this.label('JOYSTICK · FLECHAS',240,686,12);
  }
  private steer(x:number,y:number):void{const dx=(x-240)/37,dy=(y-629)/37,len=Math.max(1,Math.hypot(dx,dy));this.joystick={x:dx/len,y:dy/len};}
  pointerDown(x:number,y:number):void{if(y>560)this.steer(x,y);}
  pointerMove(x:number,y:number,down:boolean):void{if(down&&y>550)this.steer(x,y);}
  pointerUp():void{this.joystick={x:0,y:0};}
  keyDown(e:KeyboardEvent):void{if(e.key.startsWith('Arrow')){e.preventDefault();this.keys.add(e.key);}}
  keyUp(e:KeyboardEvent):void{this.keys.delete(e.key);}
}
