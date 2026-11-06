import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnInit,
  type OnNodeDrag,
  type Viewport,
} from "@xyflow/react";
import type { AppController } from "../../../app/types";
import { useApp } from "../../../app/use-app";
import { DeviceNode } from "./DeviceNode";
import { TopologyEdge, type TopologyEdgeData } from "./TopologyEdge";
import {
  FLOW_SCALE,
  MIN_ZOOM,
  MAX_ZOOM,
  buildFlowView,
  canvasToLayout,
  viewToViewport,
  viewportToView,
  type FlowDevice,
} from "./flow-view";

type FlowNode = Node<FlowDevice, "device">;
type FlowEdge = Edge<TopologyEdgeData, "topology">;

const nodeTypes = { device: DeviceNode };
const edgeTypes = { topology: TopologyEdge };

export function NetworkFlow({
  controller,
  onReady,
  onError,
}: {
  controller: AppController;
  onReady: () => void;
  onError: (cause: unknown) => void;
}) {
  return (
    <ReactFlowProvider>
      <FlowCanvas controller={controller} onReady={onReady} onError={onError} />
    </ReactFlowProvider>
  );
}

function FlowCanvas({
  controller,
  onReady,
  onError,
}: {
  controller: AppController;
  onReady: () => void;
  onError: (cause: unknown) => void;
}) {
  const state = useApp(controller);
  const flow = useReactFlow<FlowNode, FlowEdge>();
  const [ready, setReady] = useState(false);
  const restoredFor = useRef<string | null>(null);
  const nodesInitialized = useNodesInitialized();

  const view = useMemo(
    () =>
      buildFlowView(
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

  const projectedNodes = useMemo<FlowNode[]>(
    () =>
      view.devices.map((device) => ({
        id: device.id,
        type: "device" as const,
        position: { x: device.x, y: device.y },
        data: device,
        selected: device.selected,
        connectable: false,
        deletable: false,
        selectable: true,
        focusable: true,
        ariaLabel: device.name,
      })),
    [view.devices],
  );

  const [nodes, setNodes] = useState<FlowNode[]>([]);
  useEffect(() => {
    setNodes(current => {
      const byId = new Map(current.map(node => [node.id, node]));
      return projectedNodes.map(node => ({ ...byId.get(node.id), ...node }));
    });
  }, [projectedNodes]);

  const edges = useMemo<FlowEdge[]>(
    () =>
      view.links.map((link) => ({
        id: link.id,
        type: "topology" as const,
        source: link.source,
        target: link.target,
        selected: link.selected,
        deletable: false,
        focusable: true,
        reconnectable: false,
        data: {
          link,
          packets: view.packets.filter((p) => p.linkId === link.id),
        },
      })),
    [view.links, view.packets],
  );

  const handleInit: OnInit<FlowNode, FlowEdge> = useCallback(
    () => { setReady(true); onReady(); },
    [onReady],
  );

  // Wait for node measurements before fitting legacy configurations. Restoring
  // a saved viewport runs only once per opened document, never on selection.
  useEffect(() => {
    if (!ready || !nodesInitialized || nodes.length === 0) return;
    const key = `${state.document.id}:${state.viewEpoch}`;
    if (restoredFor.current === key) return;
    restoredFor.current = key;
    const viewport = viewToViewport(state.document.view);
    const restore = viewport
      ? flow.setViewport(viewport, { duration: 0 })
      : flow.fitView({ padding: 0.3, maxZoom: 1.2, duration: 0 });
    void restore.catch(onError);
  }, [ready, nodesInitialized, nodes.length, state.document.id,
    state.viewEpoch, state.document.view, flow, onError]);

  const saveViewport = useCallback(
    (viewport: Viewport) => {
      const current = controller.getSnapshot().document.view;
      void controller.dispatch({
        type: "view.set",
        view: viewportToView(viewport, current),
      });
    },
    [controller],
  );

  const handleNodeDragStop: OnNodeDrag<FlowNode> = useCallback(
    (_event, node) => {
      const layout = canvasToLayout(node.position.x, node.position.y);
      void controller.dispatch({
        type: "device.move",
        id: node.id,
        x: layout.x,
        z: layout.z,
      });
    },
    [controller],
  );

  /** React Flow owns the drag gesture; the controller owns the document.
   * Only the position change is forwarded, so a drag can never remove a
   * device or a link on its own. */
  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setNodes(nodes => applyNodeChanges(changes, nodes));
      const selected = changes.find(change => change.type === "select" && change.selected);
      if (selected?.type === "select") void controller.dispatch({ type: "selection.set", selection: { kind: "device", id: selected.id } });
      for (const change of changes) {
        if (change.type !== "position" || !change.position) continue;
        const layout = canvasToLayout(change.position.x, change.position.y);
        void controller.dispatch({
          type: "device.move",
          id: change.id,
          x: layout.x,
          z: layout.z,
        });
      }
    },
    [controller],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      void controller.dispatch({
        type: "selection.set",
        selection: { kind: "device", id: node.id },
      });
    },
    [controller],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: FlowEdge) => {
      void controller.dispatch({
        type: "selection.set",
        selection: { kind: "link", id: edge.id },
      });
    },
    [controller],
  );

  const handlePaneClick = useCallback(
    () => {
      void controller.dispatch({ type: "selection.set", selection: null });
    },
    [controller],
  );

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      saveViewport(viewport);
    },
    [saveViewport],
  );

  return (
    <div className="flow-surface" data-flow-ready={ready}>
      <ReactFlow<FlowNode, FlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={handleInit}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={handleEdgeClick}
        onEdgesChange={(changes: EdgeChange<FlowEdge>[]) => {
          const selected = changes.find(change => change.type === "select" && change.selected);
          if (selected?.type === "select") void controller.dispatch({ type: "selection.set", selection: { kind: "link", id: selected.id } });
        }}
        onPaneClick={handlePaneClick}
        onMove={handleMoveEnd}
        onMoveEnd={handleMoveEnd}
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        multiSelectionKeyCode={null}
        nodesConnectable={false}
        nodesFocusable
        edgesFocusable
        elementsSelectable
        deleteKeyCode={null}
        preventScrolling
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        snapToGrid
        snapGrid={[FLOW_SCALE, FLOW_SCALE]}
        defaultEdgeOptions={{ type: "topology" }}
        aria-label="Network topology canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--color-rule-strong)"
        />
      </ReactFlow>
    </div>
  );
}
