import Phaser from 'phaser';
import type { GameManifest } from '../data/games';
import { createCatalogGame } from './minigames/CatalogGame';
import { createVerticalSliceGame, type DedicatedGame } from './minigames/VerticalSlice';
import { animalArtUrl, animalEmojis, animalKey } from './animalArt';
import { GameEffects } from './presentation';

export interface RunResult {
  score: number;
  elapsedMs: number;
  accuracy: number;
}

interface SceneData {
  game: GameManifest;
  onFinish: (result: RunResult) => void;
  onReady?: () => void;
}

export class ArcadeScene extends Phaser.Scene {
  private gameController?: DedicatedGame;
  private manifest!: GameManifest;
  private onFinish!: SceneData['onFinish'];
  private onReady?: () => void;
  private playing = false;
  private effects?: GameEffects;

  constructor() {
    super('arcade-run');
  }

  init(data: SceneData): void {
    this.manifest = data.game;
    this.onFinish = data.onFinish;
    this.onReady = data.onReady;
    this.gameController = undefined;
    this.playing = false;
  }

  preload(): void {
    for (const emoji of animalEmojis) {
      const key = animalKey(emoji)!;
      if (!this.textures.exists(key)) this.load.svg(key, animalArtUrl(emoji), { width: 192, height: 192 });
    }
  }

  create(): void {
    this.gameController = createVerticalSliceGame(this, this.manifest, this.onFinish)
      ?? createCatalogGame(this, this.manifest, this.onFinish);
    this.gameController.create();
    this.effects = new GameEffects(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!this.playing) return;
      this.effects?.tap(pointer.x, pointer.y);
      this.gameController?.pointerDown(pointer.x, pointer.y);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => { if (this.playing) this.gameController?.pointerMove(pointer.x, pointer.y, pointer.isDown); });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => { if (this.playing) this.gameController?.pointerUp(pointer.x, pointer.y); });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => { if (this.playing && (!event.repeat || event.key.startsWith('Arrow'))) this.gameController?.keyDown(event); });
    this.input.keyboard?.on('keyup', (event: KeyboardEvent) => this.gameController?.keyUp?.(event));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.effects?.destroy());
    this.onReady?.();
  }

  setPlaying(playing: boolean): void {
    if (!playing && this.playing) {
      this.gameController?.pointerUp(240, 630);
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) this.gameController?.keyUp?.({ key } as KeyboardEvent);
    }
    this.playing = playing;
  }
  setMuted(muted: boolean): void { if (this.effects) this.effects.muted = muted; }

  update(_time: number, delta: number): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    // Recovering a backgrounded tab can yield one very large delta. Keep it
    // from consuming an entire timed run or teleporting a projectile at once.
    if (this.playing) this.gameController?.update(Math.min(delta, 50));
    this.effects?.update(Math.min(delta, 50));
  }
}
