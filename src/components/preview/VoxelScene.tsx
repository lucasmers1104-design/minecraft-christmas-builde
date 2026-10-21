'use client';

import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { Cell } from '@/core/editor/editOperations';
import type { Dimensions, VoxelModel } from '@/core/schema/voxelModel';
import { buildVoxelMesh, type MeshBuffers } from '@/components/preview/buildVoxelMesh';
import type { EditMode } from '@/components/editor/EditorPanel';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

/** A click on the model: the block that was hit and the free cell in front of the hit face. */
export interface CellAction {
  hit: Cell | null;
  place: Cell | null;
}

export interface CameraAction {
  kind: 'rotate' | 'zoom';
  value: number;
  seq: number;
}

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

/**
 * Click/hover target: the block that owns the hit face (looked up per face, so flat blocks
 * such as rails work too) and the free cell in front of that face.
 */
function cellsFromEvent(e: ThreeEvent<PointerEvent | MouseEvent>, dims: Dimensions): CellAction | null {
  const n = e.face?.normal;
  const faceCells = (e.object.userData as { faceCells?: Int32Array }).faceCells;
  if (!n || !faceCells || e.faceIndex === undefined || e.faceIndex === null) return null;
  const index = faceCells[Math.floor(e.faceIndex / 2)];
  if (index === undefined) return null;
  const hit = {
    x: index % dims.width,
    z: Math.floor(index / dims.width) % dims.length,
    y: Math.floor(index / (dims.width * dims.length)),
  };
  return { hit, place: { x: hit.x + Math.round(n.x), y: hit.y + Math.round(n.y), z: hit.z + Math.round(n.z) } };
}

const HIGHLIGHT_BOX = new THREE.BoxGeometry(1.04, 1.04, 1.04);

function VoxelMeshes({
  model,
  layerY,
  mode,
  onRendered,
  onCellAction,
}: {
  model: VoxelModel;
  layerY: number | null;
  mode: EditMode;
  onRendered?: (hash: string, faceCount: number) => void;
  onCellAction?: (action: CellAction) => void;
}) {
  const mesh = useMemo(() => buildVoxelMesh(model, layerY === null ? {} : { maxY: layerY }), [model, layerY]);
  const opaque = useBufferGeometry(mesh.opaque, 3);
  const emissive = useBufferGeometry(mesh.emissive, 3);
  const translucent = useBufferGeometry(mesh.translucent, 4);
  const edges = useMemo(() => new THREE.EdgesGeometry(HIGHLIGHT_BOX), []);
  const [hover, setHover] = useState<Cell | null>(null);
  useEffect(() => {
    onRendered?.(model.hash, mesh.faceCount);
  }, [model.hash, mesh, onRendered]);

  const { width, length } = model.dimensions;
  const offset = useMemo(() => new THREE.Vector3(-width / 2, 0, -length / 2), [width, length]);
  const editing = mode !== 'view';

  const target = (cells: CellAction | null): Cell | null => (cells ? (mode === 'place' ? cells.place : cells.hit) : null);

  const handlers = editing
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 4) return; // that was an orbit drag, not a click
          const cells = cellsFromEvent(e, model.dimensions);
          if (cells) onCellAction?.(cells);
        },
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHover(target(cellsFromEvent(e, model.dimensions)));
        },
        onPointerOut: () => setHover(null),
      }
    : {};

  return (
    // Visual centring only – the stored block coordinates are never shifted.
    <group position={offset.toArray()}>
      <mesh geometry={opaque} userData={{ faceCells: mesh.opaque.faceCells }} {...handlers}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={emissive} userData={{ faceCells: mesh.emissive.faceCells }} {...handlers}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={translucent} renderOrder={1} userData={{ faceCells: mesh.translucent.faceCells }} {...handlers}>
        <meshLambertMaterial vertexColors transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {mode === 'place' ? (
        // Invisible ground plane so blocks can also be placed on empty ground cells (y = 0).
        <mesh
          position={[width / 2, 0, length / 2]}
          rotation-x={-Math.PI / 2}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 4) return;
            const local = e.point.clone().sub(offset);
            onCellAction?.({ hit: null, place: { x: Math.floor(local.x), y: 0, z: Math.floor(local.z) } });
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            const local = e.point.clone().sub(offset);
            setHover({ x: Math.floor(local.x), y: 0, z: Math.floor(local.z) });
          }}
          onPointerOut={() => setHover(null)}
        >
          <planeGeometry args={[width, length]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {editing && hover ? (
        <lineSegments geometry={edges} position={[hover.x + 0.5, hover.y + 0.5, hover.z + 0.5]}>
          <lineBasicMaterial color={mode === 'remove' ? '#f09a92' : '#f2cf86'} />
        </lineSegments>
      ) : null}
      <axesHelper args={[3]} position={[0, 0.02, 0]} />
    </group>
  );
}

/** Frames the whole model (bounding sphere) for the current aspect ratio. */
function CameraRig({
  dimensions,
  resetToken,
  controls,
  cameraAction,
}: {
  dimensions: Dimensions;
  resetToken: number;
  controls: RefObject<OrbitControlsImpl | null>;
  cameraAction: CameraAction | null;
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

  // Button-driven rotation/zoom (keyboard and touch users).
  useEffect(() => {
    if (!cameraAction || !controls.current) return;
    const target = controls.current.target;
    const offset = camera.position.clone().sub(target);
    if (cameraAction.kind === 'rotate') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAction.value);
    else offset.multiplyScalar(cameraAction.value);
    camera.position.copy(target).add(offset);
    controls.current.update();
  }, [cameraAction, camera, controls]);
  return null;
}

export interface VoxelSceneProps {
  model: VoxelModel;
  resetToken: number;
  showGrid: boolean;
  reducedMotion: boolean;
  mode: EditMode;
  layerY: number | null;
  cameraAction: CameraAction | null;
  onRendered?: (hash: string, faceCount: number) => void;
  onCellAction?: (action: CellAction) => void;
}

export function VoxelScene({
  model,
  resetToken,
  showGrid,
  reducedMotion,
  mode,
  layerY,
  cameraAction,
  onRendered,
  onCellAction,
}: VoxelSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const d = Math.max(model.dimensions.width, model.dimensions.height, model.dimensions.length);
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 1000, position: [d, d, -d] }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="3D-Vorschau des Bauwerks"
      role="img"
      style={{ cursor: mode === 'view' ? 'grab' : 'crosshair' }}
    >
      <color attach="background" args={['#0b1526']} />
      <hemisphereLight args={['#dfeefe', '#2a3b52', 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[d, d * 1.6, -d * 0.6]} intensity={1.6} />
      <directionalLight position={[-d, d * 0.8, d]} intensity={0.45} color="#a9d8f2" />
      <VoxelMeshes model={model} layerY={layerY} mode={mode} onRendered={onRendered} onCellAction={onCellAction} />
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
      <CameraRig dimensions={model.dimensions} resetToken={resetToken} controls={controls} cameraAction={cameraAction} />
    </Canvas>
  );
}
