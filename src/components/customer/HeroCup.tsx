"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 72);

/** An espresso cup and saucer built from lathe/torus primitives, in the brand's sand and espresso tones. */
function Cup({ spin }: { spin: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => ({
      cup: lathe([[0, 0.02], [0.3, 0.02], [0.4, 0.07], [0.62, 0.52], [0.68, 0.74], [0.63, 0.74], [0.58, 0.7], [0.4, 0.16], [0, 0.12]]),
      saucer: lathe([[0, -0.04], [0.55, -0.04], [1.0, 0.04], [1.08, 0.09], [1.03, 0.1], [0.95, 0.06], [0.5, 0], [0, 0]]),
      handle: new THREE.TorusGeometry(0.22, 0.05, 16, 40, Math.PI),
      coffee: new THREE.CircleGeometry(0.6, 48),
    }),
    [],
  );

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={group} rotation={[0.38, -0.6, 0]} position={[0, -0.35, 0]}>
      <mesh geometry={geo.saucer}>
        <meshStandardMaterial color="#dccbb0" roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.cup}>
        <meshStandardMaterial color="#efe6d6" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.handle} position={[0.68, 0.42, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <meshStandardMaterial color="#efe6d6" roughness={0.4} />
      </mesh>
      <mesh geometry={geo.coffee} position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2b1d14" roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function HeroCup({ animate, running }: { animate: boolean; running: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={!running ? "never" : animate ? "always" : "demand"}
      camera={{ position: [0, 1.5, 4.2], fov: 30 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 2]} intensity={2.2} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.6} />
      <Cup spin={animate} />
    </Canvas>
  );
}
