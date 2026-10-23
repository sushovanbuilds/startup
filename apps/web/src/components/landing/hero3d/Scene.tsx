'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  MathUtils,
  MeshBasicMaterial,
  Mesh,
  Group,
} from 'three';
import { getHeroProgress } from './store';

/**
 * The 3D apparatus: three thin layered plates in isometric view.
 * - Line-art edges in signal orange, translucent paper-tone faces
 *   (MeshBasicMaterial only: no lights, no shadows, no postprocessing).
 * - Idle: slow float. Pointer: gentle damped tilt toward the cursor.
 * - Scroll: plates separate vertically, driven by the shared hero progress
 *   store (written by LandingMotion's ScrollTrigger).
 * - Hover a plate: it lifts, its label chip stays and a metric chip fades in.
 * - Transform/opacity only; frameloop 'never' while offscreen; dpr capped at
 *   1.5; geometries disposed explicitly on unmount.
 */

const ORANGE = '#FF5A1F';

interface PlateSpec {
  label: string;
  metric: string;
  y: number;
  face: string;
}

const PLATES: PlateSpec[] = [
  { label: 'SPEED', metric: 'LCP 1.14s', y: 0.62, face: '#FDFCF8' },
  { label: 'SEO', metric: 'CANON 100%', y: 0, face: '#F9F6EE' },
  { label: 'SECURITY', metric: 'HSTS + CSP', y: -0.62, face: '#F3F0E7' },
];

function Plate({ plate, index }: { plate: PlateSpec; index: number }) {
  // Explicit geometry lifecycle (freed independently of JSX unmount order).
  const geometry = useMemo(() => new BoxGeometry(3.4, 0.3, 2.2), []);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);
  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
    },
    [geometry, edges]
  );

  const mesh = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    // Exploded-view separation (scroll progress) + hover lift, both damped.
    const target =
      plate.y + (index - 1) * getHeroProgress() * 1.6 + (hovered ? 0.38 : 0);
    mesh.current.position.y = MathUtils.damp(
      mesh.current.position.y,
      target,
      7,
      delta
    );
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      position={[0, plate.y, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshBasicMaterial color={plate.face} transparent opacity={hovered ? 0.97 : 0.84} />
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={ORANGE} />
      </lineSegments>
      <Html center position={[0, 0.34, 0]} style={{ pointerEvents: 'none' }}>
        <div className="bg-paper border border-rule-dark px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-carbon whitespace-nowrap">
          {plate.label}
        </div>
      </Html>
      {hovered && (
        <Html center position={[0, -0.4, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1.5 bg-carbon px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-paper whitespace-nowrap">
            <span className="inline-block w-1.5 h-1.5 bg-signal animate-pulse"></span>
            {plate.metric.toUpperCase()}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null!);
  const cam = useThree((s) => s.camera);

  useEffect(() => {
    cam.position.set(3.7, 2.9, 4.7);
    cam.lookAt(0, 0, 0);
  }, [cam]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Gentle tilt toward the pointer, damped; idle float on y.
    const targetX = -0.615 - state.pointer.y * 0.14;
    const targetY = Math.PI / 7.5 + state.pointer.x * 0.2;
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, targetX, 3.5, delta);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetY, 3.5, delta);
    group.current.position.y = Math.sin(t * 0.55) * 0.055;
  });

  return <group ref={group}>{children}</group>;
}

function DisposeOnUnmount() {
  const gl = useThree((s) => s.gl);
  useEffect(
    () => () => {
      gl.forceContextLoss();
      gl.dispose();
    },
    [gl]
  );
  return null;
}

export default function Scene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  // Zero work while scrolled away: frameloop 'never' (stricter than 'demand').
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold: 0.02 }
    );
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="w-full h-full">
      <Canvas
        frameloop={onScreen ? 'always' : 'never'}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 33, position: [3.7, 2.9, 4.7] }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Rig>
          {PLATES.map((p, i) => (
            <Plate key={p.label} plate={p} index={i} />
          ))}
        </Rig>
        <DisposeOnUnmount />
      </Canvas>
    </div>
  );
}
