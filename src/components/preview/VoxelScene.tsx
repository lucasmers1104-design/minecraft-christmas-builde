'use client';

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { memo, useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { Direction } from '@/core/blocks/directions';
import type { Cell } from '@/core/editor/editOperations';
import type { Dimensions, VoxelModel } from '@/core/schema/voxelModel';
import type { ChunkPart, PartBucket } from '@/components/preview/meshChunks';
import { useChunkedMesh, type MeshSnapshot } from '@/components/preview/useChunkedMesh';
import type { ClientTexturePack } from '@/components/preview/textures/textureAtlas';
import type { EditMode } from '@/components/editor/EditorPanel';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * A click on the model: the block that was hit, the free cell in front of the hit face, plus
 * what placement rules need – the hit face (outward normal of the clicked block), the hit point
 * in model coordinates (blocks) and the view direction of the click ray (x east, y up, z south).
 */
export interface CellAction {
  hit: Cell | null;
  place: Cell | null;
  face: Direction;
  point: Vec3Like;
  look: Vec3Like;
}

export interface CameraAction {
  kind: 'rotate' | 'zoom';
  value: number;
  seq: number;
}

export type RenderMode = 'colors' | 'textures';

/** Nearest axis direction of a (face) normal. */
function directionOf(n: THREE.Vector3): Direction {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ay >= ax && ay >= az) return n.y >= 0 ? 'up' : 'down';
  if (ax >= az) return n.x >= 0 ? 'east' : 'west';
  return n.z >= 0 ? 'south' : 'north';
}

const STEP: Record<Direction, readonly [number, number, number]> = {
  east: [1, 0, 0],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
  south: [0, 0, 1],
  north: [0, 0, -1],
};

/**
 * Click/hover target: the block that owns the hit face (looked up per quad, so flat blocks such
 * as rails work too) and the free cell in front of that face.
 */
function actionFromEvent(e: ThreeEvent<PointerEvent | MouseEvent>, dims: Dimensions, offset: THREE.Vector3): CellAction | null {
  const faceCells = (e.object.userData as { faceCells?: Int32Array }).faceCells;
  if (!e.face || !faceCells || e.faceIndex === undefined || e.faceIndex === null) return null;
  const index = faceCells[Math.floor(e.faceIndex / 2)];
  if (index === undefined) return null;
  const hit = {
    x: index % dims.width,
    z: Math.floor(index / dims.width) % dims.length,
    y: Math.floor(index / (dims.width * dims.length)),
  };
  // Double-sided quads (plants, panes) can be hit from behind: use the side facing the camera.
  const normal = e.face.normal.clone();
  if (normal.dot(e.ray.direction) > 0) normal.negate();
  const face = directionOf(normal);
  const [dx, dy, dz] = STEP[face];
  const point = e.point.clone().sub(offset);
  return {
    hit,
    place: { x: hit.x + dx, y: hit.y + dy, z: hit.z + dz },
    face,
    point: { x: point.x, y: point.y, z: point.z },
    look: { x: e.ray.direction.x, y: e.ray.direction.y, z: e.ray.direction.z },
  };
}

interface AtlasTextures {
  mipped: THREE.Texture;
  crisp: THREE.Texture;
}

/** The texture atlas twice: mipmapped for solid/translucent faces, without mipmaps for cutout faces. */
function useAtlasTextures(pack: ClientTexturePack | null): AtlasTextures | null {
  const gl = useThree((state) => state.gl);
  const textures = useMemo(() => {
    if (!pack) return null;
    const make = (mipmaps: boolean) => {
      const t = new THREE.CanvasTexture(pack.canvas);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = mipmaps;
      // Cutout textures (lanterns, chains, plants, bars, leaves) would fade out in averaged mip
      // levels and then fail the alpha test; like the game's "cutout" layer they stay unmipped.
      t.minFilter = mipmaps ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
      t.anisotropy = mipmaps ? Math.min(8, gl.capabilities.getMaxAnisotropy()) : 1;
      t.needsUpdate = true;
      return t;
    };
    return { mipped: make(true), crisp: make(false) };
  }, [pack, gl]);
  useEffect(
    () => () => {
      textures?.mipped.dispose();
      textures?.crisp.dispose();
    },
    [textures],
  );
  return textures;
}

type Materials = Partial<Record<PartBucket, THREE.Material>>;

function useMaterials(atlas: AtlasTextures | null): Materials {
  const materials = useMemo<Materials>(() => {
    const colour: Materials = {
      opaque: new THREE.MeshLambertMaterial({ vertexColors: true }),
      emissive: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      translucent: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    };
    if (!atlas) return colour;
    return {
      ...colour,
      'tex-solid': new THREE.MeshBasicMaterial({ map: atlas.mipped, vertexColors: true, toneMapped: false }),
      'tex-cutout': new THREE.MeshBasicMaterial({ map: atlas.crisp, vertexColors: true, toneMapped: false, alphaTest: 0.5, side: THREE.DoubleSide }),
      'tex-translucent': new THREE.MeshBasicMaterial({ map: atlas.mipped, vertexColors: true, toneMapped: false, transparent: true, depthWrite: false }),
    };
  }, [atlas]);
  useEffect(
    () => () => {
      for (const m of Object.values(materials)) m?.dispose();
    },
    [materials],
  );
  return materials;
}

function geometryOf(part: ChunkPart): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
  if (part.normals) g.setAttribute('normal', new THREE.BufferAttribute(part.normals, 3));
  if (part.uvs) g.setAttribute('uv', new THREE.BufferAttribute(part.uvs, 2));
  g.setAttribute('color', new THREE.BufferAttribute(part.colors, part.colorSize, true));
  g.setIndex(new THREE.BufferAttribute(part.indices, 1));
  g.computeBoundingSphere();
  return g;
}

interface MeshHandlers {
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
}

const NO_HANDLERS: MeshHandlers = {};

/** One render bucket of one chunk; memoised so hover updates do not touch the chunk meshes. */
const ChunkPartMesh = memo(function ChunkPartMesh({ part, material, handlers }: { part: ChunkPart; material: THREE.Material; handlers: MeshHandlers }) {
  const geometry = useMemo(() => geometryOf(part), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const translucent = part.bucket === 'translucent' || part.bucket === 'tex-translucent';
  return <mesh geometry={geometry} material={material} renderOrder={translucent ? 1 : 0} userData={{ faceCells: part.faceCells }} {...handlers} />;
});

const HIGHLIGHT_BOX = new THREE.BoxGeometry(1.04, 1.04, 1.04);

function sameCell(a: Cell | null, b: Cell | null): boolean {
  return a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z);
}

function sameDimensions(a: Dimensions, b: Dimensions): boolean {
  return a.width === b.width && a.height === b.height && a.length === b.length;
}

function VoxelMeshes({
  model,
  snapshot,
  mode,
  texturePack,
  onRendered,
  onCellAction,
}: {
  model: VoxelModel;
  snapshot: MeshSnapshot | null;
  mode: EditMode;
  texturePack: ClientTexturePack | null;
  onRendered?: (hash: string, faceCount: number, renderMode: RenderMode) => void;
  onCellAction?: (action: CellAction) => void;
}) {
  const atlas = useAtlasTextures(texturePack);
  const materials = useMaterials(atlas);
  const edges = useMemo(() => new THREE.EdgesGeometry(HIGHLIGHT_BOX), []);
  const [hover, setHover] = useState<Cell | null>(null);
  const dims = model.dimensions;
  const { width, length } = dims;
  const offset = useMemo(() => new THREE.Vector3(-width / 2, 0, -length / 2), [width, length]);
  const editing = mode !== 'view';
  // A mesh of a model with other dimensions would sit in the wrong place: show nothing until ready.
  const shown = snapshot && sameDimensions(snapshot.dimensions, dims) ? snapshot : null;

  // A model counts as rendered only once its meshes are mounted in the three.js scene.
  useEffect(() => {
    if (snapshot) onRendered?.(snapshot.model.hash, snapshot.faceCount, snapshot.pack ? 'textures' : 'colors');
  }, [snapshot, onRendered]);

  // Latest callback without re-creating the handlers of every chunk mesh on each edit.
  const actionRef = useRef(onCellAction);
  useEffect(() => {
    actionRef.current = onCellAction;
  }, [onCellAction]);

  const handlers = useMemo<MeshHandlers>(() => {
    if (!editing) return NO_HANDLERS;
    const target = (a: CellAction | null): Cell | null => (a ? (mode === 'place' ? a.place : a.hit) : null);
    return {
      onClick: (e) => {
        e.stopPropagation();
        if (e.delta > 4) return; // that was an orbit drag, not a click
        const action = actionFromEvent(e, dims, offset);
        if (action) actionRef.current?.(action);
      },
      onPointerMove: (e) => {
        e.stopPropagation();
        const next = target(actionFromEvent(e, dims, offset));
        setHover((prev) => (sameCell(prev, next) ? prev : next));
      },
      onPointerOut: () => setHover(null),
    };
  }, [editing, mode, dims, offset]);

  const parts = useMemo(
    () =>
      (shown?.chunks ?? []).flatMap((chunk) =>
        chunk.parts.map((part) => ({ key: `${chunk.chunk}:${part.bucket}`, part, material: materials[part.bucket] })),
      ),
    [shown, materials],
  );

  return (
    // Visual centring only – the stored block coordinates are never shifted.
    <group position={offset.toArray()}>
      {parts.map(({ key, part, material }) => (material ? <ChunkPartMesh key={key} part={part} material={material} handlers={handlers} /> : null))}
      {mode === 'place' ? (
        // Invisible ground plane so blocks can also be placed on empty ground cells (y = 0).
        <mesh
          position={[width / 2, 0, length / 2]}
          rotation-x={-Math.PI / 2}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 4) return;
            const local = e.point.clone().sub(offset);
            onCellAction?.({
              hit: null,
              place: { x: Math.floor(local.x), y: 0, z: Math.floor(local.z) },
              face: 'up',
              point: { x: local.x, y: 0, z: local.z },
              look: { x: e.ray.direction.x, y: e.ray.direction.y, z: e.ray.direction.z },
            });
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            const local = e.point.clone().sub(offset);
            const next = { x: Math.floor(local.x), y: 0, z: Math.floor(local.z) };
            setHover((prev) => (sameCell(prev, next) ? prev : next));
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

/** Radius of the model's bounding sphere. */
function boundingRadius({ width, height, length }: Dimensions): number {
  return 0.5 * Math.hypot(width, height, length);
}

/** Frames the whole model (bounding sphere) for the current aspect ratio; keeps near/far fitting. */
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
  const radius = boundingRadius(dimensions);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    // Aspect is read once per reframe (not a dependency) so resizing never resets the user's orbit.
    const { size } = getState();
    const aspect = size.width / Math.max(1, size.height);
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
  }, [camera, controls, getState, width, height, length, radius, resetToken]);

  // Near/far follow the orbit distance: the whole model always fits into the depth range (tall
  // models no longer get clipped) with as much depth precision as possible.
  useFrame((state) => {
    const cam = state.camera;
    if (!(cam instanceof THREE.PerspectiveCamera) || !controls.current) return;
    const distance = cam.position.distanceTo(controls.current.target);
    const far = distance + radius * 2.2 + 32;
    const near = THREE.MathUtils.clamp(distance / 2000, 0.05, 2);
    if (Math.abs(cam.far - far) > far * 0.01 || Math.abs(cam.near - near) > near * 0.05) {
      cam.far = far;
      cam.near = near;
      cam.updateProjectionMatrix();
    }
  });

  // Scripted views for the screenshot tool (scripts/screenshots.mjs): azimuth 0° looks at the
  // front (from −Z), 90° from the east; distance as a multiple of the framing distance.
  useEffect(() => {
    const w = window as unknown as { __mcbSetView?: (azimuth: number, elevation: number, zoom?: number, targetY?: number) => void };
    w.__mcbSetView = (azimuth, elevation, zoom = 1, targetY = 0.42) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const { size } = getState();
      const aspect = size.width / Math.max(1, size.height);
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.02 * zoom;
      const target = new THREE.Vector3(0, height * targetY, 0);
      const az = THREE.MathUtils.degToRad(azimuth);
      const el = THREE.MathUtils.degToRad(elevation);
      const direction = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.lookAt(target);
      if (controls.current) {
        controls.current.target.copy(target);
        controls.current.update();
      }
    };
    return () => {
      delete w.__mcbSetView;
    };
  }, [camera, controls, getState, height, radius]);

  // Button-driven rotation/zoom (keyboard and touch users).
  useEffect(() => {
    if (!cameraAction || !controls.current) return;
    const target = controls.current.target;
    const offset = camera.position.clone().sub(target);
    if (cameraAction.kind === 'rotate') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAction.value);
    else offset.multiplyScalar(cameraAction.value);
    offset.clampLength(controls.current.minDistance, controls.current.maxDistance);
    camera.position.copy(target).add(offset);
    controls.current.update();
  }, [cameraAction, camera, controls]);
  return null;
}

function MeshingIndicator({ progress, error }: { progress: number | null; error: string | null }) {
  if (error) {
    return (
      <div role="alert" className="absolute inset-x-4 top-3 rounded-lg border border-holly-500/40 bg-holly-600/20 px-3 py-2 text-xs text-holly-300">
        Vorschau konnte nicht berechnet werden: {error}
      </div>
    );
  }
  return (
    <div
      role="status"
      data-testid="mesh-progress"
      className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/10 bg-night-900/85 px-3 py-1 text-xs text-mist-300 shadow-lg backdrop-blur transition-opacity delay-150 duration-200 starting:opacity-0"
    >
      Vorschau wird berechnet …{progress !== null ? ` ${Math.round(progress * 100)} %` : ''}
    </div>
  );
}

export interface VoxelSceneProps {
  model: VoxelModel;
  resetToken: number;
  showGrid: boolean;
  reducedMotion: boolean;
  mode: EditMode;
  layerY: number | null;
  cameraAction: CameraAction | null;
  texturePack: ClientTexturePack | null;
  onRendered?: (hash: string, faceCount: number, renderMode: RenderMode) => void;
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
  texturePack,
  onRendered,
  onCellAction,
}: VoxelSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const meshing = useChunkedMesh(model, layerY, texturePack);
  const d = Math.max(model.dimensions.width, model.dimensions.height, model.dimensions.length);
  const radius = boundingRadius(model.dimensions);
  return (
    <div className="absolute inset-0" data-meshing={meshing.pending ? 'true' : 'false'} data-mesher={meshing.snapshot?.mesher ?? ''}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 10000, position: [d, d, -d] }}
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
        <VoxelMeshes
          model={model}
          snapshot={meshing.snapshot}
          mode={mode}
          texturePack={texturePack}
          onRendered={onRendered}
          onCellAction={onCellAction}
        />
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
          // Far enough to see the whole model even in a narrow, tall viewport.
          maxDistance={Math.max(d * 5, radius * 12)}
          maxPolarAngle={Math.PI * 0.495}
        />
        <CameraRig dimensions={model.dimensions} resetToken={resetToken} controls={controls} cameraAction={cameraAction} />
      </Canvas>
      {meshing.pending || meshing.error ? <MeshingIndicator progress={meshing.progress} error={meshing.error} /> : null}
    </div>
  );
}
