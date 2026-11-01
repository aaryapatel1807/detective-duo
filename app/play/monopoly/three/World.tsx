/** The cozy Japanese garden room around the board: wooden floor and
 * table, swaying cherry-blossom trees, glowing street lamps, drifting
 * clouds, butterflies and tiny birds. All procedural geometry, all
 * animated with a single cheap useFrame per animated group.
 * Seasonal dressing (canopy, lawn, decorations) and lamp glow come
 * from props — the season and time of day are automatic, never a
 * setting. Reduced-motion freezes the swaying and shimmer. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { woodTexture } from './textures';
import { SEASON_CANOPY, SEASON_LAWN, type Season } from './ambience';

function BlossomTree({
  position,
  scale = 1,
  canopy,
  baubles,
  reducedMotion,
}: {
  position: [number, number, number];
  scale?: number;
  canopy: [string, string, string, string];
  baubles: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    group.current.rotation.z = Math.sin(t * 0.7 + phase) * 0.02;
    group.current.rotation.x = Math.cos(t * 0.5 + phase) * 0.015;
  });
  return (
    <group ref={group} position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 2.2, 8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      {[
        [0, 2.6, 0, 1.25],
        [0.8, 2.1, 0.3, 0.85],
        [-0.8, 2.2, -0.2, 0.9],
        [0.1, 3.2, -0.3, 0.8],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} castShadow>
          <sphereGeometry args={[r as number, 12, 10]} />
          <meshStandardMaterial color={canopy[i]} roughness={0.85} />
        </mesh>
      ))}
      {baubles &&
        (['#ef4444', '#facc15', '#38bdf8', '#ff8fb3'] as const).map((c, i) => (
          <mesh key={c} position={[[-0.7, 0.7, 0.2, 0.5][i], [2.3, 2.9, 2.0, 3.1][i], 0.6]}>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.7} roughness={0.4} />
          </mesh>
        ))}
    </group>
  );
}

function Lamp({
  position,
  glow,
  reducedMotion,
}: {
  position: [number, number, number];
  glow: number;
  reducedMotion: boolean;
}) {
  const globeMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    if (!globeMat.current || reducedMotion) return;
    // Glow drifts toward its target instead of cutting on the hour.
    const cur = globeMat.current.emissiveIntensity;
    globeMat.current.emissiveIntensity = cur + (glow - cur) * Math.min(1, dt * 0.8);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.8, 8]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial ref={globeMat} color="#ffd977" emissive="#ffb830" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshBasicMaterial color="#ffcf6b" transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

/** A paper lantern hanging from a short branch off a tree, swaying
 * gently in the wind. The branch reads as part of the tree; the
 * lantern itself is one small emissive box plus a glow shell. */
function TreeLantern({
  position,
  phase,
  reducedMotion,
}: {
  position: [number, number, number];
  phase: number;
  reducedMotion: boolean;
}) {
  const swing = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!swing.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    swing.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.18;
    swing.current.rotation.x = Math.cos(t * 0.7 + phase) * 0.1;
  });
  return (
    <group position={position}>
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      <group ref={swing} position={[0.9, 0, 0]}>
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 4]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.62, 0]} castShadow>
          <boxGeometry args={[0.26, 0.32, 0.26]} />
          <meshStandardMaterial color="#ffdfae" emissive="#ffb830" emissiveIntensity={1.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <boxGeometry args={[0.36, 0.42, 0.36]} />
          <meshBasicMaterial color="#ffcf6b" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** A small garden pond on the lawn: a shimmering water plane plus
 * two expanding ripple rings. One cheap useFrame, no textures. */
function Pond({ reducedMotion }: { reducedMotion: boolean }) {
  const water = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    if (water.current) {
      const mat = water.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.72 + Math.sin(t * 1.3) * 0.1;
    }
    [ringA, ringB].forEach((ring, i) => {
      if (!ring.current) return;
      const p = ((t * 0.35 + i * 0.5) % 1 + 1) % 1;
      ring.current.scale.setScalar(0.4 + p * 1.6);
      const mat = ring.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 * (1 - p);
    });
  });
  return (
    <group position={[13.5, -1.98, 9.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={water}>
        <planeGeometry args={[4.2, 2.6]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.8} roughness={0.15} metalness={0.4} />
      </mesh>
      {[ringA, ringB].map((ref, i) => (
        <mesh key={i} ref={ref} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.55, 24]} />
          <meshBasicMaterial color="#dff3ff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Cloud({ position, speed }: { position: [number, number, number]; speed: number }) {
  const group = useRef<THREE.Group>(null);
  const baseX = position[0];
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.x = baseX + Math.sin(t * speed) * 1.6;
  });
  return (
    <group ref={group} position={position}>
      {[
        [0, 0, 0, 1.1],
        [1.1, -0.1, 0, 0.8],
        [-1.1, -0.05, 0, 0.85],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[r, 12, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function Butterfly({ origin, colour }: { origin: [number, number, number]; colour: string }) {
  const group = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.position.set(
        origin[0] + Math.sin(t * 0.5 + phase) * 2.2,
        origin[1] + Math.sin(t * 0.9 + phase) * 0.5,
        origin[2] + Math.cos(t * 0.4 + phase) * 1.6,
      );
      group.current.rotation.y = Math.sin(t * 0.5 + phase) * 0.8;
    }
    const flap = Math.sin(t * 14 + phase) * 0.9;
    if (wingL.current) wingL.current.rotation.y = flap;
    if (wingR.current) wingR.current.rotation.y = -flap;
  });
  return (
    <group ref={group} position={origin}>
      <mesh ref={wingL} position={[-0.14, 0, 0]}>
        <planeGeometry args={[0.28, 0.2]} />
        <meshBasicMaterial color={colour} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <mesh ref={wingR} position={[0.14, 0, 0]}>
        <planeGeometry args={[0.28, 0.2]} />
        <meshBasicMaterial color={colour} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Birds() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.x = -14 + ((t * 0.7) % 28);
    group.current.position.y = 7 + Math.sin(t * 0.8) * 0.4;
  });
  return (
    <group ref={group} position={[-10, 7, -6]}>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, i * 0.3, 0]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.5, 0.12]} />
          <meshBasicMaterial color="#2b2b3a" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Fake god-ray light shafts: a few large, very translucent additive
 * planes leaning in from the sun's direction, shimmering slowly.
 * No postprocessing pass, so the cost is three quads. */
function LightRays() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + Math.sin(t * 0.4 + i * 1.3) * 0.02;
    });
  });
  return (
    <group ref={group} position={[4, 3.5, -2]} rotation={[0.3, 0, -0.5]}>
      {[0, 1.6, 3.1].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <planeGeometry args={[1.4, 11]} />
          <meshBasicMaterial
            color="#ffe9c9"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function World({
  season = 'spring',
  lampGlow = 1.6,
  reducedMotion = false,
}: {
  season?: Season;
  lampGlow?: number;
  reducedMotion?: boolean;
}) {
  const floorTex = useMemo(() => {
    const t = woodTexture('#8a5a33', '#5d3a1a');
    t.repeat.set(5, 5);
    return t;
  }, []);
  const tableTex = useMemo(() => woodTexture('#7a4a24', '#4a2c12'), []);
  const canopy = SEASON_CANOPY[season];
  const baubles = season === 'christmas';
  return (
    <group>
      {/* Garden lawn */}
      <mesh position={[0, -2.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color={SEASON_LAWN[season]} roughness={1} />
      </mesh>
      {/* Wooden deck under the table */}
      <mesh position={[0, -1.94, 0]} receiveShadow>
        <boxGeometry args={[17, 0.12, 17]} />
        <meshStandardMaterial map={floorTex} roughness={0.85} />
      </mesh>
      {/* Handcrafted wooden table */}
      <mesh position={[0, -0.28, 0]} receiveShadow castShadow>
        <boxGeometry args={[14.4, 0.55, 14.4]} />
        <meshStandardMaterial map={tableTex} roughness={0.6} />
      </mesh>
      {[
        [-6.6, -6.6],
        [6.6, -6.6],
        [-6.6, 6.6],
        [6.6, 6.6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -1.25, z]} castShadow>
          <cylinderGeometry args={[0.32, 0.42, 1.5, 10]} />
          <meshStandardMaterial color="#5d3a1a" roughness={0.8} />
        </mesh>
      ))}
      {/* Blossom trees around the table */}
      <BlossomTree position={[-10.5, -2, -6]} scale={1.15} canopy={canopy} baubles={baubles} reducedMotion={reducedMotion} />
      <BlossomTree position={[10.8, -2, -5]} scale={1.0} canopy={canopy} baubles={baubles} reducedMotion={reducedMotion} />
      <BlossomTree position={[-11, -2, 5.5]} scale={0.9} canopy={canopy} baubles={baubles} reducedMotion={reducedMotion} />
      <BlossomTree position={[11, -2, 6]} scale={1.2} canopy={canopy} baubles={baubles} reducedMotion={reducedMotion} />
      <BlossomTree position={[0, -2, -11.5]} scale={1.05} canopy={canopy} baubles={baubles} reducedMotion={reducedMotion} />
      {/* Street lamps */}
      <Lamp position={[-8.6, -2, -8.6]} glow={lampGlow} reducedMotion={reducedMotion} />
      <Lamp position={[8.6, -2, -8.6]} glow={lampGlow} reducedMotion={reducedMotion} />
      <Lamp position={[-8.6, -2, 8.6]} glow={lampGlow} reducedMotion={reducedMotion} />
      <Lamp position={[8.6, -2, 8.6]} glow={lampGlow} reducedMotion={reducedMotion} />
      {/* Paper lanterns swaying from tree branches */}
      <TreeLantern position={[-9.6, 0.4, -6]} phase={0.4} reducedMotion={reducedMotion} />
      <TreeLantern position={[9.9, 0.4, -5]} phase={2.1} reducedMotion={reducedMotion} />
      <TreeLantern position={[-10.1, 0.4, 5.5]} phase={4.0} reducedMotion={reducedMotion} />
      {/* Garden pond with shimmering water */}
      <Pond reducedMotion={reducedMotion} />
      {/* Clouds, butterflies, birds */}
      <Cloud position={[-6, 9, -8]} speed={0.12} />
      <Cloud position={[5, 10, -9]} speed={0.09} />
      <Cloud position={[-10, 8.5, 3]} speed={0.11} />
      <Butterfly origin={[-3, 1.6, 3]} colour="#ff8fb3" />
      <Butterfly origin={[4, 2.2, -2]} colour="#ffd166" />
      <Butterfly origin={[1, 1.4, 5]} colour="#a78bfa" />
      <Birds />
      <LightRays />
    </group>
  );
}
