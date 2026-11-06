import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowDevice } from "./flow-view";

const KIND_LABEL: Record<FlowDevice["kind"], string> = {
  host: "Host",
  router: "Router",
  switch: "Switch",
  bridge: "Bridge",
  hub: "Hub",
};

/** One device on the topology canvas: the generated icon is the whole node.
 * The node is the drag handle, so a learner drags the device itself; the
 * surrounding canvas pans instead. The device identity (name, kind, address,
 * ports) stays in the accessibility tree as node text, so a screen reader
 * still announces exactly what the old card showed. */
function DeviceNodeImpl({ data }: NodeProps) {
  const device = data as FlowDevice;
  const identity = [
    `${device.name} (${KIND_LABEL[device.kind]})`,
    device.ip || null,
    `${device.ports} ${device.ports === 1 ? "port" : "ports"}`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div
      className={`flow-device flow-device-${device.kind}${
        device.selected ? " is-selected" : ""
      }`}
      data-device-node={device.id}
      data-selected={device.selected ? "true" : "false"}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="flow-port flow-port-in"
        id="in"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-port flow-port-out"
        id="out"
      />
      <img
        className="flow-device-icon"
        src={`/device-icons/${device.kind}.png`}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="flow-device-identity">{identity}</span>
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeImpl);
