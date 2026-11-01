/** 3D dice with a scripted throw: while `rolling` they tumble and
 * bounce; when the roll ends they ease to the orientation of the
 * predetermined face. The result is never re-rolled — `faces` comes
 * from the existing game logic. Doubles get a slower, slow-motion
 * settle. Reduced-motion skips the tumble and shows the faces. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dieFaceTexture } from './textures';

/** Euler angles that put each value on top. Box material order is
 * [+x, -x, +y, -y, +z, -z] = [3, 4, 1, 6, 2, 5]; opposites sum to 7. */
const TOP_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

function Die({
  value,
  position,
  rolling,
  doubles,
  reducedMotion,
}: {
  value: number;
  position: [number, number, number];
  rolling: boolean;
  doubles: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.56, 0.56, 0.56), []);
  const materials = useMemo(() => {
    const order = [3, 4, 1, 6, 2, 5];
    return order.map(
      (v) => new THREE.MeshStandardMaterial({ map: dieFaceTexture(v), roughness: 0.35 }),
    );
  }, []);
  const settle = useRef<{ from: THREE.Euler; start: number; duration: number } | null>(null);
  const prevRolling = useRef(rolling);

  useEffect(() => {
    if (prevRolling.current && !rolling) {
      // Roll ended: ease from wherever the tumble left the die to the
      // orientation of the predetermined face.
      if (group.current) {
        settle.current = {
          from: group.current.rotation.clone(),
          start: performance.now() / 1000,
          duration: doubles ? 0.6 : 0.35,
        };
      }
    }
    prevRolling.current = rolling;
  }, [rolling, doubles]);

  useEffect(() => {
    // New predetermined face: snap the target orientation when not
    // animating (e.g. first render, reduced-motion).
    if (!rolling && !settle.current && group.current) {
      const r = TOP_ROTATION[value] ?? [0, 0, 0];
      group.current.rotation.set(r[0], r[1], r[2]);
    }
  }, [value, rolling]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    if (rolling && !reducedMotion) {
      group.current.rotation.x = t * 9 + Math.sin(t * 13) * 0.6;
      group.current.rotation.y = t * 7.3;
      group.current.rotation.z = t * 5.1;
      group.current.position.y = position[1] + Math.abs(Math.sin(t * 11)) * 0.55;
      return;
    }
    if (settle.current) {
      const now = performance.now() / 1000;
      const p = Math.min(1, (now - settle.current.start) / settle.current.duration);
      const e = easeOutCubic(p);
      const target = TOP_ROTATION[value] ?? [0, 0, 0];
      const from = settle.current.from;
      // Shortest-path interpolation per axis (handles the PI flip).
      const lerpAngle = (a: number, b: number): number => {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return a + d * e;
      };
      group.current.rotation.set(
        lerpAngle(from.x, target[0]),
        lerpAngle(from.y, target[1]),
        lerpAngle(from.z, target[2]),
      );
      group.current.position.y = position[1] + Math.sin(p * Math.PI) * 0.18;
      if (p >= 1) settle.current = null;
      return;
    }
    group.current.position.y = position[1];
  });

  return (
    <group ref={group} position={position}>
      <mesh geometry={geo} material={materials} castShadow />
    </group>
  );
}

export default function Dice3D({
  faces,
  rolling,
  doubles,
  reducedMotion,
}: {
  faces: [number, number];
  rolling: boolean;
  doubles: boolean;
  reducedMotion: boolean;
}) {
  return (
    <group>
      <Die value={faces[0]} position={[-0.85, 0.59, 2.7]} rolling={rolling} doubles={doubles} reducedMotion={reducedMotion} />
      <Die value={faces[1]} position={[0.85, 0.59, 2.7]} rolling={rolling} doubles={doubles} reducedMotion={reducedMotion} />
    </group>
  );
}
