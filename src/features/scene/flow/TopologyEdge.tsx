import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { FlowLink, FlowPacket } from "./flow-view";

export type TopologyEdgeData = {
  link: FlowLink;
  packets: FlowPacket[];
};

/** A real topology link. Only links that exist in the document are drawn, and
 * they are drawn from the stored endpoints, so the canvas never invents a
 * connection that the simulation does not have. */
function TopologyEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const { link, packets } = (data ?? { link: null, packets: [] }) as TopologyEdgeData;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const state = link?.faulty
    ? "faulty"
    : link?.active
      ? "active"
      : link?.selected
        ? "selected"
        : "idle";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`flow-edge flow-edge-${state}`}
        data-link-id={link?.id}
        data-link-state={state}
      />
      {state !== "idle" && (
        <EdgeLabelRenderer>
          <div
            className={`flow-edge-label flow-edge-label-${state}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {state === "faulty" ? "Link failure" : "Traffic on this link"}
          </div>
        </EdgeLabelRenderer>
      )}
      {packets.length > 0 && (
        <EdgeLabelRenderer>
          <div
            className="flow-packet-marker"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            data-packet-id={packets[0].id}
            data-packet-count={packets.length}
          >
            {packets.length === 1 ? "1 packet" : `${packets.length} packets`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const TopologyEdge = memo(TopologyEdgeImpl);
