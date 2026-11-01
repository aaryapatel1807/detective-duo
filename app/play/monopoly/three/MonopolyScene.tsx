/** The Sachi Monopoly 3D scene: garden world, 3D board, tokens,
 * dice, particles and the cinematic camera — all driven by the
 * existing game state. This component is loaded with ssr:false from
 * the page so Three.js never enters the server bundle. If the scene
 * throws (e.g. no WebGL), the error boundary reports back and the
 * page falls back to its 2D board.
 * Season and time of day are automatic (device date/hour) and
 * lighting drifts toward its target, so an hour change mid-game
 * never cuts. */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState } from '@/lib/generators/monopoly';
import { tilePos } from './boardMath';
import { getSeason, getTimeOfDay, LIGHT_TARGETS, type LightTarget } from './ambience';
import World from './World';
import Board3D from './Board3D';
import Token3D, { type TokenMood } from './Token3D';
import Dice3D from './Dice3D';
import CameraRig, { type CameraMode } from './CameraRig';
import { Burst, Dust, Fireworks, Hearts, MoneyFlyer, Petals, StepPuff, type MoneyFlight } from './Effects';

export interface BurstEvent {
  key: number;
  kind: 'buy' | 'build' | 'hotel' | 'card';
  tile: number;
  player: number;
}

/** Drifts the scene's lights toward the time-of-day target instead
 * of cutting when the hour changes. Defeat dimming scales the
 * target intensities down, as before. */
function LightLerp({
  target,
  dimmed,
  dirRef,
  ambRef,
  hemiRef,
}: {
  target: LightTarget;
  dimmed: boolean;
  dirRef: React.RefObject<THREE.DirectionalLight | null>;
  ambRef: React.RefObject<THREE.AmbientLight | null>;
  hemiRef: React.RefObject<THREE.HemisphereLight | null>;
}) {
  const cur = useRef({
    sun: new THREE.Color(target.sunColor),
    sunI: target.sunIntensity,
    ambI: target.ambientIntensity,
    hemiSky: new THREE.Color(target.hemiSky),
    hemiGround: new THREE.Color(target.hemiGround),
    hemiI: target.hemiIntensity,
  });
  const tmpSun = useMemo(() => new THREE.Color(), []);
  const tmpSky = useMemo(() => new THREE.Color(), []);
  const tmpGround = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 0.8);
    const c = cur.current;
    c.sun.lerp(tmpSun.set(target.sunColor), k);
    c.hemiSky.lerp(tmpSky.set(target.hemiSky), k);
    c.hemiGround.lerp(tmpGround.set(target.hemiGround), k);
    c.sunI += (target.sunIntensity - c.sunI) * k;
    c.ambI += (target.ambientIntensity - c.ambI) * k;
    c.hemiI += (target.hemiIntensity - c.hemiI) * k;
    const dim = dimmed ? 0.43 : 1;
    if (dirRef.current) {
      dirRef.current.color.copy(c.sun);
      dirRef.current.intensity = c.sunI * dim;
    }
    if (ambRef.current) ambRef.current.intensity = c.ambI * (dimmed ? 0.47 : 1);
    if (hemiRef.current) {
      hemiRef.current.color.copy(c.hemiSky);
      hemiRef.current.groundColor.copy(c.hemiGround);
      hemiRef.current.intensity = c.hemiI * (dimmed ? 0.43 : 1);
    }
  });
  return null;
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
  // Automatic ambience: season from the device date, time of day
  // from the device hour, re-checked every minute. No setting, no UI.
  const [ambience, setAmbience] = useState(() => ({
    season: getSeason(new Date()),
    timeOfDay: getTimeOfDay(new Date()),
  }));
  useEffect(() => {
    const id = window.setInterval(() => {
      setAmbience({ season: getSeason(new Date()), timeOfDay: getTimeOfDay(new Date()) });
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const lightTarget = LIGHT_TARGETS[ambience.timeOfDay];
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  return (
    <SceneErrorBoundary onError={onError}>
      <div style={{ height: 480, borderRadius: 18, overflow: 'hidden' }}>
        <Canvas
          shadows="soft"
          dpr={[1, 1.75]}
          camera={{ fov: 42, position: [0, 15, 15], near: 0.1, far: 90 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <ambientLight ref={ambRef} intensity={dimmed ? 0.35 : lightTarget.ambientIntensity} />
          <hemisphereLight
            ref={hemiRef}
            args={[lightTarget.hemiSky, lightTarget.hemiGround, dimmed ? 0.3 : lightTarget.hemiIntensity]}
          />
          <directionalLight
            ref={dirRef}
            position={[10, 14, 4]}
            intensity={dimmed ? 0.9 : lightTarget.sunIntensity}
            color={lightTarget.sunColor}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-11}
            shadow-camera-right={11}
            shadow-camera-top={11}
            shadow-camera-bottom={-11}
          />
          <LightLerp target={lightTarget} dimmed={dimmed} dirRef={dirRef} ambRef={ambRef} hemiRef={hemiRef} />
          <Suspense fallback={null}>
            <World season={ambience.season} lampGlow={lightTarget.lampGlow} reducedMotion={reducedMotion} />
            <Board3D
              game={game}
              focusTile={focusTile}
              highlightTile={highlightTile}
              jailClosed={jailClosed}
              shineTile={shineTile}
              landingTile={landingTile}
              reducedMotion={reducedMotion}
              night={ambience.timeOfDay === 'night'}
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
            <Petals season={ambience.season} />
            {ambience.season === 'valentine' && <Hearts reducedMotion={reducedMotion} />}
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
