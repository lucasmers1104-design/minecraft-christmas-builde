'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { Dimensions, VoxelModel } from '@/core/schema/voxelModel';
import { buildVoxelMesh, type MeshBuffers } from '@/components/preview/buildVoxelMesh';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

function useBufferGeometry(buffers: MeshBuffers, colorSize: 3 | 4): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(buffers.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(buffers.colors, colorSize));
    g.setIndex(new THREE.BufferAttribute(buffers.indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [buffers, colorSize]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function VoxelMeshes({
  model,
  onRendered,
}: {
  model: VoxelModel;
  onRendered?: (hash: string, faceCount: number) => void;
}) {
  const mesh = useMemo(() => buildVoxelMesh(model), [model]);
  const opaque = useBufferGeometry(mesh.opaque, 3);
  const emissive = useBufferGeometry(mesh.emissive, 3);
  const translucent = useBufferGeometry(mesh.translucent, 4);
  useEffect(() => {
    onRendered?.(model.hash, mesh.faceCount);
  }, [model.hash, mesh, onRendered]);

  const { width, length } = model.dimensions;
  // Visual centring only – the stored block coordinates are never shifted.
  return (
    <group position={[-width / 2, 0, -length / 2]}>
      <mesh geometry={opaque} castShadow receiveShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={emissive}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={translucent} renderOrder={1}>
        <meshLambertMaterial vertexColors transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <axesHelper args={[3]} position={[0, 0.02, 0]} />
    </group>
  );
}

/** Frames the whole model (bounding sphere) for the current aspect ratio. */
function CameraRig({
  dimensions,
  resetToken,
  controls,
}: {
  dimensions: Dimensions;
  resetToken: number;
  controls: RefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((state) => state.camera);
  const getState = useThree((state) => state.get);
  const { width, height, length } = dimensions;
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Aspect is read once per reframe (not a dependency) so resizing never resets the user's orbit.
    const { size } = getState();
    const aspect = size.width / Math.max(1, size.height);
    const radius = 0.5 * Math.hypot(width, height, length);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.02;
    const target = new THREE.Vector3(0, height * 0.42, 0);
    // Front of the house faces −Z (north): three-quarter view onto the entrance.
    const direction = new THREE.Vector3(0.55, 0.38, -0.74).normalize();
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.update();
    }
  }, [camera, controls, getState, width, height, length, resetToken]);
  return null;
}

export interface VoxelSceneProps {
  model: VoxelModel;
  resetToken: number;
  showGrid: boolean;
  reducedMotion: boolean;
  onRendered?: (hash: string, faceCount: number) => void;
}

export function VoxelScene({ model, resetToken, showGrid, reducedMotion, onRendered }: VoxelSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const d = Math.max(model.dimensions.width, model.dimensions.height, model.dimensions.length);
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 1000, position: [d, d, -d] }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="3D-Vorschau des Bauwerks"
      role="img"
    >
      <color attach="background" args={['#0b1526']} />
      <hemisphereLight args={['#dfeefe', '#2a3b52', 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[d, d * 1.6, -d * 0.6]} intensity={1.6} />
      <directionalLight position={[-d, d * 0.8, d]} intensity={0.45} color="#a9d8f2" />
      <VoxelMeshes model={model} onRendered={onRendered} />
      {showGrid ? (
        <Grid
          position={[0, -0.001, 0]}
          args={[d * 3, d * 3]}
          cellSize={1}
          sectionSize={8}
          cellColor="#203556"
          sectionColor="#35557f"
          fadeDistance={d * 4}
          infiniteGrid
        />
      ) : null}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reducedMotion}
        minDistance={4}
        maxDistance={d * 5}
        maxPolarAngle={Math.PI * 0.495}
      />
      <CameraRig dimensions={model.dimensions} resetToken={resetToken} controls={controls} />
    </Canvas>
  );
}
