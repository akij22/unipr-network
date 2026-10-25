import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, MeshStandardMaterial, type InstancedMesh } from "three";
import { sceneColors } from "../../styles/scene-tokens";
import {
  buildDeviceBatches,
  writeBatch,
  type DeviceBatch,
} from "./device-batches";
import type { SceneDevice } from "./scene-view";
const geometry = new BoxGeometry();
const materials = Object.fromEntries(
  Object.entries(sceneColors).map(([key, color]) => [
    key,
    new MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.15 }),
  ]),
) as Record<keyof typeof sceneColors, MeshStandardMaterial>;
function Batch({
  batch,
  onSelect,
}: {
  batch: DeviceBatch;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    return () => mesh?.dispose();
  }, []);
  useLayoutEffect(() => {
    if (ref.current) writeBatch(ref.current, batch);
  }, [batch]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, materials[batch.tone], batch.parts.length]}
      onClick={(e) => {
        if (e.instanceId !== undefined) {
          e.stopPropagation();
          onSelect(batch.parts[e.instanceId].owner);
        }
      }}
      dispose={null}
    />
  );
}
export function DeviceMeshes({
  devices,
  onSelect,
}: {
  devices: SceneDevice[];
  onSelect: (id: string) => void;
}) {
  const batches = useMemo(() => buildDeviceBatches(devices), [devices]);
  return batches.map((batch) => (
    <Batch
      key={batch.tone + ":" + batch.parts.length}
      batch={batch}
      onSelect={onSelect}
    />
  ));
}
