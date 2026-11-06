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

/** One device on the topology canvas. The node is the drag handle, so a
 * learner drags the device itself; the surrounding canvas pans instead. */
function DeviceNodeImpl({ data }: NodeProps) {
  const device = data as FlowDevice;
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
      <span className="flow-device-kind">{KIND_LABEL[device.kind]}</span>
      <strong className="flow-device-name">{device.name}</strong>
      {device.ip && <code className="flow-device-ip">{device.ip}</code>}
      <span className="flow-device-ports">
        {device.ports} {device.ports === 1 ? "port" : "ports"}
      </span>
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeImpl);
