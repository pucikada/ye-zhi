"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { edgeTypes } from "@/components/canvas/flow-edge";
import { NodePicker } from "@/components/canvas/node-picker";
import { nodeTypes } from "@/components/canvas/nodes";
import { KIND_META } from "@/lib/catalog";
import { useCanvas } from "@/lib/store";
import type { NodeKind } from "@/lib/types";

export function FlowCanvas() {
  const nodes = useCanvas((state) => state.nodes);
  const edges = useCanvas((state) => state.edges);
  const runningIds = useCanvas((state) => state.runningIds);
  const onNodesChange = useCanvas((state) => state.onNodesChange);
  const onEdgesChange = useCanvas((state) => state.onEdgesChange);
  const onConnect = useCanvas((state) => state.onConnect);
  const isValidConnection = useCanvas((state) => state.isValidConnection);
  const addNode = useCanvas((state) => state.addNode);
  const rememberDrag = useCanvas((state) => state.rememberDrag);
  const setViewport = useCanvas((state) => state.setViewport);
  const viewport = useCanvas((state) => state.viewport);
  const fitRequest = useCanvas((state) => state.fitRequest);
  const setInspector = useCanvas((state) => state.setInspector);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const nodesReady = useNodesInitialized();
  const skipInitialFit = useRef(Boolean(viewport));
  const lastPaneClick = useRef(0);
  const [picker, setPicker] = useState<{
    x: number;
    y: number;
    flow: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!nodesReady) return;
    if (fitRequest === 0 && skipInitialFit.current) return;
    const timer = window.setTimeout(() => {
      void fitView({
        padding: 0.18,
        duration: fitRequest === 0 ? 0 : 220,
        minZoom: 0.4,
        maxZoom: 1,
      });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [nodesReady, fitRequest, fitView]);

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const hot = runningIds.includes(edge.source) || runningIds.includes(edge.target);
        return {
          ...edge,
          type: "flow",
          data: { hot },
        };
      }),
    [edges, runningIds],
  );

  return (
    <div
      className="h-full w-full"
      onDoubleClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".react-flow__pane")) return;
        setPicker({
          x: event.clientX,
          y: event.clientY,
          flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        });
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(event, node) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, textarea, select, iframe")) return;
          setPicker(null);
          setInspector(node.id);
        }}
        fitView={false}
        fitViewOptions={{ padding: 0.18 }}
        defaultViewport={viewport ?? { x: 0, y: 0, zoom: 0.85 }}
        onMoveEnd={(_, next) => setViewport(next)}
        onNodeDragStart={rememberDrag}
        onPaneClick={(event) => {
          const now = Date.now();
          if (now - lastPaneClick.current < 320) {
            lastPaneClick.current = 0;
            setPicker({
              x: event.clientX,
              y: event.clientY,
              flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
            });
            return;
          }
          lastPaneClick.current = now;
          setPicker(null);
          setInspector(null);
        }}
        colorMode="dark"
        deleteKeyCode={["Backspace", "Delete"]}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={1.75}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "flow" }}
        connectionLineStyle={{ stroke: "#dff25a", strokeWidth: 1.8 }}
        connectionRadius={28}
        aria-label="页织画布"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#2a2e28" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.55)"
          bgColor="#12141a"
          style={{ width: 128, height: 88 }}
          nodeColor={(node) => KIND_META[node.type as NodeKind]?.color ?? "#666"}
        />
      </ReactFlow>
      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/10 bg-[#16181d]/90 px-5 py-4 text-center shadow-xl">
            <p className="text-sm font-medium">画布是空的</p>
            <p className="mt-1 text-xs text-white/50">双击空白处添加节点。点开节点，用对话改内容。</p>
          </div>
        </div>
      ) : null}
      {picker ? (
        <NodePicker
          x={picker.x}
          y={picker.y}
          onClose={() => setPicker(null)}
          onPick={(kind) => {
            addNode(kind, picker.flow);
            setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}
