import { expect, it } from "vitest";
import {
  InstancedMesh,
  BoxGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from "three";
import { buildDeviceBatches, writeBatch } from "./device-batches";
import type { SceneDevice } from "./scene-view";
it("keeps physical picking associated with the correct device in shared meshes", () => {
  const base = { name: "Device", selected: false, ip: "", ports: 2 };
  const devices: SceneDevice[] = [
    { ...base, id: "host", kind: "host", x: -4, z: 0 },
    { ...base, id: "router", kind: "router", x: 4, z: 0 },
  ];
  const batches = buildDeviceBatches(devices);
  for (const [x, expected] of [
    [-4, "host"],
    [4, "router"],
  ] as const) {
    const hits = batches.flatMap((batch) => {
      const mesh = new InstancedMesh(
        new BoxGeometry(),
        new MeshBasicMaterial(),
        batch.parts.length,
      );
      writeBatch(mesh, batch);
      mesh.updateMatrixWorld();
      const hits = new Raycaster(
        new Vector3(x, 5, 0),
        new Vector3(0, -1, 0),
      ).intersectObject(mesh);
      return hits.map((hit) => batch.parts[hit.instanceId!].owner);
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(new Set(hits)).toEqual(new Set([expected]));
  }
  expect(batches.length).toBeLessThan(10);
});
