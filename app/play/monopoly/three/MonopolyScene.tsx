/** The Sachi Monopoly 3D scene: garden world, 3D board, tokens,
 * dice, particles and the cinematic camera — all driven by the
 * existing game state. This component is loaded with ssr:false from
 * the page so Three.js never enters the server bundle. If the scene
 * throws (e.g. no WebGL), the error boundary reports back and the
 * page falls back to its 2D board. */
import { Component, Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import type { GameState } from '@/lib/generators/monopoly';
import { tilePos } from './boardMath';
import World from './World';
import Board3D from './Board3D';
import Token3D, { type TokenMood } from './Token3D';
import Dice3D from './Dice3D';
import CameraRig, { type CameraMode } from './CameraRig';
import { Burst, Dust, Fireworks, MoneyFlyer, Petals, StepPuff, type MoneyFlight } from './Effects';

export interface BurstEvent {
  key: number;
  kind: 'buy' | 'build' | 'hotel' | 'card';
  tile: number;
  player: number;
}

const PLAYER_COLOURS = ['#2563eb', '#db2777'];

class SceneErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    this.props.onError();
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MonopolyScene({
  game,
  displayPos,
  gameTokens,
  rolling,
  faces,
  doubles,
  cameraMode,
  focusTile,
  followSquare,
  burst,
  moneyFlight,
  cardOpen,
  isBotTurn,
  highlightTile,
  jailClosed,
  dimmed,
  stepPuff,
  shakeKey,
  shineTile,
  landingTile,
  onTileClick,
  onError,
  reducedMotion,
}: {
  game: GameState;
  displayPos: [number, number];
  gameTokens: [string, string];
  rolling: boolean;
  faces: [number, number];
  doubles: boolean;
  cameraMode: CameraMode;
  focusTile: number | null;
  followSquare: number;
  burst: BurstEvent | null;
  moneyFlight: MoneyFlight | null;
  cardOpen: boolean;
  isBotTurn: boolean;
  highlightTile: number | null;
  jailClosed: boolean;
  dimmed: boolean;
  stepPuff: { key: number; tile: number } | null;
  shakeKey: number;
  shineTile: number | null;
  landingTile: { tile: number; key: number } | null;
  onTileClick: (index: number) => void;
  onError: () => void;
  reducedMotion: boolean;
}) {
  const winner = game.winner;
  const moods: [TokenMood, TokenMood] = [0, 1].map((i) => {
    if (winner !== null) return winner === i ? 'victory' : 'sad';
    if (burst && burst.player === i && (burst.kind === 'buy' || burst.kind === 'build' || burst.kind === 'hotel')) return 'happy';
    if (isBotTurn && i === 1) return 'thinking';
    return 'idle';
  }) as [TokenMood, TokenMood];
  const burstPos: [number, number] | null = burst ? tilePos(burst.tile) : null;

  return (
    <SceneErrorBoundary onError={onError}>
      <div style={{ height: 480, borderRadius: 18, overflow: 'hidden' }}>
        <Canvas
          shadows="soft"
          dpr={[1, 1.75]}
          camera={{ fov: 42, position: [0, 15, 15], near: 0.1, far: 90 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={dimmed ? 0.35 : 0.75} />
          <hemisphereLight args={['#ffe9c9', '#5d4a2e', dimmed ? 0.3 : 0.7]} />
          <directionalLight
            position={[8, 14, 6]}
            intensity={dimmed ? 0.9 : 2.1}
            color="#ffdfae"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-11}
            shadow-camera-right={11}
            shadow-camera-top={11}
            shadow-camera-bottom={-11}
          />
          <Suspense fallback={null}>
            <World />
            <Board3D
              game={game}
              focusTile={focusTile}
              highlightTile={highlightTile}
              jailClosed={jailClosed}
              shineTile={shineTile}
              landingTile={landingTile}
              reducedMotion={reducedMotion}
              onTileClick={onTileClick}
            />
            {[0, 1].map((i) => (
              <Token3D
                key={i}
                token={gameTokens[i]}
                colour={PLAYER_COLOURS[i]}
                square={displayPos[i]}
                slot={displayPos[0] === displayPos[1] ? i : 0}
                mood={moods[i]}
                active={game.turn === i}
                reducedMotion={reducedMotion}
              />
            ))}
            <Dice3D faces={faces} rolling={rolling} doubles={doubles} reducedMotion={reducedMotion} />
            <Petals />
            <Dust />
            {burst && burstPos && (
              <Burst
                burstKey={burst.key}
                position={burstPos}
                colours={
                  burst.kind === 'hotel'
                    ? ['#ffd166', '#facc15', '#fff7cc']
                    : burst.kind === 'buy'
                      ? ['#ff5b8f', '#ffd166', '#ffffff']
                      : ['#4ade80', '#ffd166', '#ffffff']
                }
              />
            )}
            {burst && burstPos && burst.kind !== 'card' && (
              <Sparkles count={50} scale={[3, 2, 3]} position={[burstPos[0], 1, burstPos[1]]} size={3} speed={0.5} color="#ffd166" />
            )}
            {cardOpen && (
              <Sparkles count={40} scale={[6, 1.5, 2]} position={[0, 0.9, 2.7]} size={3} speed={0.4} color="#ff8fb3" />
            )}
            {moneyFlight && <MoneyFlyer flight={moneyFlight} />}
            {stepPuff && <StepPuff puffKey={stepPuff.key} position={tilePos(stepPuff.tile)} />}
            {winner !== null && !dimmed && <Fireworks />}
            <CameraRig
              mode={cameraMode}
              focusTile={focusTile}
              followSquare={followSquare}
              shakeKey={shakeKey}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
