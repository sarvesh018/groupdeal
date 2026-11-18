"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero visual: one real group, drawn as a ring of seats.
 * Lit orange spheres are buyers already in. The pulsing one is the next seat.
 * It leans toward the pointer and settles flat as the page scrolls.
 */

const ACCENT = "#ff6a1f";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 4);

function Seat({
  index,
  total,
  radius,
  state,
  still,
}: {
  index: number;
  total: number;
  radius: number;
  state: "taken" | "next" | "open";
  still: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.MeshPhysicalMaterial>(null);
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const size = clamp(2.1 / total + 0.16, 0.2, 0.36);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const k = still ? 1 : easeOut(clamp((t - 0.25 - index * 0.085) / 1.1, 0, 1));
    g.scale.setScalar(k);
    const bob = still || state !== "taken" ? 0 : Math.sin(t * 0.9 + index * 1.7) * 0.035;
    g.position.set(x, (1 - k) * 1.8 + bob, z);
    if (state === "next") {
      const pulse = still ? 0.5 : (Math.sin(t * 2.4) + 1) / 2;
      if (halo.current) {
        halo.current.scale.setScalar(1 + pulse * 0.35);
        (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.9 - pulse * 0.6;
      }
      if (core.current) core.current.emissiveIntensity = 0.04 + pulse * 0.16;
    }
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {state === "taken" ? (
        <mesh castShadow>
          <sphereGeometry args={[size, 48, 48]} />
          <meshPhysicalMaterial color={ACCENT} roughness={0.34} metalness={0.05} clearcoat={0.7} clearcoatRoughness={0.3} />
        </mesh>
      ) : (
        <>
          <mesh castShadow>
            <sphereGeometry args={[size, 48, 48]} />
            <meshPhysicalMaterial
              ref={core}
              color="#1d2028"
              roughness={0.42}
              metalness={0.15}
              emissive={state === "next" ? ACCENT : "#000000"}
              emissiveIntensity={state === "next" ? 0.1 : 0}
            />
          </mesh>
          <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -size + 0.012, 0]}>
            <torusGeometry args={[size * 1.32, 0.011, 10, 72]} />
            <meshBasicMaterial color={state === "next" ? ACCENT : "#ffffff"} transparent opacity={state === "next" ? 0.9 : 0.22} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Ring({ filled, total, still }: { filled: number; total: number; still: boolean }) {
  const rig = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const viewport = useThree((st) => st.viewport);
  const radius = 2.15;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  // Keep the whole ring inside narrow screens.
  const fit = clamp(viewport.width / 6.4, 0.55, 1);

  useFrame(({ clock, camera }, dt) => {
    const scroll = clamp(window.scrollY / (window.innerHeight * 0.9), 0, 1);
    if (rig.current) {
      const tx = 0.42 - scroll * 0.34 + (still ? 0 : pointer.current.y * 0.1);
      const tz = still ? 0 : pointer.current.x * -0.08;
      const ty = still ? 0 : pointer.current.x * 0.22;
      const f = 1 - Math.pow(0.001, dt);
      rig.current.rotation.x += (tx - rig.current.rotation.x) * f;
      rig.current.rotation.z += (tz - rig.current.rotation.z) * f;
      rig.current.rotation.y += (ty - rig.current.rotation.y) * f;
      rig.current.position.y = 0.1 + scroll * 0.5;
    }
    if (spin.current && !still) spin.current.rotation.y = clock.elapsedTime * 0.07 + scroll * 0.9;
    camera.position.z = 7.4 + scroll * 1.6;
  });

  const seats = Array.from({ length: total }, (_, i) => i);

  return (
    <group ref={rig} scale={fit} rotation={[0.42, 0, 0]}>
      <group ref={spin}>
        {seats.map((i) => (
          <Seat
            key={i}
            index={i}
            total={total}
            radius={radius}
            still={still}
            state={i < filled ? "taken" : i === filled ? "next" : "open"}
          />
        ))}
        {/* The table everyone sits around: a faint line joining the seats. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
          <torusGeometry args={[radius, 0.006, 8, 160]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.14} />
        </mesh>
      </group>
      <ContactShadows position={[0, -0.42, 0]} opacity={0.55} scale={9} blur={2.6} far={2.4} resolution={512} color="#000000" frames={still ? 1 : Infinity} />
    </group>
  );
}

export default function SeatRingScene({
  filled,
  total,
  still,
  active,
}: {
  filled: number;
  total: number;
  still: boolean;
  active: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.9, 7.4], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={still ? "demand" : active ? "always" : "never"}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3.5, 6, 4]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 2.5, -3]} intensity={0.7} />
      <pointLight position={[0, 0.4, 0]} intensity={5} distance={4.5} color={ACCENT} />
      <Ring filled={filled} total={total} still={still} />
    </Canvas>
  );
}
