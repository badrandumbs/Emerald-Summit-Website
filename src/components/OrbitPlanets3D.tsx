// The six disciplines' planets as lit 3D spheres (three.js through React Three
// Fiber), drawn in one canvas over the orbit stage in OrbitalUniverses. The DOM
// wheel still owns the layout and the labels; this follows its turn each frame.
// Loaded lazily, so three.js never weighs on the landing page's first paint.
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import type { Mesh } from 'three';

interface Props {
  /** The wheel's turn in degrees (clockwise), as the DOM wheel uses it. */
  rotate: MotionValue<number>;
  active: number;
  colors: string[];
  /** Ring radius in percent of the stage, the same as the DOM slots. */
  radius: number;
  /** Called once the canvas has a WebGL renderer, so the flat dots can hide. */
  onReady: () => void;
}

/** A 28px dot, like the flat planet it replaces. */
const BASE_RADIUS = 14;

function Planet({ index, count, color, isActive, rotate, radius }: {
  index: number;
  count: number;
  color: string;
  isActive: boolean;
  rotate: MotionValue<number>;
  radius: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { width, height } = state.size;
    // Same place as the DOM slot: its base angle plus the wheel's turn (screen y runs down, three's up).
    const a = (index / count) * 2 * Math.PI - Math.PI / 2 + (rotate.get() * Math.PI) / 180;
    mesh.position.set((width * radius * Math.cos(a)) / 100, (-height * radius * Math.sin(a)) / 100, 0);
    // The active planet grows to twice the size, eased like the old spring.
    const target = isActive ? 2 : 1;
    const s = mesh.scale.x + (target - mesh.scale.x) * Math.min(1, delta * 8);
    mesh.scale.setScalar(s);
    mesh.rotation.y += delta * 0.4;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[BASE_RADIUS, 48, 32]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.35}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.25}
        emissive={color}
        emissiveIntensity={isActive ? 0.25 : 0.06}
        transparent
        opacity={isActive ? 1 : 0.75}
      />
    </mesh>
  );
}

export default function OrbitPlanets3D({ rotate, active, colors, radius, onReady }: Props) {
  // Only draw while the section is on screen.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="lp-orbit__planets3d" aria-hidden>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 200], zoom: 1, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: true }}
        onCreated={() => onReady()}
      >
        <ambientLight intensity={0.6} />
        {/* Key light from the upper left, and a warm glow from the Summit logo at the centre. */}
        <directionalLight position={[-200, 260, 300]} intensity={2.2} />
        <pointLight position={[0, 0, 40]} intensity={1.5} distance={0} decay={0} color="#d1fae5" />
        {colors.map((c, i) => (
          <Planet
            key={i}
            index={i}
            count={colors.length}
            color={c}
            isActive={i === active}
            rotate={rotate}
            radius={radius}
          />
        ))}
      </Canvas>
    </div>
  );
}
