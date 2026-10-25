import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { Vector3 } from "three";
import type { AppController } from "../../app/types";
export type CameraCommand = {
  type: "left" | "right" | "in" | "out" | "reset";
  serial: number;
};
export function CameraControls({
  controller,
  command,
  span,
}: {
  controller: AppController;
  command: CameraCommand | null;
  span: number;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null),
    { camera, size, invalidate } = useThree();
  const save = () => {
    const ctl = controls.current;
    if (!ctl) return;
    const current = controller.getSnapshot().document.view;
    void controller.dispatch({
      type: "view.set",
      view: {
        ...current,
        cameraPosition: camera.position.toArray() as [number, number, number],
        target: ctl.target.toArray() as [number, number, number],
      },
    });
  };
  useEffect(() => {
    const view = controller.getSnapshot().document.view;
    camera.position.set(...view.cameraPosition);
    controls.current?.target.set(...view.target);
    camera.zoom = Math.min(36, size.width / Math.max(12, span + 8));
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [size.width, size.height]);
  useEffect(() => {
    if (!command || !controls.current) return;
    const ctl = controls.current;
    if (command.type === "reset") {
      camera.position.set(12, 14, 18);
      ctl.target.set(0, 0, 0);
      camera.zoom = Math.min(36, size.width / Math.max(12, span + 8));
    } else if (command.type === "in" || command.type === "out")
      camera.zoom *= command.type === "in" ? 1.2 : 1 / 1.2;
    else
      camera.position
        .sub(ctl.target)
        .applyAxisAngle(
          new Vector3(0, 1, 0),
          command.type === "left" ? 0.25 : -0.25,
        )
        .add(ctl.target);
    camera.updateProjectionMatrix();
    ctl.update();
    invalidate();
    save();
  }, [command]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={false}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onEnd={save}
    />
  );
}
