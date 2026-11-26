import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowDevice } from "./flow-view";

const KIND_LABEL: Record<FlowDevice["kind"], string> = {
  host: "Host",
  router: "Router",
  switch: "Switch",
  bridge: "Bridge",
  hub: "Hub",
};

/** Drag the device to move it, or drag from its connector to cable it. */
function DeviceNodeImpl({ data }: NodeProps) {
  const device = data as FlowDevice;
  const identity = [
    `${device.name} (${KIND_LABEL[device.kind]})`,
    ...device.details,
    "Drag from its connector dot to another device to cable them together.",
  ]
    .join(", ");

  /** Enter/Space press the dot as a button, using React Flow's two-click
   * connect: the first press starts the connection, the next press on
   * another dot completes it. */
  const pressDot = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.click();
    },
    [],
  );

  return (
    <div
      className={`flow-device flow-device-${device.kind}${
        device.selected ? " is-selected" : ""
      }`}
      data-device-node={device.id}
      data-selected={device.selected ? "true" : "false"}
      onClick={(event) => {
        // Let the handle complete its click connection, then stop the node's
        // selection handler from opening an inspector over the next endpoint.
        if ((event.target as HTMLElement).closest(".flow-cable-dot"))
          event.stopPropagation();
      }}
    >
      <img
        className="flow-device-icon"
        src={`/device-icons/${device.kind}.png`}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="flow-device-details" aria-hidden="true">
        <span className="flow-device-name">{device.name}</span>
        {device.details.map((line, index) => (
          <span className="flow-device-meta" key={index}>
            {line}
          </span>
        ))}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-cable-dot"
        id="cable"
        isConnectable
        title="Drag to another device's dot to connect a cable, or press here and press another dot"
        aria-label={`Cable connector for ${device.name}`}
        role="button"
        tabIndex={0}
        onKeyDown={pressDot}
      />
      <span className="flow-device-identity">{identity}</span>
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeImpl);
