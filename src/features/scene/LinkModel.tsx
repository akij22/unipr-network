import { useMemo, useEffect } from "react";
import {
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
  MeshStandardMaterial,
} from "three";
import type { SceneLink } from "./scene-view";
import { sceneColors as c } from "../../styles/scene-tokens";
const normal = new MeshStandardMaterial({ color: c.cable, roughness: 0.7 }),
  active = new MeshStandardMaterial({
    color: c.accent,
    emissive: c.accent,
    emissiveIntensity: 0.2,
  }),
  selected = new MeshStandardMaterial({ color: c.selected });
export function linkCurve(link: SceneLink) {
  const a = new Vector3(...link.from),
    b = new Vector3(...link.to);
  return new CatmullRomCurve3([
    a,
    a
      .clone()
      .lerp(b, 0.5)
      .add(new Vector3(0, 0.12, 0)),
    b,
  ]);
}
export function LinkModel({
  link,
  onSelect,
}: {
  link: SceneLink;
  onSelect: () => void;
}) {
  const geometry = useMemo(
    () => new TubeGeometry(linkCurve(link), 16, 0.045, 5, false),
    [...link.from, ...link.to],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      material={link.active ? active : link.selected ? selected : normal}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      dispose={null}
    />
  );
}
