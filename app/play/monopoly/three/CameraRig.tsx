/** Cinematic camera rig: smooth damped movement between modes.
 * idle = gentle floating drift; dice = quick zoom to the dice;
 * walk = follows the active token; buy/build = focuses the tile;
 * victory = slow orbit. Shake fires ONLY on important moments
 * (doubles, jail, bankruptcy, hotel) via `shakeKey` — never on an
 * ordinary roll landing. Reduced-motion locks a calm static camera
 * and disables shake entirely. */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { tilePos } from './boardMath';

export type CameraMode = 'idle' | 'dice' | 'walk' | 'buy' | 'build' | 'jail' | 'victory';

export default function CameraRig({
  mode,
  focusTile,
  followSquare,
  shakeKey,
  reducedMotion,
}: {
  mode: CameraMode;
  focusTile: number | null;
  followSquare: number;
  shakeKey: number;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.3, 0));
  const shakeUntil = useRef(0);

  useEffect(() => {
    // Important moment only (doubles / jail / bankruptcy / hotel):
    // a brief, small shake. Ordinary roll landings do not shake.
    if (shakeKey > 0 && !reducedMotion) shakeUntil.current = performance.now() / 1000 + 0.35;
  }, [shakeKey, reducedMotion]);

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    const target = new THREE.Vector3();
    const lookTarget = new THREE.Vector3(0, 0.3, 0);
    if (reducedMotion) {
      target.set(0, 15, 15);
    } else if (mode === 'victory') {
      const a = t * 0.22;
      target.set(Math.sin(a) * 15, 10, Math.cos(a) * 15);
    } else if (mode === 'dice') {
      target.set(0, 4.6, 8.2);
      lookTarget.set(0, 0.6, 2.7);
    } else if (mode === 'walk') {
      const [fx, fz] = tilePos(followSquare);
      target.set(fx * 0.5, 7.6, fz * 0.5 + 7.2);
      lookTarget.set(fx, 0.3, fz);
    } else if ((mode === 'buy' || mode === 'build') && focusTile !== null) {
      const [fx, fz] = tilePos(focusTile);
      const len = Math.hypot(fx, fz) || 1;
      target.set(fx + (fx / len) * 2.6, 6.4, fz + (fz / len) * 2.6);
      lookTarget.set(fx, 0.3, fz);
    } else if (mode === 'jail') {
      // Prison emphasis: closer, lower, looking straight at the cell.
      const [jx, jz] = tilePos(10);
      target.set(jx * 0.55, 5.2, jz * 0.55 + 5.4);
      lookTarget.set(jx, 0.4, jz);
    } else {
      // Idle drift: very subtle floating motion around the default view.
      target.set(Math.sin(t * 0.2) * 1.1, 15 + Math.sin(t * 0.3) * 0.4, 15 + Math.cos(t * 0.23) * 1.1);
    }
    const k = 1 - Math.exp(-dt * (mode === 'dice' ? 6 : 3));
    camera.position.lerp(target, k);
    look.current.lerp(lookTarget, k);
    const now = performance.now() / 1000;
    if (now < shakeUntil.current) {
      const amp = (shakeUntil.current - now) * 0.5;
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp * 0.6;
    }
    camera.lookAt(look.current);
  });

  return null;
}
