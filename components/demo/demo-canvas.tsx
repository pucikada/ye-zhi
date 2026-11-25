"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { demoNodeTypes } from "@/components/demo/demo-node";
import { FlowEdge } from "@/components/canvas/flow-edge";
import { KIND_COLOR } from "@/lib/demo/types";
import { useDemo } from "@/lib/demo/store";

const edgeTypes = { flow: FlowEdge };

export function DemoCanvas() {
  const nodes = useDemo((state) => state.nodes);
  const edges = useDemo((state) => state.edges);
  const canvasId = useDemo((state) => state.activeCanvasId);
  const selected = useDemo((state) => state.selectedNodeId);
  const select = useDemo((state) => state.select);
  const move = useDemo((state) => state.move);
  const link = useDemo((state) => state.link);

  const flowNodes = useMemo<Node[]>(
    () =>
      nodes
        .filter((node) => node.canvasId === canvasId && !node.archived)
        .map((node) => ({
          id: node.id,
          type: "card",
          position: node.position,
          selected: node.id === selected,
          data: { id: node.id },
        })),
    [nodes, canvasId, selected],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges
        .filter((edge) => edge.canvasId === canvasId)
        .filter((edge) => flowNodes.some((node) => node.id === edge.source) && flowNodes.some((node) => node.id === edge.target))
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.itemId ? `item:${edge.itemId}` : "out",
          type: "flow",
          label: edge.itemId ? `v${edge.sourceVersion} · 项` : `v${edge.sourceVersion}`,
          data: { hot: false },
        })),
    [edges, canvasId, flowNodes],
  );

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={demoNodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, node) => select(node.id)}
      onPaneClick={() => select(null)}
      onNodeDragStop={(_, node) => move(node.id, node.position)}
      onConnect={(connection: Connection) => {
        if (!connection.source || !connection.target) return;
        const itemId = connection.sourceHandle?.startsWith("item:")
          ? connection.sourceHandle.slice("item:".length)
          : undefined;
        link(connection.source, connection.target, itemId);
      }}
      fitView
      minZoom={0.35}
      maxZoom={1.5}
      colorMode="dark"
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
      aria-label="页织演示画布"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#2a2e28" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(0,0,0,0.55)"
        bgColor="#12141a"
        nodeColor={(node) => {
          const kind = nodes.find((item) => item.id === node.id)?.kind;
          return kind ? KIND_COLOR[kind] : "#666";
        }}
      />
    </ReactFlow>
  );
}
