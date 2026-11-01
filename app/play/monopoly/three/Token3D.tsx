/** Procedural 3D player tokens. Every shape is built from Three.js
 * primitives or extruded 2D shapes — no downloaded models. The token
 * sits on the player's colour disc, bobs idly ("breathing"), hops
 * when its square changes (the page already steps squares every
 * ~170ms, so hops stay tile-by-tile), bounces when happy, droops
 * when sad, sways while thinking, and spins + jumps on victory. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { tokenPos } from './boardMath';
import { sfx } from './audio';

export type TokenMood = 'idle' | 'happy' | 'sad' | 'thinking' | 'victory';

function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.32);
  s.bezierCurveTo(0, 0.55, -0.48, 0.55, -0.48, 0.28);
  s.bezierCurveTo(-0.48, 0.02, 0, -0.08, 0, -0.34);
  s.bezierCurveTo(0, -0.08, 0.48, 0.02, 0.48, 0.28);
  s.bezierCurveTo(0.48, 0.55, 0, 0.55, 0, 0.32);
  return s;
}

function starShape(): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function TokenShape({ token }: { token: string }) {
  const heartGeo = useMemo(() => new THREE.ExtrudeGeometry(heartShape(), { depth: 0.2, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 }), []);
  const starGeo = useMemo(() => new THREE.ExtrudeGeometry(starShape(), { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), []);
  const white = { color: '#ffffff', roughness: 0.35 };
  const gold = { color: '#ffd166', roughness: 0.3, metalness: 0.4 };
  switch (token) {
    case 'heart':
      return (
        <mesh geometry={heartGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0.02]}>
          <meshStandardMaterial color="#ff5b8f" roughness={0.4} />
        </mesh>
      );
    case 'star':
      return (
        <mesh geometry={starGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <meshStandardMaterial {...gold} />
        </mesh>
      );
    case 'car':
      return (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.72, 0.22, 0.4]} />
            <meshStandardMaterial color="#e63946" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.38, 0.2, 0.36]} />
            <meshStandardMaterial color="#a8d8ff" roughness={0.2} />
          </mesh>
          {[
            [-0.24, -0.21],
            [0.24, -0.21],
            [-0.24, 0.21],
            [0.24, 0.21],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, -0.05, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.11, 0.11, 0.08, 12]} />
              <meshStandardMaterial color="#22223a" roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case 'rocket':
      return (
        <group position={[0, 0.14, 0]} rotation={[0, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.55, 12]} />
            <meshStandardMaterial {...white} />
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <coneGeometry args={[0.16, 0.3, 12]} />
            <meshStandardMaterial color="#e63946" roughness={0.4} />
          </mesh>
          {[-0.7, 0.7].map((x, i) => (
            <mesh key={i} position={[x * 0.28, -0.18, 0]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]}>
              <boxGeometry args={[0.06, 0.3, 0.22]} />
              <meshStandardMaterial color="#e63946" roughness={0.4} />
            </mesh>
          ))}
        </group>
      );
    case 'crown':
      return (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.36, 0.3, 12]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          {[-0.28, 0, 0.28].map((x, i) => (
            <mesh key={i} position={[x, 0.28, 0]} castShadow>
              <coneGeometry args={[0.11, 0.26, 8]} />
              <meshStandardMaterial {...gold} />
            </mesh>
          ))}
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color="#ff5b8f" roughness={0.3} />
          </mesh>
        </group>
      );
    case 'dog':
    case 'cat': {
      const ear = token === 'cat' ? 0.16 : 0.13;
      return (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.3, 14, 12]} />
            <meshStandardMaterial color={token === 'cat' ? '#f4a261' : '#c89b6a'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.3, 0.16]} castShadow>
            <sphereGeometry args={[0.24, 14, 12]} />
            <meshStandardMaterial color={token === 'cat' ? '#f4a261' : '#c89b6a'} roughness={0.8} />
          </mesh>
          {[-0.14, 0.14].map((x, i) => (
            <mesh key={i} position={[x, 0.52, 0.16]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]} castShadow>
              <coneGeometry args={[ear, 0.28, 8]} />
              <meshStandardMaterial color={token === 'cat' ? '#e76f51' : '#8a5a33'} roughness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, 0.26, 0.38]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#22223a" roughness={0.6} />
          </mesh>
        </group>
      );
    }
    case 'flower':
    default: {
      const petals = [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (Math.PI / 3) * i;
        return [Math.cos(a) * 0.24, Math.sin(a) * 0.24] as const;
      });
      return (
        <group position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {petals.map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0]} castShadow>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial color="#ff8fb3" roughness={0.6} />
            </mesh>
          ))}
          <mesh castShadow>
            <sphereGeometry args={[0.15, 12, 10]} />
            <meshStandardMaterial {...gold} />
          </mesh>
        </group>
      );
    }
  }
}

export default function Token3D({
  token,
  colour,
  square,
  slot,
  mood,
  active,
  reducedMotion,
}: {
  token: string;
  colour: string;
  square: number;
  slot: number;
  mood: TokenMood;
  active: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const prevSquare = useRef(square);
  const hopStart = useRef(-10);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const base = tokenPos(square, slot);

  useEffect(() => {
    if (prevSquare.current !== square) {
      prevSquare.current = square;
      hopStart.current = performance.now() / 1000;
      if (active && !reducedMotion) sfx.step();
    }
  }, [square, active, reducedMotion]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const now = performance.now() / 1000;
    const hopAge = now - hopStart.current;
    const hopping = !reducedMotion && hopAge < 0.17;
    const hopY = hopping ? Math.sin((hopAge / 0.17) * Math.PI) * 0.35 : 0;
    let bob = 0;
    let rotZ = 0;
    let rotX = 0;
    let rotY = 0;
    if (reducedMotion) {
      bob = 0;
    } else if (mood === 'happy') {
      bob = Math.abs(Math.sin(t * 6 + phase)) * 0.28;
    } else if (mood === 'sad') {
      rotX = 0.28;
      bob = -0.04;
    } else if (mood === 'thinking') {
      rotZ = Math.sin(t * 1.6 + phase) * 0.12;
      bob = Math.sin(t * 1.6 + phase) * 0.05;
    } else if (mood === 'victory') {
      bob = Math.abs(Math.sin(t * 5 + phase)) * 0.42;
      rotY = t * 2.2;
    } else {
      bob = Math.sin(t * 2 + phase) * 0.045;
    }
    group.current.position.set(base[0], base[1] + bob + hopY, base[2]);
    group.current.rotation.set(rotX, rotY, rotZ);
  });

  return (
    <group ref={group} position={base}>
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.1, 20]} />
        <meshStandardMaterial color={colour} roughness={0.4} />
      </mesh>
      <TokenShape token={token} />
    </group>
  );
}
