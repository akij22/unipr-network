import { MeshStandardMaterial, TorusGeometry } from "three";
import type { SceneDevice } from "./scene-view";
import { sceneColors as c } from "../../styles/scene-tokens";
const ring = new TorusGeometry(1.4, 0.025, 6, 48);
const material = Object.fromEntries(
  Object.entries(c).map(([name, color]) => [
    name,
    new MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.15 }),
  ]),
) as Record<keyof typeof c, MeshStandardMaterial>;
export function DeviceModel({
  device,
  onSelect,
}: {
  device: SceneDevice;
  onSelect: () => void;
}) {
  const d = device;
  return (
    <group
      position={[d.x, 0, d.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {d.selected && (
        <mesh
          geometry={ring}
          material={material.selected}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.045, 0]}
          dispose={null}
        />
      )}
    </group>
  );
}
