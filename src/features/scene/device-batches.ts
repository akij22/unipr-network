import { Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import type { SceneDevice } from "./scene-view";
import type { sceneColors } from "../../styles/scene-tokens";
export type Part = {
  owner: string;
  position: [number, number, number];
  size: [number, number, number];
};
export type DeviceBatch = { tone: keyof typeof sceneColors; parts: Part[] };
export function buildDeviceBatches(devices: SceneDevice[]): DeviceBatch[] {
  const batches = new Map<DeviceBatch["tone"], Part[]>();
  for (const d of devices) {
    const part = (
      at: Part["position"],
      size: Part["size"],
      tone: DeviceBatch["tone"] = "shell",
    ) => {
      let parts = batches.get(tone);
      if (!parts) {
        parts = [];
        batches.set(tone, parts);
      }
      parts.push({
        owner: d.id,
        position: [d.x + at[0], at[1], d.z + at[2]],
        size,
      });
    };
    if (d.kind === "host") {
      part([-0.2, 1.1, 0], [1.55, 1.1, 0.16], "face");
      part([-0.2, 1.12, 0.092], [1.35, 0.9, 0.025], "screen");
      part([-0.2, 0.42, -0.02], [0.12, 0.45, 0.12]);
      part([-0.2, 0.16, 0.1], [0.8, 0.1, 0.5]);
      part([0.95, 0.6, -0.12], [0.42, 1.05, 0.75], "face");
      part([-0.2, 0.12, 0.82], [1.1, 0.08, 0.38]);
    } else {
      part(
        [0, 0.38, 0],
        [d.kind === "hub" ? 1.8 : 2.25, d.kind === "router" ? 0.6 : 0.36, 1.2],
        d.kind,
      );
      part(
        [0, 0.39, 0.615],
        [d.kind === "hub" ? 1.7 : 2.12, 0.25, 0.04],
        "face",
      );
      for (let i = 0; i < Math.min(d.ports, 12); i++) {
        const x = (i - (Math.min(d.ports, 12) - 1) / 2) * 0.18;
        part([x, 0.39, 0.65], [0.13, 0.12, 0.035], "port");
        part([x + 0.035, 0.48, 0.65], [0.025, 0.025, 0.02], "accent");
      }
      if (d.kind === "router") {
        part([-0.4, 0.7, 0], [0.7, 0.025, 0.12], "light");
        part([0.4, 0.7, 0.2], [0.7, 0.025, 0.12], "light");
      }
    }
  }
  return [...batches].map(([tone, parts]) => ({ tone, parts }));
}
export function writeBatch(mesh: InstancedMesh, batch: DeviceBatch) {
  const matrix = new Matrix4(),
    rotation = new Quaternion(),
    position = new Vector3(),
    scale = new Vector3();
  batch.parts.forEach((p, i) => {
    matrix.compose(
      position.fromArray(p.position),
      rotation,
      scale.fromArray(p.size),
    );
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}
