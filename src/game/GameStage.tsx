import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { GameManifest } from '../data/games';
import { ArcadeScene, type RunResult } from './ArcadeScene';
import { animalArtUrl } from './animalArt';
import { controlHint } from './presentation';

interface GameStageProps { game: GameManifest; onFinish: (result: RunResult) => void; practice?: boolean; }
type Status = 'loading' | 'ready' | 'countdown' | 'playing' | 'paused';

export function GameStage({ game, onFinish, practice = false }: GameStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ArcadeScene | null>(null);
  const callbackRef = useRef(onFinish);
  const [status, setStatus] = useState<Status>('loading');
  const [countdown, setCountdown] = useState(3);
  const [muted, setMuted] = useState(true);
  const [run, setRun] = useState(0);
  callbackRef.current = onFinish;

  useEffect(() => {
    if (!mountRef.current) return;
    let disposed = false;
    mountRef.current.replaceChildren();
    setStatus('loading');
    const instance = new Phaser.Game({
      type: Phaser.AUTO, parent: mountRef.current, width: 480, height: 720,
      backgroundColor: '#a8d9cb',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 480, height: 720 },
      input: { activePointers: 4 }, scene: [],
      render: { antialias: true, pixelArt: false, roundPixels: false },
    });
    instance.events.once('ready', () => {
      if (disposed) return;
      instance.scene.add('arcade-run', ArcadeScene, true, {
        game, onFinish: (result: RunResult) => { if (!disposed) callbackRef.current(result); },
        onReady: () => {
          if (disposed) return;
          sceneRef.current = instance.scene.getScene('arcade-run') as ArcadeScene;
          setStatus('ready');
        },
      });
    });
    return () => { disposed = true; sceneRef.current = null; instance.destroy(true); instance.canvas?.remove(); };
  }, [game, run]);

  useEffect(() => {
    sceneRef.current?.setPlaying(status === 'playing');
    sceneRef.current?.setMuted(muted);
  }, [status, muted]);

  useEffect(() => {
    if (status !== 'countdown') return;
    setCountdown(3);
    const second = window.setTimeout(() => setCountdown(2), 650);
    const third = window.setTimeout(() => setCountdown(1), 1300);
    const start = window.setTimeout(() => setStatus('playing'), 1950);
    return () => { window.clearTimeout(second); window.clearTimeout(third); window.clearTimeout(start); };
  }, [status]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && practice) setStatus(value => value === 'playing' ? 'paused' : value);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && practice) setStatus(value => value === 'playing' ? 'paused' : value === 'paused' ? 'countdown' : value);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('visibilitychange', handleVisibility); window.removeEventListener('keydown', handleKey); };
  }, [practice]);

  return <div className="game-stage-shell">
    <div className="game-stage-board">
      <div className="phaser-mount" ref={mountRef} aria-label={`Partida: ${game.name}`} />
      {(status === 'loading' || status === 'ready' || status === 'paused') && <div className="stage-curtain">
        <div className="stage-ready-card">
          <img src={animalArtUrl(game.emoji)} alt="" className="stage-ready-animal" />
          <span className="stage-eyebrow">{status === 'paused' ? 'TÓMATE UN RESPIRO' : 'TU SIGUIENTE AVENTURA'}</span>
          <h2>{status === 'paused' ? 'En pausa' : game.name}</h2>
          <p>{game.instructions}</p>
          <span className="stage-control-hint">{controlHint(game)}</span>
          <button className="stage-start" disabled={status === 'loading'} onClick={() => setStatus('countdown')}>{status === 'loading' ? 'Preparando…' : status === 'paused' ? 'Continuar' : '¡Vamos!'} <span>▶</span></button>
          <small>El reloj empieza cuando tú estés preparado.</small>
        </div>
      </div>}
      {status === 'countdown' && <div className="stage-countdown" aria-live="polite" key={countdown}><strong>{countdown}</strong><span>Prepárate</span></div>}
    </div>
    <div className="stage-toolbar">
      {practice && <button disabled={status !== 'playing' && status !== 'paused'} onClick={() => setStatus(value => value === 'paused' ? 'countdown' : 'paused')}>{status === 'paused' ? '▶ Continuar' : 'Ⅱ Pausa'}</button>}
      <button aria-pressed={!muted} onClick={() => setMuted(value => !value)}>{muted ? '♫ Activar sonido' : '♫ Sonido activo'}</button>
      {practice && <button onClick={() => setRun(value => value + 1)}>↻ Reiniciar</button>}
    </div>
  </div>;
}
