import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BoxGeometry, MeshStandardMaterial, type Mesh } from "three";
import type { SceneLink } from "./scene-view";
import { linkCurve } from "./LinkModel";
import { sceneColors } from "../../styles/scene-tokens";
const geometry = new BoxGeometry(0.24, 0.18, 0.3),
  material = new MeshStandardMaterial({
    color: sceneColors.packet,
    emissive: sceneColors.packet,
    emissiveIntensity: 0.25,
  });
export function PacketModel({
  link,
  playing,
}: {
  link: SceneLink;
  playing: boolean;
}) {
  const motion =
      playing && !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ref = useRef<Mesh>(null),
    progress = useRef(motion ? 0 : 0.55),
    curve = useMemo(() => linkCurve(link), [...link.from, ...link.to]),
    invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    progress.current = motion ? 0 : 0.55;
    invalidate();
  }, [motion, link.id, invalidate]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (motion && progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / 0.65);
      invalidate();
    }
    ref.current.position.copy(
      curve.getPoint(link.reverse ? 1 - progress.current : progress.current),
    );
    ref.current.position.y += 0.2;
  });
  return (
    <mesh ref={ref} geometry={geometry} material={material} dispose={null} />
  );
}
