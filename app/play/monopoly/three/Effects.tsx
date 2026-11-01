/** Procedural particles: falling cherry petals (instanced, no per-frame
 * allocation), confetti/firework bursts (preallocated point buffers),
 * and flying money bills that arc from payer to receiver. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PETAL_COUNT = 90;

/** Falling petals across the whole garden, swaying in the wind. */
export function Petals() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    return Array.from({ length: PETAL_COUNT }, () => ({
      x: (Math.random() - 0.5) * 26,
      y: Math.random() * 9 - 2,
      z: (Math.random() - 0.5) * 26,
      speed: 0.5 + Math.random() * 0.8,
      sway: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
    }));
  }, []);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < PETAL_COUNT; i += 1) {
      const s = seeds[i];
      s.y -= 0.016 * s.speed;
      if (s.y < -2) s.y = 7;
      dummy.position.set(
        s.x + Math.sin(t * 0.7 + s.sway) * 0.8,
        s.y,
        s.z + Math.cos(t * 0.5 + s.sway) * 0.6,
      );
      dummy.rotation.set(t * 0.8 + s.spin, s.spin, t * 0.5 + s.spin);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PETAL_COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.22, 0.14]} />
      <meshBasicMaterial color="#ffb7c5" side={THREE.DoubleSide} transparent opacity={0.9} />
    </instancedMesh>
  );
}

const BURST_COUNT = 46;

/** One radial burst of coloured points, alive for ~1.2s after `burstKey`. */
export function Burst({
  burstKey,
  position,
  colours,
}: {
  burstKey: number;
  position: [number, number];
  colours: string[];
}) {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const data = useMemo(() => {
    const pos = new Float32Array(BURST_COUNT * 3);
    const col = new Float32Array(BURST_COUNT * 3);
    const vel: [number, number, number][] = [];
    for (let i = 0; i < BURST_COUNT; i += 1) {
      const c = new THREE.Color(colours[i % colours.length]);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      vel.push([0, 0, 0]);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { pos, vel };
  }, [geo, colours]);
  const start = useRef(-10);

  useEffect(() => {
    if (burstKey <= 0) return;
    start.current = performance.now() / 1000;
    for (let i = 0; i < BURST_COUNT; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      data.vel[i] = [Math.cos(a) * speed, 2.5 + Math.random() * 3.5, Math.sin(a) * speed];
      data.pos[i * 3] = position[0];
      data.pos[i * 3 + 1] = 1;
      data.pos[i * 3 + 2] = position[1];
    }
    geo.attributes.position.needsUpdate = true;
  }, [burstKey, position, data, geo]);

  useFrame(() => {
    if (!points.current) return;
    const age = performance.now() / 1000 - start.current;
    if (age < 0 || age > 1.3) {
      points.current.visible = age >= 0 && age <= 1.3;
      return;
    }
    points.current.visible = true;
    const dt = 1 / 60;
    for (let i = 0; i < BURST_COUNT; i += 1) {
      data.vel[i][1] -= 6 * dt;
      data.pos[i * 3] += data.vel[i][0] * dt;
      data.pos[i * 3 + 1] += data.vel[i][1] * dt;
      data.pos[i * 3 + 2] += data.vel[i][2] * dt;
      if (data.pos[i * 3 + 1] < 0.2) data.pos[i * 3 + 1] = 0.2;
    }
    geo.attributes.position.needsUpdate = true;
    const mat = points.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - age / 1.3);
  });

  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.22} vertexColors transparent opacity={1} sizeAttenuation />
    </points>
  );
}

/** Tiny dust puff at a footstep: a few pale points that rise and fade
 * in ~0.6s. Used for tile-by-tile travel highlights. */
export function StepPuff({ puffKey, position }: { puffKey: number; position: [number, number] }) {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const COUNT = 12;
  const data = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel: [number, number, number][] = [];
    for (let i = 0; i < COUNT; i += 1) vel.push([0, 0, 0]);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { pos, vel };
  }, [geo]);
  const start = useRef(-10);
  useEffect(() => {
    if (puffKey <= 0) return;
    start.current = performance.now() / 1000;
    for (let i = 0; i < COUNT; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.7;
      data.vel[i] = [Math.cos(a) * speed, 0.6 + Math.random() * 0.8, Math.sin(a) * speed];
      data.pos[i * 3] = position[0] + (Math.random() - 0.5) * 0.4;
      data.pos[i * 3 + 1] = 0.4;
      data.pos[i * 3 + 2] = position[1] + (Math.random() - 0.5) * 0.4;
    }
    geo.attributes.position.needsUpdate = true;
  }, [puffKey, position, data, geo]);
  useFrame(() => {
    if (!points.current) return;
    const age = performance.now() / 1000 - start.current;
    if (age < 0 || age > 0.6) {
      points.current.visible = false;
      return;
    }
    points.current.visible = true;
    const dt = 1 / 60;
    for (let i = 0; i < COUNT; i += 1) {
      data.pos[i * 3] += data.vel[i][0] * dt;
      data.pos[i * 3 + 1] += data.vel[i][1] * dt;
      data.pos[i * 3 + 2] += data.vel[i][2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
    const mat = points.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 0.7 * (1 - age / 0.6));
  });
  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.14} color="#e8dcc8" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

/** Victory fireworks: repeating waves of bursts across the sky. */
export function Fireworks() {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const COUNT = 160;
  const data = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vel: [number, number, number][] = [];
    const palette = ['#ff5b8f', '#ffd166', '#a78bfa', '#4ade80', '#38bdf8'];
    for (let i = 0; i < COUNT; i += 1) {
      const c = new THREE.Color(palette[i % palette.length]);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      vel.push([0, -1, 0]);
      pos[i * 3 + 1] = -10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { pos, vel };
  }, [geo]);
  const wave = useRef(0);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    // A new wave every ~1.6s, from a random sky position.
    const waveIndex = Math.floor(t / 1.6);
    if (waveIndex !== wave.current) {
      wave.current = waveIndex;
      const ox = (Math.random() - 0.5) * 10;
      const oz = (Math.random() - 0.5) * 10;
      for (let i = 0; i < COUNT; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        data.vel[i] = [Math.cos(a) * speed, 1.5 + Math.random() * 2.5, Math.sin(a) * speed];
        data.pos[i * 3] = ox;
        data.pos[i * 3 + 1] = 5 + Math.random() * 2;
        data.pos[i * 3 + 2] = oz;
      }
    }
    const dt = 1 / 60;
    for (let i = 0; i < COUNT; i += 1) {
      data.vel[i][1] -= 2.2 * dt;
      data.pos[i * 3] += data.vel[i][0] * dt;
      data.pos[i * 3 + 1] += data.vel[i][1] * dt;
      data.pos[i * 3 + 2] += data.vel[i][2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.2} vertexColors transparent opacity={0.95} sizeAttenuation />
    </points>
  );
}

/** Floating dust motes drifting in the warm light above the board:
 * a small preallocated point cloud, slowly swirling — atmosphere
 * that costs almost nothing. */
export function Dust() {
  const points = useRef<THREE.Points>(null);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const COUNT = 42;
  const data = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const seeds: { x: number; y: number; z: number; s: number; p: number }[] = [];
    for (let i = 0; i < COUNT; i += 1) {
      seeds.push({
        x: (Math.random() - 0.5) * 16,
        y: 0.5 + Math.random() * 4,
        z: (Math.random() - 0.5) * 16,
        s: 0.1 + Math.random() * 0.3,
        p: Math.random() * Math.PI * 2,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { pos, seeds };
  }, [geo]);
  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < COUNT; i += 1) {
      const s = data.seeds[i];
      data.pos[i * 3] = s.x + Math.sin(t * s.s + s.p) * 0.8;
      data.pos[i * 3 + 1] = s.y + Math.sin(t * s.s * 0.7 + s.p) * 0.4;
      data.pos[i * 3 + 2] = s.z + Math.cos(t * s.s * 0.8 + s.p) * 0.8;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.07} color="#ffe9c9" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

export interface MoneyFlight {
  key: number;
  from: [number, number];
  to: [number, number];
}

/** Five little gold bills arcing from payer to receiver (~0.9s). */
export function MoneyFlyer({ flight }: { flight: MoneyFlight }) {
  const group = useRef<THREE.Group>(null);
  const start = useRef(performance.now() / 1000);
  useEffect(() => {
    start.current = performance.now() / 1000;
  }, [flight.key]);
  useFrame(() => {
    if (!group.current) return;
    const p = Math.min(1, (performance.now() / 1000 - start.current) / 0.9);
    group.current.visible = p < 1;
    group.current.children.forEach((child, i) => {
      const q = Math.min(1, Math.max(0, p * 1.3 - i * 0.06));
      const x = flight.from[0] + (flight.to[0] - flight.from[0]) * q;
      const z = flight.from[1] + (flight.to[1] - flight.from[1]) * q;
      const y = 1 + Math.sin(q * Math.PI) * 2.5;
      child.position.set(x, y, z);
      child.rotation.y = q * Math.PI * 2;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.34, 0.03, 0.2]} />
          <meshStandardMaterial color="#4ade80" roughness={0.5} emissive="#166534" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
