import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { GameManifest } from '../data/games';
import { ArcadeScene, type RunResult } from './ArcadeScene';

interface GameStageProps {
  game: GameManifest;
  onFinish: (result: RunResult) => void;
}

export function GameStage({ game, onFinish }: GameStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onFinish);
  callbackRef.current = onFinish;

  useEffect(() => {
    if (!mountRef.current) return;
    const instance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mountRef.current,
      width: 480,
      height: 720,
      backgroundColor: '#f7f4e9',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 480, height: 720 },
      input: { activePointers: 4 },
      scene: [ArcadeScene],
      render: { antialias: true, pixelArt: false, roundPixels: true },
    });
    instance.events.once('ready', () => instance.scene.start('arcade-run', { game, onFinish: (result: RunResult) => callbackRef.current(result) }));
    return () => instance.destroy(true);
  }, [game]);

  return <div className="phaser-mount" ref={mountRef} aria-label={`Partida: ${game.name}`} />;
}
