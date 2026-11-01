/** The 3D board: a wooden frame, raised tiles whose tops carry the
 * real city name, country colour, price and flag-free label (drawn
 * procedurally), owner rings, and houses/hotels as small 3D buildings
 * that drop from above when newly built. The centre platform carries
 * the game's original city photograph, the two card-deck stacks, and
 * the dice area. Tiles are clickable — the page opens the deed card. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { BOARD, groupColour, type GameState } from '@/lib/generators/monopoly';
import { tilePos } from './boardMath';
import { deckTexture, tileTexture } from './textures';

const PLAYER_COLOURS = ['#2563eb', '#db2777'];

function shortName(name: string): string {
  return name.split(',')[0] ?? name;
}

function House({ position, hotel, night }: { position: [number, number, number]; hotel: boolean; night: boolean }) {
  const colour = hotel ? '#facc15' : '#4ade80';
  const roof = hotel ? '#fde047' : '#22c55e';
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={hotel ? [0.3, 0.42, 0.24] : [0.22, 0.26, 0.2]} />
        <meshStandardMaterial color={colour} roughness={0.6} />
      </mesh>
      <mesh position={[0, (hotel ? 0.42 : 0.26) / 2 + 0.07, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[hotel ? 0.24 : 0.18, 0.16, 4]} />
        <meshStandardMaterial color={roof} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.02, 0.11]}>
        <boxGeometry args={[0.07, 0.12, 0.02]} />
        <meshStandardMaterial color="#14532d" roughness={0.8} />
      </mesh>
      {/* A window that glows warmly at night, dim by day. */}
      <mesh position={[-0.05, 0.02, 0.11]}>
        <boxGeometry args={[0.05, 0.06, 0.02]} />
        <meshStandardMaterial
          color="#ffd977"
          emissive="#ffb830"
          emissiveIntensity={night ? 1.6 : 0.15}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

/** A miniature landmark on a property tile: one tiny original
 * procedural silhouette per country group, sitting on the tile's
 * outer edge so it never covers the name, price, tokens, or houses.
 * Shapes are generic (a clock tower, a suspension bridge, a pagoda)
 * — never a traced or copied depiction, and never a logo. At tile
 * size they read as silhouettes, which is the point; the deed card
 * stays the readable detail view. Landmarks never intercept clicks. */
function Landmark({ group, tileX, tileZ }: { group: string; tileX: number; tileZ: number }) {
  const len = Math.hypot(tileX, tileZ) || 1;
  const ox = tileX / len;
  const oz = tileZ / len;
  const noRay = { raycast: () => null } as const;
  const pos: [number, number, number] = [tileX + ox * 0.34, 0.3, tileZ + oz * 0.34];
  // Group-level shapes; hero cities share their group's landmark,
  // which is what still reads at this size.
  if (group === 'yellow') {
    // Japan: a tiny pagoda with a sakura dot.
    return (
      <group position={pos}>
        <mesh {...noRay} position={[0, 0.04, 0]}>
          <boxGeometry args={[0.22, 0.08, 0.22]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
        </mesh>
        <mesh {...noRay} position={[0, 0.12, 0]}>
          <boxGeometry args={[0.16, 0.1, 0.16]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.7} />
        </mesh>
        <mesh {...noRay} position={[0, 0.21, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.17, 0.1, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh {...noRay} position={[0.14, 0.03, 0.1]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshStandardMaterial color="#ffb7c5" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (group === 'green') {
    // United Kingdom: a clock tower plus a red phone-box shape.
    return (
      <group position={pos}>
        <mesh {...noRay} position={[-0.06, 0.17, 0]}>
          <boxGeometry args={[0.1, 0.34, 0.1]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.8} />
        </mesh>
        <mesh {...noRay} position={[-0.06, 0.3, 0.06]}>
          <boxGeometry args={[0.09, 0.09, 0.02]} />
          <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.4} roughness={0.6} />
        </mesh>
        <mesh {...noRay} position={[0.1, 0.06, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  if (group === 'darkblue') {
    // United States: a suspension-bridge shape over a water shimmer.
    return (
      <group position={pos}>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} {...noRay} position={[x, 0.13, 0]}>
            <boxGeometry args={[0.05, 0.26, 0.05]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
        ))}
        <mesh {...noRay} position={[0, 0.26, 0]}>
          <boxGeometry args={[0.3, 0.03, 0.03]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        <mesh {...noRay} position={[0, 0.02, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.1]} />
          <meshStandardMaterial color="#7ec8e3" emissive="#38bdf8" emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
      </group>
    );
  }
  if (group === 'pink') {
    // France: a tapered lattice tower silhouette.
    return (
      <group position={pos}>
        <mesh {...noRay} position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.02, 0.15, 0.36, 4]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh {...noRay} position={[0, 0.38, 0]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} roughness={0.5} />
        </mesh>
      </group>
    );
  }
  if (group === 'red') {
    // Italy: a domed building.
    return (
      <group position={pos}>
        <mesh {...noRay} position={[0, 0.06, 0]}>
          <boxGeometry args={[0.22, 0.12, 0.18]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </mesh>
        <mesh {...noRay} position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  if (group === 'orange') {
    // Germany: a timber-framed house with a steep roof.
    return (
      <group position={pos}>
        <mesh {...noRay} position={[0, 0.07, 0]}>
          <boxGeometry args={[0.2, 0.14, 0.16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.85} />
        </mesh>
        <mesh {...noRay} position={[0, 0.08, 0.085]}>
          <boxGeometry args={[0.2, 0.02, 0.01]} />
          <meshStandardMaterial color="#6b4226" roughness={0.9} />
        </mesh>
        <mesh {...noRay} position={[0, 0.19, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.17, 0.12, 4]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.8} />
        </mesh>
      </group>
    );
  }
  if (group === 'lightblue') {
    // Spain: an arched gateway with a small dome.
    return (
      <group position={pos}>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} {...noRay} position={[x, 0.07, 0]}>
            <boxGeometry args={[0.05, 0.14, 0.12]} />
            <meshStandardMaterial color="#fde68a" roughness={0.8} />
          </mesh>
        ))}
        <mesh {...noRay} position={[0, 0.15, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.12]} />
          <meshStandardMaterial color="#fde68a" roughness={0.8} />
        </mesh>
        <mesh {...noRay} position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  // Portugal (brown): a white house with a terracotta roof and a
  // small tower.
  return (
    <group position={pos}>
      <mesh {...noRay} position={[-0.03, 0.07, 0]}>
        <boxGeometry args={[0.18, 0.14, 0.16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </mesh>
      <mesh {...noRay} position={[-0.03, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.15, 0.1, 4]} />
        <meshStandardMaterial color="#c2410c" roughness={0.8} />
      </mesh>
      <mesh {...noRay} position={[0.12, 0.1, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.2, 8]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Houses on one tile; the newest building drops in with a bounce. */
function Buildings({ square, houses, tileX, tileZ, night }: { square: number; houses: number; tileX: number; tileZ: number; night: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dropStart = useRef(-10);
  const prevCount = useRef(houses);
  useEffect(() => {
    if (houses > prevCount.current) dropStart.current = performance.now() / 1000;
    prevCount.current = houses;
  }, [houses]);
  useFrame(() => {
    if (!group.current) return;
    const age = performance.now() / 1000 - dropStart.current;
    const p = Math.min(1, age / 0.5);
    // Ease-out bounce for the drop, then rest at 0.
    const bounce = p >= 1 ? 0 : Math.abs(Math.sin(p * Math.PI * 2.2)) * (1 - p) * 1.4;
    group.current.position.y = bounce;
  });
  if (houses <= 0) return null;
  const isHotel = houses === 5;
  const count = isHotel ? 1 : houses;
  // Row of buildings along the tile's inner edge (toward the centre).
  const len = Math.hypot(tileX, tileZ) || 1;
  const dir: [number, number] = [-tileX / len, -tileZ / len];
  const perp: [number, number] = [-dir[1], dir[0]];
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => {
        const off = (i - (count - 1) / 2) * 0.24;
        return (
          <House
            key={i}
            hotel={isHotel}
            night={night}
            position={[
              tileX + dir[0] * 0.3 + perp[0] * off,
              0.3 + (isHotel ? 0.21 : 0.13),
              tileZ + dir[1] * 0.3 + perp[1] * off,
            ]}
          />
        );
      })}
    </group>
  );
}

/** Golden shine that washes over a tile for ~0.8s when it is bought
 * (or, in pink, when a token lands on it): the ownership / arrival
 * moment, made visible in the scene. */
function ShineTile({ tile, colour = '#ffd166', reducedMotion }: { tile: number; colour?: string; reducedMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const start = useRef(performance.now() / 1000);
  useEffect(() => {
    start.current = performance.now() / 1000;
  }, [tile]);
  useFrame(() => {
    if (!mesh.current) return;
    const age = performance.now() / 1000 - start.current;
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    if (reducedMotion || age >= 0.8) {
      mat.opacity = 0;
      mesh.current.visible = age < 0.8 && !reducedMotion;
      return;
    }
    mesh.current.visible = true;
    mat.opacity = 0.55 * (1 - age / 0.8);
    mesh.current.scale.setScalar(1 + age * 0.25);
  });
  const [x, z] = tilePos(tile);
  return (
    <mesh ref={mesh} position={[x, 0.35, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshBasicMaterial color={colour} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/** Pulsing glow above the tile the camera is focusing on (buy/build). */
function FocusGlow({ position }: { position: [number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.22 + Math.sin(t * 4) * 0.12;
    mesh.current.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
  });
  return (
    <mesh ref={mesh} position={[position[0], 0.34, position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.15, 1.15]} />
      <meshBasicMaterial color="#ffd166" transparent opacity={0.25} />
    </mesh>
  );
}

/** Soft glow on the tile a token has just stepped onto during travel. */
function TravelGlow({ position }: { position: [number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3 + Math.sin(t * 6) * 0.12;
  });
  return (
    <mesh ref={mesh} position={[position[0], 0.33, position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.05, 1.05]} />
      <meshBasicMaterial color="#ff8fb3" transparent opacity={0.3} />
    </mesh>
  );
}

/** Prison cell: vertical bars over the Prison corner that slide down
 * and lock when anyone is jailed, and slide back up on release. When
 * closed, a dark translucent canopy mutes the light over the tile.
 * Reduced-motion snaps the bars instead of sliding them. */
function JailCell({ closed, reducedMotion }: { closed: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [jx, jz] = tilePos(10);
  useFrame((_, dt) => {
    if (!group.current) return;
    const target = closed ? 0 : 1.9;
    if (reducedMotion) {
      group.current.position.y = target;
    } else {
      // Damped slide toward the target height.
      const cur = group.current.position.y;
      group.current.position.y = cur + (target - cur) * Math.min(1, dt * 6);
    }
  });
  const barMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.6 }),
    [],
  );
  return (
    <group position={[jx, 0, jz]}>
      {closed && (
        <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.35} />
        </mesh>
      )}
      <group ref={group} position={[0, 1.9, 0]}>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.05, 0.08, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
          <mesh key={x} position={[x, 0.32, 0]} material={barMat}>
            <boxGeometry args={[0.05, 0.6, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[1.05, 0.08, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function Board3D({
  game,
  focusTile,
  highlightTile,
  jailClosed,
  shineTile,
  landingTile,
  reducedMotion,
  night = false,
  onTileClick,
}: {
  game: GameState;
  focusTile: number | null;
  highlightTile: number | null;
  jailClosed: boolean;
  shineTile: number | null;
  landingTile: { tile: number; key: number } | null;
  reducedMotion: boolean;
  night?: boolean;
  onTileClick: (index: number) => void;
}) {
  const cityTex = useLoader(THREE.TextureLoader, '/monopoly-city.jpg');
  const sideMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a1b4a', roughness: 0.7 }),
    [],
  );
  const tileTopMats = useMemo(() => {
    return BOARD.map((sq) => {
      const price =
        sq.price !== undefined ? `$${sq.price}` : sq.tax !== undefined ? `$${sq.tax}` : '';
      return new THREE.MeshStandardMaterial({
        map: tileTexture(shortName(sq.name), groupColour(sq.group), price),
        roughness: 0.65,
      });
    });
  }, []);
  const chanceDeckMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: deckTexture('chance'), roughness: 0.6 }),
    [],
  );
  const chestDeckMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: deckTexture('chest'), roughness: 0.6 }),
    [],
  );
  const deckSide = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 }),
    [],
  );
  const tileGeo = useMemo(() => new THREE.BoxGeometry(1.0, 0.3, 1.0), []);
  const frameGeo = useMemo(() => new THREE.BoxGeometry(12.9, 0.3, 12.9), []);
  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4a2c12', roughness: 0.55 }),
    [],
  );
  const platformGeo = useMemo(() => new THREE.BoxGeometry(7.6, 0.3, 7.6), []);
  const platformMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#241640', roughness: 0.7 }),
    [],
  );

  return (
    <group>
      {/* Wooden frame under the whole board */}
      <mesh geometry={frameGeo} material={frameMat} position={[0, 0, 0]} receiveShadow castShadow />
      {/* Centre platform + original city photograph */}
      <mesh geometry={platformGeo} material={platformMat} position={[0, 0.15, 0]} receiveShadow />
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.4, 7.4]} />
        <meshStandardMaterial map={cityTex} roughness={0.8} />
      </mesh>
      {/* Card decks on the centre platform */}
      {([
        { mat: chanceDeckMat, x: -2.6 },
        { mat: chestDeckMat, x: 2.6 },
      ] as const).map((d, i) => (
        <mesh
          key={i}
          position={[d.x, 0.38, 2.7]}
          geometry={tileGeo}
          material={[deckSide, deckSide, d.mat, deckSide, deckSide, deckSide]}
          scale={[0.72, 0.42, 0.95]}
          castShadow
        />
      ))}
      {/* Perimeter tiles */}
      {BOARD.map((sq) => {
        const [x, z] = tilePos(sq.index);
        const prop = game.property[sq.index];
        const clickable =
          sq.kind === 'property' || sq.kind === 'station' || sq.kind === 'utility';
        return (
          <group key={sq.index}>
            <mesh
              geometry={tileGeo}
              material={[sideMat, sideMat, tileTopMats[sq.index], sideMat, sideMat, sideMat]}
              position={[x, 0.15, z]}
              receiveShadow
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                if (clickable) onTileClick(sq.index);
              }}
            />
            {prop.owner !== null && (
              <mesh position={[x, 0.315, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.42, 0.52, 24]} />
                <meshBasicMaterial color={PLAYER_COLOURS[prop.owner]} transparent opacity={0.95} side={THREE.DoubleSide} />
              </mesh>
            )}
            {sq.kind === 'property' && sq.group && (
              <Landmark group={sq.group} tileX={x} tileZ={z} />
            )}
            <Buildings square={sq.index} houses={prop.houses} tileX={x} tileZ={z} night={night} />
          </group>
        );
      })}
      {focusTile !== null && <FocusGlow position={tilePos(focusTile)} />}
      {highlightTile !== null && <TravelGlow position={tilePos(highlightTile)} />}
      {shineTile !== null && <ShineTile key={shineTile} tile={shineTile} reducedMotion={reducedMotion} />}
      {landingTile !== null && (
        <ShineTile key={landingTile.key} tile={landingTile.tile} colour="#ff8fb3" reducedMotion={reducedMotion} />
      )}
      <JailCell closed={jailClosed} reducedMotion={reducedMotion} />
    </group>
  );
}
