import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { categories, games, type Category, type GameManifest } from './data/games';
import { dateAtMadridTime, getDailyChallenge, type DailyChallenge } from './core/challenge';
import {
  activeGroup, createGroup, finishPractice, finishRankedAttempt, getDemoBoard, getRecord,
  joinDemoGroup, loadState, saveState, seasonStandings, startRankedAttempt, updateNickname,
  type DailyRecord, type LocalState,
} from './core/storage';
import type { RunResult } from './game/ArcadeScene';
import { animalArtUrl } from './game/animalArt';

const GameStage = lazy(() => import('./game/GameStage').then((module) => ({ default: module.GameStage })));

type Screen = 'home' | 'training' | 'group' | 'season';
type GameMode = 'ranked' | 'practice';
interface ActiveRun { game: GameManifest; mode: GameMode; }
interface FinishedRun { game: GameManifest; mode: GameMode; result: RunResult; bestScore: number; improved: boolean; }

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Hoy', icon: '◷' },
  { id: 'training', label: 'Entrenamiento', icon: '◎' },
  { id: 'group', label: 'Mi grupo', icon: '♧' },
  { id: 'season', label: 'Temporada', icon: '✳' },
];

function App() {
  const [state, setState] = useState<LocalState>(() => loadState());
  const [screen, setScreen] = useState<Screen>('home');
  const [now, setNow] = useState(() => new Date());
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [introGame, setIntroGame] = useState<ActiveRun | null>(null);
  const [finishedRun, setFinishedRun] = useState<FinishedRun | null>(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'Todas'>('Todas');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [profileName, setProfileName] = useState(state.nickname);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleInstall);
  }, []);

  const challenge = useMemo(() => getDailyChallenge(dateAtMadridTime(now)), [now]);
  const group = activeGroup(state);
  const record = getRecord(state, challenge);
  const board = getDemoBoard(state, challenge);
  const sortedBoard = [...board].sort((a, b) => challenge.game.direction === 'higher' ? b.score - a.score : a.score - b.score);
  const filteredGames = games.filter((game) =>
    (categoryFilter === 'Todas' || game.category === categoryFilter)
    && `${game.name} ${game.instructions}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  );

  function openGame(game: GameManifest, mode: GameMode) {
    setIntroGame({ game, mode });
  }

  function startGame() {
    if (!introGame) return;
    if (introGame.mode === 'ranked') {
      const started = startRankedAttempt(state, challenge);
      if (!started.result.ok) {
        setIntroGame(null);
        setMessage(started.result.reason === 'dice'
          ? 'Ya usaste tus dos intentos. Completa un entrenamiento no te dará dados: vuelve mañana para conseguir otro.'
          : 'Ya agotaste los intentos de este reto. ¡Tu mejor marca sigue contando!');
        return;
      }
      setState(started.state);
    }
    setActiveRun(introGame);
    setIntroGame(null);
  }

  function finishGame(result: RunResult) {
    if (!activeRun) return;
    const previousBest = activeRun.mode === 'ranked' ? getRecord(state, challenge).bestScore : undefined;
    const improved = previousBest === undefined || (activeRun.game.direction === 'higher' ? result.score > previousBest : result.score < previousBest);
    let nextState = state;
    if (activeRun.mode === 'practice') nextState = finishPractice(state);
    else nextState = finishRankedAttempt(state, challenge, activeRun.game, result);
    setState(nextState);
    const updated = getRecord(nextState, challenge);
    setFinishedRun({ game: activeRun.game, mode: activeRun.mode, result, bestScore: updated.bestScore ?? result.score, improved });
    setActiveRun(null);
  }

  function closeFinished() {
    setFinishedRun(null);
    if (screen === 'home') setScreen('home');
  }

  function onCreateGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    setState((current) => createGroup(current, groupName));
    setGroupName('');
    setMessage('Grupo creado en este dispositivo. Comparte el código para identificarlo.');
  }

  function onJoinGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setState((current) => joinDemoGroup(current, inviteCode));
    setInviteCode('');
    setMessage('Grupo añadido a esta demo local. Para compartir el marcador entre dispositivos hace falta conectar Supabase.');
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setState((current) => updateNickname(current, profileName));
    setMessage('Apodo guardado.');
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  const attemptsLeft = Math.max(0, 2 - record.attemptsUsed);
  const canExtra = record.attemptsUsed >= 2 && !record.extraUsed && state.dice > 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setScreen('home')} aria-label="ZooPlay inicio">
          <span className="brand-mark">z</span><span>zoo<span className="brand-light">play</span></span>
        </button>
        <div className="sidebar-label">TU ESPACIO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {NAV.map((item) => <button key={item.id} className={`nav-item ${screen === item.id ? 'active' : ''}`} onClick={() => setScreen(item.id)}>
            <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            {item.id === 'training' && <span className="nav-count">71</span>}
          </button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-season">
          <span className="season-art">✳</span>
          <span className="eyebrow">TEMPORADA {challenge.seasonNumber}</span>
          <strong>Día {challenge.dayOfSeason} <small>/ 21</small></strong>
          <div className="season-progress"><span style={{ width: `${challenge.dayOfSeason / 21 * 100}%` }} /></div>
        </div>
        {installPrompt && <button className="install-side" onClick={() => void installApp()}>＋ Instalar ZooPlay</button>}
        <div className="profile-row">
          <span className="profile-avatar">🐼</span>
          <span className="profile-copy"><strong>{state.nickname}</strong><small>{group.name}</small></span>
          <button className="tiny-button" onClick={() => setScreen('group')} aria-label="Editar perfil">···</button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">z</span><strong>zooplay</strong></div>
          <div className="topbar-date"><span className="live-dot" /> Reto diario <span className="topbar-divider">/</span> {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(now)}</div>
          <div className="topbar-actions">
            <div className="dice-pill"><span>🎲</span><strong>{state.dice}</strong><small>dados</small></div>
            <button className="avatar-button" onClick={() => setScreen('group')} aria-label="Perfil">🐼</button>
          </div>
        </header>

        <main className="page-content">
          {screen === 'home' && <HomeScreen
            challenge={challenge} record={record} groupName={group.name} nickname={state.nickname}
            board={sortedBoard} attemptsLeft={attemptsLeft} canExtra={canExtra}
            onPlay={() => openGame(challenge.game, 'ranked')}
            onPractice={() => { setScreen('training'); setQuery(''); setCategoryFilter('Todas'); }}
            onOpenTraining={() => setScreen('training')}
          />}
          {screen === 'training' && <TrainingScreen
            games={filteredGames} count={games.length} query={query} category={categoryFilter}
            onQuery={setQuery} onCategory={setCategoryFilter}
            onSelect={(game) => openGame(game, 'practice')}
          />}
          {screen === 'group' && <GroupScreen
            state={state} group={group} profileName={profileName} groupName={groupName} inviteCode={inviteCode}
            onProfileName={setProfileName} onSaveProfile={saveProfile}
            onGroupName={setGroupName} onCreateGroup={onCreateGroup}
            onInviteCode={setInviteCode} onJoinGroup={onJoinGroup}
            onActivate={(id) => setState((current) => ({ ...current, activeGroupId: id }))}
          />}
          {screen === 'season' && <SeasonScreen challenge={challenge} board={seasonStandings(state, challenge)} nickname={state.nickname} />}
          <footer className="page-footer"><span>Hecho para jugar juntos <span className="footer-heart">♥</span></span><span>ZooPlay · {games.length} minijuegos</span></footer>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {NAV.map((item) => <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
          <span>{item.icon}</span><small>{item.label}</small>
        </button>)}
      </nav>

      {introGame && <GameIntro game={introGame.game} mode={introGame.mode} challenge={challenge} record={record} dice={state.dice} onClose={() => setIntroGame(null)} onStart={startGame} />}
      {activeRun && <GameOverlay game={activeRun.game} mode={activeRun.mode} onExit={() => { setActiveRun(null); setMessage(activeRun.mode === 'ranked' ? 'La partida se cerró y el intento quedó usado.' : 'Has salido del entrenamiento.'); }} onFinish={finishGame} />}
      {finishedRun && <ResultModal run={finishedRun} dice={state.dice} onClose={closeFinished} onReplay={() => { setActiveRun({ game: finishedRun.game, mode: 'practice' }); setFinishedRun(null); }} />}
      {message && <Toast message={message} onClose={() => setMessage('')} />}
    </div>
  );
}

function HomeScreen(props: {
  challenge: DailyChallenge; record: DailyRecord; groupName: string; nickname: string;
  board: ReturnType<typeof getDemoBoard>; attemptsLeft: number; canExtra: boolean;
  onPlay: () => void; onPractice: () => void; onOpenTraining: () => void;
}) {
  const { challenge, record, groupName, nickname, board, attemptsLeft, canExtra, onPlay, onPractice, onOpenTraining } = props;
  const game = challenge.game;
  const sorted = [...board].sort((a, b) => game.direction === 'higher' ? b.score - a.score : a.score - b.score);
  const myRank = sorted.findIndex((player) => player.local) + 1;
  const canPlay = attemptsLeft > 0 || canExtra;
  return <>
    <div className="page-heading">
      <div><div className="eyebrow heading-eyebrow">{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(new Date(`${challenge.date}T12:00:00Z`)).toLocaleUpperCase('es-ES')} <span className="sun-dot">✦</span></div><h1>¡Hola, {nickname}! <span className="wave">👋</span></h1><p>Una prueba nueva. Tu grupo. Una pequeña gloria animal.</p></div>
      <div className="week-chip"><span>✳</span><div><small>TEMPORADA {challenge.seasonNumber}</small><strong>Día {challenge.dayOfSeason} de 21</strong></div></div>
    </div>

    <section className="hero-card">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="kicker-dot" /> EL RETO DE HOY <span className="hero-season">#{challenge.dayOfSeason}/21</span></div>
        <h2>{game.name}</h2>
        <p>{game.instructions}</p>
        <div className="hero-meta"><span>◷ ~{game.durationSec}s</span><span>↗ {game.metric}</span><span>👥 {groupName}</span></div>
        <button className="primary-button" onClick={onPlay} disabled={!canPlay}>
          {canPlay ? (attemptsLeft ? 'Jugar el reto' : 'Usar un dado · un intento más') : 'Intentos agotados'} <span>→</span>
        </button>
        <div className="attempt-note">{attemptsLeft} de 2 intentos disponibles{canExtra ? ' · tienes un dado para otro' : record.extraUsed ? ' · intento extra usado' : ''}</div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✳</span>
        <div className="animal-orbit"><span className="orbit-dot" /></div>
        <div className="animal-disc"><span>{game.emoji}</span></div>
        <div className="art-caption"><span className="caption-line" /> EL ANIMAL DE HOY</div>
      </div>
      <div className="hero-side-label">DÍA {challenge.dayOfSeason} <b>·</b> 21</div>
    </section>

    <section className="home-lower-grid">
      <div className="section-card leaderboard-card">
        <div className="section-title-row"><div><div className="eyebrow">LA PANDILLA</div><h3>Marcador de hoy</h3></div><span className="demo-label"><span /> DEMO LOCAL</span></div>
        <div className="leaderboard-head"><span>JUGADOR</span><span>{game.metric.toUpperCase()}</span></div>
        <div className="leaderboard-list">
          {sorted.map((player, index) => <div className={`leader-row ${player.local ? 'my-row' : ''}`} key={player.id}>
            <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="leader-avatar">{player.emoji}</span>
            <span className="leader-name">{player.name}{player.local && <small> tú</small>}{!player.local && <small className="sample-person"> muestra</small>}</span>
            <strong className="leader-score">{formatScore(player.score, game.unit)}</strong>
            <span className={`leader-change ${index === 0 ? 'leader-up' : ''}`}>{index === 0 ? '↑' : '·'}</span>
          </div>)}
          {record.bestScore === undefined && <div className="your-rank-hint"><span>＋</span> Juega para entrar en la tabla{myRank ? ` · ahora vas ${myRank}.º` : ''}</div>}
        </div>
        <div className="leaderboard-foot"><span>Los marcadores de grupo aparecerán al conectar la cuenta.</span><span className="online-count">● muestra</span></div>
      </div>
      <div className="right-rail">
        <div className="section-card personal-card">
          <div className="personal-top"><span className="mini-icon orange">↗</span><span className="eyebrow">TU MARCA</span></div>
          <strong>{record.bestScore === undefined ? '—' : formatScore(record.bestScore, game.unit)}</strong>
          <small>{record.bestScore === undefined ? 'Aún no has jugado hoy' : `Mejor resultado · ${game.metric}`}</small>
          <div className="benchmark-row"><span>Referencia Top 1 %</span><strong>{game.benchmark}</strong></div>
        </div>
        <button className="training-callout" onClick={onPractice}>
          <span className="training-icon">◎</span><span><strong>Entrena sin límite</strong><small>Los 71 juegos, cuando quieras.</small></span><b>→</b>
        </button>
        <div className="dice-tip"><span>🎲</span><p>Completa el reto del día y ganas un dado. Guárdalo para conseguir <b>un intento extra</b>.</p></div>
      </div>
    </section>
    <section className="browse-strip"><div><span className="browse-emoji">🦩 🐙 🐿️</span><div><strong>¿Te apetece probar otro?</strong><small>Explora el catálogo completo de 71 minijuegos.</small></div></div><button className="text-button" onClick={onOpenTraining}>Ver todos los juegos <span>→</span></button></section>
  </>;
}

function TrainingScreen(props: {
  games: GameManifest[]; count: number; query: string; category: Category | 'Todas';
  onQuery: (value: string) => void; onCategory: (value: Category | 'Todas') => void; onSelect: (game: GameManifest) => void;
}) {
  return <>
    <div className="page-heading training-heading">
      <div><div className="eyebrow heading-eyebrow">TU PATIO DE JUEGOS <span className="sun-dot">✦</span></div><h1>Entrenamiento <span className="heading-spark">◎</span></h1><p>Practica cualquier juego todas las veces que quieras. Aquí no gastas intentos.</p></div>
      <div className="training-total"><strong>71</strong><small>minijuegos<br />para explorar</small></div>
    </div>
    <div className="training-tools">
      <label className="search-box"><span>⌕</span><input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Buscar un juego..." aria-label="Buscar un minijuego" />{props.query && <button onClick={() => props.onQuery('')} aria-label="Borrar búsqueda">×</button>}</label>
      <span className="results-count">{props.games.length} {props.games.length === 1 ? 'juego' : 'juegos'}</span>
    </div>
    <div className="filter-row" role="group" aria-label="Filtrar por categoría">
      <button className={props.category === 'Todas' ? 'filter active' : 'filter'} onClick={() => props.onCategory('Todas')}>Todas <span>71</span></button>
      {categories.map((category, index) => <button key={category} className={props.category === category ? 'filter active' : 'filter'} onClick={() => props.onCategory(category)}>{category}<span>{[28, 8, 13, 10, 12][index]}</span></button>)}
    </div>
    {props.games.length ? <div className="game-grid">
      {props.games.map((game, index) => <button className="game-tile" key={game.id} onClick={() => props.onSelect(game)}>
        <span className={`tile-art tile-color-${index % 5}`}><span className="tile-number">{String(games.indexOf(game) + 1).padStart(2, '0')}</span><img className="tile-animal tile-illustration" src={animalArtUrl(game.emoji)} alt="" loading="lazy" /><span className="tile-open">↗</span></span>
        <span className="tile-copy"><span className="tile-category">{game.category}</span><strong>{game.name}</strong><small>{game.metric} · ~{game.durationSec}s</small></span>
      </button>)}
    </div> : <div className="empty-state"><span>🔎</span><strong>No encontramos ese juego</strong><p>Prueba con otro nombre o categoría.</p></div>}
  </>;
}

function GroupScreen(props: {
  state: LocalState; group: ReturnType<typeof activeGroup>; profileName: string; groupName: string; inviteCode: string;
  onProfileName: (value: string) => void; onSaveProfile: (event: React.FormEvent) => void;
  onGroupName: (value: string) => void; onCreateGroup: (event: React.FormEvent) => void;
  onInviteCode: (value: string) => void; onJoinGroup: (event: React.FormEvent) => void; onActivate: (id: string) => void;
}) {
  return <>
    <div className="page-heading"><div><div className="eyebrow heading-eyebrow">TU GENTE <span className="sun-dot">✦</span></div><h1>Mi grupo <span className="heading-spark">♧</span></h1><p>Invita a tu pandilla y comparad el reto diario.</p></div><span className="local-badge">● SOLO ESTE DISPOSITIVO</span></div>
    <div className="group-layout">
      <div className="section-card group-main-card">
        <div className="group-banner"><div className="group-banner-pattern">✳ · ✦ · ✳</div><span className="group-avatar">🦊</span><div><span className="eyebrow">GRUPO ACTIVO</span><h2>{props.group.name}</h2><p>Tu espacio para el reto diario</p></div><span className="group-members">1 <small>miembro</small></span></div>
        <div className="invite-panel"><div><span className="eyebrow">CÓDIGO DE INVITACIÓN</span><strong className="invite-code">{props.group.inviteCode}</strong><small>Comparte este código con tu grupo.</small></div><button className="secondary-button" onClick={() => void navigator.clipboard?.writeText(props.group.inviteCode)}>Copiar código <span>↗</span></button></div>
        <div className="group-demo-note"><span>ⓘ</span><p>Esta versión guarda los grupos en este dispositivo. Para que el código invite a personas en otros móviles, conecta un proyecto de Supabase.</p></div>
        <div className="group-members-list"><div className="eyebrow">MIEMBROS</div><div className="member-row"><span className="leader-avatar">🐼</span><span><strong>{props.state.nickname}</strong><small>Capitán · Tú</small></span><span className="member-status">EN LÍNEA</span></div></div>
      </div>
      <div className="group-forms">
        <form className="section-card form-card" onSubmit={props.onCreateGroup}><span className="eyebrow">OTRA PANDILLA</span><h3>Crea un grupo</h3><p>Empieza otra tabla con una familia o amistades.</p><input value={props.groupName} onChange={(event) => props.onGroupName(event.target.value)} maxLength={32} placeholder="Nombre del grupo" aria-label="Nombre del grupo" /><button className="secondary-button" type="submit">＋ Crear grupo</button></form>
        <form className="section-card form-card" onSubmit={props.onJoinGroup}><span className="eyebrow">TE HAN INVITADO</span><h3>Usa un código</h3><p>Añade el código que te han compartido.</p><input value={props.inviteCode} onChange={(event) => props.onInviteCode(event.target.value.toUpperCase())} maxLength={8} placeholder="Ej. ZOO42" aria-label="Código de invitación" /><button className="secondary-button" type="submit">Entrar al grupo <span>→</span></button></form>
      </div>
    </div>
    <form className="section-card profile-edit" onSubmit={props.onSaveProfile}><div><span className="eyebrow">TU PERFIL</span><h3>Elige tu apodo</h3></div><input value={props.profileName} onChange={(event) => props.onProfileName(event.target.value)} maxLength={24} aria-label="Apodo" /><button className="primary-button compact-button" type="submit">Guardar</button></form>
    <div className="section-card group-switcher"><div><span className="eyebrow">TUS GRUPOS LOCALES</span><p>Cambiar el grupo activo actualiza los resultados de este dispositivo.</p></div><div className="group-chips">{props.state.groups.map((group) => <button key={group.id} className={group.id === props.group.id ? 'group-chip active' : 'group-chip'} onClick={() => props.onActivate(group.id)}>{group.name}</button>)}</div></div>
  </>;
}

function SeasonScreen(props: { challenge: DailyChallenge; board: ReturnType<typeof getDemoBoard>; nickname: string }) {
  const standings = [...props.board].sort((a, b) => b.seasonPoints - a.seasonPoints);
  return <>
    <div className="page-heading"><div><div className="eyebrow heading-eyebrow">CADA DÍA CUENTA <span className="sun-dot">✦</span></div><h1>Temporada <span className="heading-spark">✳</span></h1><p>21 días para dejar tu huella en el reino animal.</p></div><div className="week-chip"><span>✳</span><div><small>TEMPORADA {props.challenge.seasonNumber}</small><strong>Día {props.challenge.dayOfSeason} de 21</strong></div></div></div>
    <div className="season-hero section-card"><div><span className="eyebrow">TU PROGRESO</span><h2>Una aventura de 21 días</h2><p>Juega la prueba diaria y suma puntos según tu posición en la pandilla.</p><div className="large-progress"><span style={{ width: `${props.challenge.dayOfSeason / 21 * 100}%` }} /></div><small>{props.challenge.dayOfSeason} de 21 días</small></div><div className="season-sun">✳<small>21</small></div></div>
    <div className="section-card season-board"><div className="section-title-row"><div><span className="eyebrow">PUNTOS ACUMULADOS</span><h3>Tabla de temporada</h3></div><span className="demo-label"><span /> DEMO LOCAL</span></div>
      {standings.map((player, index) => <div className={`season-row ${player.name === props.nickname ? 'my-row' : ''}`} key={player.id}><span className="season-rank">{['🥇','🥈','🥉'][index] ?? `${index + 1}.`}</span><span className="leader-avatar">{player.emoji}</span><strong>{player.name}{player.name === props.nickname && <small> tú</small>}</strong><span className="season-points">{Math.floor(player.seasonPoints)}<small> pts</small></span></div>)}
      <div className="season-explainer">El puntaje de muestra ilustra cómo se verá la tabla cuando juegues en grupo.</div>
    </div>
  </>;
}

function GameIntro(props: { game: GameManifest; mode: GameMode; challenge: DailyChallenge; record: DailyRecord; dice: number; onClose: () => void; onStart: () => void }) {
  const ranked = props.mode === 'ranked';
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}>
    <section className="intro-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <button className="modal-close" onClick={props.onClose} aria-label="Cerrar">×</button>
      <div className="intro-art"><span className="intro-star">✦</span><span><img className="intro-illustration" src={animalArtUrl(props.game.emoji)} alt="" /></span><small>{ranked ? `RETO DE HOY · DÍA ${props.challenge.dayOfSeason}/21` : 'ENTRENAMIENTO · SIN LÍMITE'}</small></div>
      <div className="intro-content"><span className="eyebrow">{props.game.category}</span><h2 id="intro-title">{props.game.name}</h2><p>{props.game.instructions}</p>
        <div className="rule-facts"><span><small>DURACIÓN</small><strong>~{props.game.durationSec} s</strong></span><span><small>MARCADOR</small><strong>{props.game.metric} · {props.game.direction === 'higher' ? 'más' : 'menos'} es mejor</strong></span><span><small>TOP 1 %</small><strong>{props.game.benchmark}</strong></span><span><small>FIABILIDAD</small><strong>{props.game.confidence}</strong></span></div>
        {ranked && <div className="ranked-notice">{props.record.attemptsUsed < 2 ? `${2 - props.record.attemptsUsed} intento${props.record.attemptsUsed === 0 ? 's' : ''} de 2 disponible${props.record.attemptsUsed === 0 ? 's' : ''}.` : `Intento extra · gastarás 1 dado (tienes ${props.dice}).`} Tu mejor marca es la que cuenta.</div>}
        {!ranked && <div className="practice-notice">∞ Juega todas las veces que quieras. No consume intentos ni afecta a tu marcador.</div>}
        <button className="primary-button modal-play" onClick={props.onStart}>{ranked ? '¡A jugar!' : 'Empezar entrenamiento'} <span>→</span></button>
        <button className="plain-close" onClick={props.onClose}>Volver</button>
      </div>
    </section>
  </div>;
}

function GameOverlay(props: { game: GameManifest; mode: GameMode; onFinish: (result: RunResult) => void; onExit: () => void }) {
  return <div className="game-overlay"><div className="game-overlay-top"><span className="game-mode-tag">{props.mode === 'practice' ? '◎ ENTRENAMIENTO' : '✦ RETO DIARIO'}</span><button onClick={props.onExit} aria-label="Salir de la partida">×</button></div><Suspense fallback={<div className="game-loading">Preparando la partida…</div>}><GameStage game={props.game} onFinish={props.onFinish} practice={props.mode === 'practice'} /></Suspense><div className="game-overlay-foot">{props.mode === 'practice' ? 'Puedes repetir este juego cuando quieras.' : 'Tu mejor resultado se guarda para el reto de hoy.'}</div></div>;
}

function ResultModal(props: { run: FinishedRun; dice: number; onClose: () => void; onReplay: () => void }) {
  const improved = props.run.improved;
  return <div className="modal-backdrop"><section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
    <div className="result-confetti">✦　✳　✦</div><div className="result-animal"><img src={animalArtUrl(props.run.game.emoji)} alt="" /></div>
    <span className="eyebrow">{props.run.mode === 'practice' ? 'ENTRENAMIENTO COMPLETADO' : 'RETO COMPLETADO'}</span>
    <h2 id="result-title">{props.run.mode === 'practice' ? '¡Buen ensayo!' : improved ? '¡Nueva marca!' : '¡Partida completada!'}</h2>
    <div className="result-score">{formatScore(props.run.result.score, props.run.game.unit)}</div><div className="result-metric">{props.run.game.metric} · {props.run.game.direction === 'higher' ? 'más es mejor' : 'menos es mejor'}</div>
    {props.run.mode === 'ranked' ? <div className="result-note">{improved ? 'Tu mejor puntuación de hoy se ha actualizado.' : `Tu mejor marca sigue en ${formatScore(props.run.bestScore, props.run.game.unit)}.`}<br />Has ganado un dado si no lo habías ganado hoy. 🎲 {props.dice}</div> : <div className="result-note">Esta partida queda fuera del marcador. Puedes repetirla desde Entrenamiento.</div>}
    <div className="result-benchmark"><span>Referencia Top 1 %</span><strong>{props.run.game.benchmark}</strong></div>
    {props.run.mode === 'practice' && <button className="primary-button result-button" onClick={props.onReplay}>↻ Volver a jugar</button>}
    <button className={props.run.mode === 'practice' ? 'plain-close' : 'primary-button result-button'} onClick={props.onClose}>Seguir explorando <span>→</span></button>
  </section></div>;
}

function Toast(props: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(props.onClose, 4600); return () => window.clearTimeout(timer); }, [props.message]);
  return <div className="toast" role="status"><span>✦</span><p>{props.message}</p><button onClick={props.onClose} aria-label="Cerrar aviso">×</button></div>;
}

function formatScore(score: number, unit: string): string {
  const decimals = unit === 's' ? score < 1 ? 3 : 2 : unit === 'm' && !Number.isInteger(score) ? 1 : Number.isInteger(score) ? 0 : 1;
  const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimals }).format(score);
  return `${formatted} ${unit}`.trim();
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default App;
