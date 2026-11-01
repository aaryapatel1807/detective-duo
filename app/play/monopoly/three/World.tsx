/** The cozy Japanese garden room around the board: wooden floor and
 * table, swaying cherry-blossom trees, glowing street lamps, drifting
 * clouds, butterflies and tiny birds. All procedural geometry, all
 * animated with a single cheap useFrame per animated group. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { woodTexture } from './textures';

function BlossomTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!group.current) return;
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
        [0, 2.6, 0, 1.25, '#ffb7c5'],
        [0.8, 2.1, 0.3, 0.85, '#ffc9d6'],
        [-0.8, 2.2, -0.2, 0.9, '#ff9ebb'],
        [0.1, 3.2, -0.3, 0.8, '#ffd1dc'],
      ].map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} castShadow>
          <sphereGeometry args={[r as number, 12, 10]} />
          <meshStandardMaterial color={c as string} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.8, 8]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#ffd977" emissive="#ffb830" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshBasicMaterial color="#ffcf6b" transparent opacity={0.14} />
      </mesh>
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

export default function World() {
  const floorTex = useMemo(() => {
    const t = woodTexture('#8a5a33', '#5d3a1a');
    t.repeat.set(5, 5);
    return t;
  }, []);
  const tableTex = useMemo(() => woodTexture('#7a4a24', '#4a2c12'), []);
  return (
    <group>
      {/* Garden lawn */}
      <mesh position={[0, -2.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[46, 46]} />
        <meshStandardMaterial color="#7fae7a" roughness={1} />
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
      <BlossomTree position={[-10.5, -2, -6]} scale={1.15} />
      <BlossomTree position={[10.8, -2, -5]} scale={1.0} />
      <BlossomTree position={[-11, -2, 5.5]} scale={0.9} />
      <BlossomTree position={[11, -2, 6]} scale={1.2} />
      <BlossomTree position={[0, -2, -11.5]} scale={1.05} />
      {/* Street lamps */}
      <Lamp position={[-8.6, -2, -8.6]} />
      <Lamp position={[8.6, -2, -8.6]} />
      <Lamp position={[-8.6, -2, 8.6]} />
      <Lamp position={[8.6, -2, 8.6]} />
      {/* Clouds, butterflies, birds */}
      <Cloud position={[-6, 9, -8]} speed={0.12} />
      <Cloud position={[5, 10, -9]} speed={0.09} />
      <Cloud position={[-10, 8.5, 3]} speed={0.11} />
      <Butterfly origin={[-3, 1.6, 3]} colour="#ff8fb3" />
      <Butterfly origin={[4, 2.2, -2]} colour="#ffd166" />
      <Butterfly origin={[1, 1.4, 5]} colour="#a78bfa" />
      <Birds />
    </group>
  );
}
