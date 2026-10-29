import { Canvas } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppController } from "../../app/types";
import { useApp } from "../../app/use-app";
import { buildSceneView } from "./scene-view";
import { DeviceLabels } from "./DeviceLabels";
import { DeviceMeshes } from "./DeviceMeshes";
import { DeviceModel } from "./DeviceModel";
import { LinkModel } from "./LinkModel";
import { PacketModel } from "./PacketModel";
import { CameraControls } from "./CameraControls";
import { sceneColors as c } from "../../styles/scene-tokens";
export function NetworkScene({
  controller,
  onContextLost,
}: {
  controller: AppController;
  onContextLost: () => void;
}) {
  const state = useApp(controller),
    [ready, setReady] = useState(false),
    [placing, setPlacing] = useState<string | null>(null);
  const view = useMemo(
    () =>
      buildSceneView(
        state.document,
        state.runtimeReady ? state.projection : null,
        state.selection,
        state.issue,
      ),
    [
      state.document.network,
      state.document.layout,
      state.runtimeReady ? state.projection : null,
      state.selection,
      state.issue,
    ],
  );
  const positionButton = useRef<HTMLButtonElement>(null);
  const selected = state.selection?.kind === "device" ? state.selection.id : null;
  const moving = placing === selected && selected !== null && !!state.document.layout[selected];
  useEffect(() => { setPlacing(null); }, [selected, state.viewEpoch]);
  const stopPlacing = () => {
    setPlacing(null);
    positionButton.current?.focus({ preventScroll: true });
  };
  const place = (x: number, z: number) => {
    if (!moving || !selected) return;
    void controller.dispatch({ type: "device.move", id: selected, x: Math.round(x), z: Math.round(z) });
    stopPlacing();
  };
  const span = Math.max(
    8,
    ...view.devices.map((d) => Math.abs(d.x) * 2),
    ...view.devices.map((d) => Math.abs(d.z) * 2),
  );
  return (
    <section
      className="network-stage"
      aria-label="3D network workspace"
      data-scene-ready={ready}
      data-placement-active={moving}
      onKeyDown={(e) => {
        if (e.key === "Escape" && moving) { e.stopPropagation(); stopPlacing(); }
      }}
    >
      <div className="scene-canvas">
        <Canvas
          orthographic
          camera={{ position: [12, 14, 18], zoom: 30, near: 0.1, far: 1000 }}
          frameloop="demand"
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (e) => {
                e.preventDefault();
                onContextLost();
              },
              { once: true },
            );
            setReady(true);
          }}
          onPointerMissed={() => {
            if (!moving) void controller.dispatch({ type: "selection.set", selection: null });
          }}
        >
          <color attach="background" args={[c.background]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[6, 14, 8]} intensity={2} />
          <Grid
            args={[100, 100]}
            cellSize={1}
            cellColor={c.grid}
            sectionColor={c.gridSection}
            sectionSize={5}
            fadeDistance={65}
            infiniteGrid
          />
          {moving && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}
            onClick={(e) => { e.stopPropagation(); if (e.delta <= 5) place(e.point.x, e.point.z); }}>
            <planeGeometry args={[10000, 10000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>}
          <CameraControls
            controller={controller}
            command={null}
            span={span}
            restoreKey={state.viewEpoch}
          />
          {view.links.map((link) => (
            <LinkModel
              key={link.id}
              link={link}
              onSelect={() =>
                void controller.dispatch({
                  type: "selection.set",
                  selection: { kind: "link", id: link.id },
                })
              }
            />
          ))}
          <DeviceMeshes
            devices={view.devices}
            onSelect={(id) =>
              void controller.dispatch({
                type: "selection.set",
                selection: { kind: "device", id },
              })
            }
          />
          <DeviceLabels
            devices={view.devices}
            onSelect={(id) =>
              void controller.dispatch({
                type: "selection.set",
                selection: { kind: "device", id },
              })
            }
          />
          {view.devices.map((device) => (
            <DeviceModel
              key={device.id}
              device={device}
              onSelect={() =>
                void controller.dispatch({
                  type: "selection.set",
                  selection: { kind: "device", id: device.id },
                })
              }
            />
          ))}
          {view.packets.map((packet) => {
            const link = view.links.find((l) => l.id === packet.linkId);
            return link ? (
              <PacketModel
                key={`${state.projection.cursor}:${packet.id}`}
                link={link}
                playing={state.playing}
              />
            ) : null;
          })}
        </Canvas>
      </div>
      {selected && <div className="placement-tools">
        <button ref={positionButton} aria-pressed={moving} onClick={() => setPlacing(moving ? null : selected)}>
          {moving ? "Cancel positioning" : "Position device"}
        </button>
        {!moving && <button className="configure-in-scene" onClick={() => {
          const inspector = document.querySelector<HTMLElement>('.inspector-stack');
          inspector?.scrollIntoView({ block: 'start' });
          inspector?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        }}>Configure device</button>}
        {moving && <div className="placement-guide" role="status">
          <strong>Place {state.document.layout[selected]?.name}</strong>
          <p>Click or tap an empty spot on the grid. Drag to orbit. Escape to cancel.</p>
          <div className="row" aria-label="Move selected device">
            {([["Left", -2, 0], ["Right", 2, 0], ["Forward", 0, -2], ["Back", 0, 2]] as const).map(([label, dx, dz]) =>
              <button key={label} onClick={() => {
                const current = state.document.layout[selected];
                void controller.dispatch({ type: "device.move", id: selected, x: current.x + dx, z: current.z + dz });
              }}>{label}</button>)}
            <button onClick={stopPlacing}>Done</button>
          </div>
        </div>}
      </div>}
    </section>
  );
}
