import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import type { SceneDevice } from "./scene-view";
/** One overlay and screen-space collision suppression keep large topologies readable.
 * Every device remains selectable from the persistent accessible device list. */
export function DeviceLabels({
  devices,
  onSelect,
}: {
  devices: SceneDevice[];
  onSelect: (id: string) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>()),
    point = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    const occupied: { x: number; y: number }[] = [];
    for (const d of [
      ...devices.filter((d) => d.selected),
      ...devices.filter((d) => !d.selected),
    ]) {
      const button = buttons.current.get(d.id);
      if (!button) continue;
      point.current
        .set(d.x, d.kind === "host" ? 2.05 : 1.15, d.z)
        .project(camera);
      const x = ((point.current.x + 1) * size.width) / 2,
        y = ((1 - point.current.y) * size.height) / 2;
      const visible =
        point.current.z >= -1 &&
        point.current.z <= 1 &&
        x >= 0 &&
        x <= size.width &&
        y >= 0 &&
        y <= size.height &&
        !occupied.some(
          (p) => Math.abs(p.x - x) < 196 && Math.abs(p.y - y) < 64,
        );
      button.hidden = !visible;
      if (visible) {
        occupied.push({ x, y });
        button.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;
      }
    }
  });
  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      {devices.map((d) => (
        <button
          key={d.id}
          ref={(element) => {
            if (element) buttons.current.set(d.id, element);
            else buttons.current.delete(d.id);
          }}
          className={`scene-label ${d.selected ? "selected" : ""}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "auto",
          }}
          onClick={() => onSelect(d.id)}
        >
          <strong>{d.name}</strong>
          {d.ip && <code>{d.ip}</code>}
        </button>
      ))}
    </Html>
  );
}
