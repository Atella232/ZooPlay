import Phaser from 'phaser';
import type { GameManifest } from '../data/games';
import { createCatalogGame } from './minigames/CatalogGame';
import { createVerticalSliceGame, type DedicatedGame } from './minigames/VerticalSlice';

export interface RunResult {
  score: number;
  elapsedMs: number;
  accuracy: number;
}

interface SceneData {
  game: GameManifest;
  onFinish: (result: RunResult) => void;
}

export class ArcadeScene extends Phaser.Scene {
  private gameController?: DedicatedGame;
  private manifest!: GameManifest;
  private onFinish!: SceneData['onFinish'];

  constructor() {
    super('arcade-run');
  }

  init(data: SceneData): void {
    this.manifest = data.game;
    this.onFinish = data.onFinish;
    this.gameController = undefined;
  }

  create(): void {
    this.gameController = createVerticalSliceGame(this, this.manifest, this.onFinish)
      ?? createCatalogGame(this, this.manifest, this.onFinish);
    this.gameController.create();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.gameController?.pointerDown(pointer.x, pointer.y));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.gameController?.pointerMove(pointer.x, pointer.y, pointer.isDown));
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.gameController?.pointerUp(pointer.x, pointer.y));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.gameController?.keyDown(event));
  }

  update(_time: number, delta: number): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    // Recovering a backgrounded tab can yield one very large delta. Keep it
    // from consuming an entire timed run or teleporting a projectile at once.
    this.gameController?.update(Math.min(delta, 50));
  }
}
