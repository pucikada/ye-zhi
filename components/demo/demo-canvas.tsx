"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AddNodeMenu } from "@/components/demo/add-node-menu";
import { useCanvasUi } from "@/components/demo/canvas-ui";
import { NodeChat } from "@/components/demo/node-chat";
import { PreviewDialog } from "@/components/demo/preview-dialog";
import { demoNodeTypes, type CardModel } from "@/components/demo/demo-node";
import { FlowEdge } from "@/components/canvas/flow-edge";
import { KIND_COLOR, type NodeKind, type RoleId } from "@/lib/demo/types";
import { currentVersion, instructionGate, versionOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import type { DemoNode } from "@/lib/demo/types";

const edgeTypes = { flow: FlowEdge };
const nodeCache = new Map<string, { key: string; flow: Node<CardModel, "card"> }>();
const edgeCache = new Map<string, { key: string; flow: Edge }>();

function canRead(
  access: Record<string, RoleId[]>,
  revoked: Array<{ roleId: string; projectId: string }>,
  projectId: string,
  role: RoleId,
) {
  return (access[projectId] ?? []).includes(role) && !revoked.some((item) => item.roleId === role && item.projectId === projectId);
}

function cardModel(
  node: DemoNode,
  source: DemoNode | undefined,
  role: RoleId,
  access: Record<string, RoleId[]>,
  revoked: Array<{ roleId: RoleId; projectId: string }>,
): CardModel {
  const version = currentVersion(node);
  const sourceVersion = source && node.reference ? versionOf(source, node.reference.version) : undefined;
  const gate = instructionGate({ ...useDemo.getState(), access, revoked, activeRole: role }, node.id);
  const denied = !canRead(access, revoked, node.projectId, role) || (node.reference ? !canRead(access, revoked, node.reference.projectId, role) : false);
  const shown = denied ? undefined : node.reference ? sourceVersion : version;
  const badges = [
    node.frozen ? "已冻结" : "",
    node.archived ? "已归档" : "",
    node.online ? "已上线" : "",
    node.reference ? `引用 v${node.reference.version}` : "",
    node.job?.status === "running" ? "生成中" : "",
    node.job?.status === "stopped" ? "已停止" : "",
    node.job?.status === "failed" ? "生成失败" : "",
    node.lock && node.lock.roleId !== role ? "他人编辑中" : "",
    shown ? `v${shown.version} · ${shown.origin === "mock-ai" ? "模拟" : shown.origin === "import" ? "导入" : "手工"}` : "未生成",
  ].filter(Boolean);
  return {
    id: node.id,
    kind: node.kind,
    name: node.name,
    color: KIND_COLOR[node.kind],
    summary: denied ? "" : shown?.summary || node.freezeNote || "还没有产物",
    badges,
    items: denied
      ? []
      : (shown?.items ?? [])
          .filter((item) => !node.removedItemIds.includes(item.id))
          .map((item) => ({ id: item.id, name: item.name, group: item.group, detail: item.detail })),
    denied,
    frozen: node.frozen,
    job: node.job?.status ?? "",
    compose: { enabled: gate.enabled, reason: gate.reason, mode: gate.mode },
  };
}

function itemLabel(
  nodes: DemoNode[],
  edge: { source: string; sourceVersion: number; itemId: string },
  role: RoleId,
  access: Record<string, RoleId[]>,
  revoked: Array<{ roleId: RoleId; projectId: string }>,
) {
  if (!edge.itemId) return "";
  const source = nodes.find((node) => node.id === edge.source);
  if (!source) return "";
  const real = source.reference ? nodes.find((node) => node.id === source.reference?.nodeId) : source;
  const projectId = source.reference?.projectId ?? source.projectId;
  if (!canRead(access, revoked, projectId, role) || !real) return "";
  const version = real.versions.find((item) => item.version === edge.sourceVersion) ?? real.versions.at(-1);
  return version?.items.find((item) => item.id === edge.itemId)?.name ?? "";
}

export function DemoCanvas() {
  const nodes = useDemo((state) => state.nodes);
  const edges = useDemo((state) => state.edges);
  const canvasId = useDemo((state) => state.activeCanvasId);
  const selected = useDemo((state) => state.selectedNodeId);
  const role = useDemo((state) => state.activeRole);
  const access = useDemo((state) => state.access);
  const revoked = useDemo((state) => state.revoked);
  const select = useDemo((state) => state.select);
  const move = useDemo((state) => state.move);
  const link = useDemo((state) => state.link);
  const unlink = useDemo((state) => state.unlink);
  const remove = useDemo((state) => state.remove);
  const add = useDemo((state) => state.add);
  const undo = useDemo((state) => state.undo);
  const redo = useDemo((state) => state.redo);
  const selectedIds = useCanvasUi((state) => state.selectedIds);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const lastPaneClick = useRef(0);
  const [menu, setMenu] = useState<{ x: number; y: number; flow: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!selected) {
      if (useCanvasUi.getState().selectedIds.length > 0) useCanvasUi.getState().setSelection([]);
      return;
    }
    const ids = useCanvasUi.getState().selectedIds;
    if (!ids.includes(selected)) useCanvasUi.getState().setSelection([selected]);
  }, [selected]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      if (typing) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (mod && event.key === "Enter") {
        event.preventDefault();
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="告诉这一节点要改什么"]')?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo]);

  function openMenu(x: number, y: number) {
    setMenu({ x, y, flow: screenToFlowPosition({ x, y }) });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 180 });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [canvasId, fitView]);

  const flowNodes = useMemo(() => {
    const visible = nodes.filter((node) => node.canvasId === canvasId && !node.archived);
    const seen = new Set<string>();
    const next: Array<Node<CardModel, "card">> = [];
    for (const node of visible) {
      seen.add(node.id);
      const source = node.reference ? nodes.find((item) => item.id === node.reference?.nodeId) : undefined;
      const shown = node.reference && source ? source.versions.find((item) => item.version === node.reference?.version) : node.versions.at(-1);
      const gate = instructionGate({ ...useDemo.getState(), access, revoked, activeRole: role }, node.id);
      const itemKey = (shown?.items ?? []).map((item) => `${item.id}:${item.name}`).join("|");
      const picked = selectedIds.includes(node.id);
      const key = `${node.name}:${shown?.summary ?? ""}:${shown?.version ?? 0}:${itemKey}:${node.removedItemIds.length}:${node.frozen}:${node.job?.status ?? ""}:${node.lock?.roleId ?? ""}:${picked}:${gate.enabled}:${gate.mode}:${gate.reason}`;
      const cached = nodeCache.get(node.id);
      if (cached && cached.key === key && cached.flow.position === node.position) {
        next.push(cached.flow);
        continue;
      }
      const flow: Node<CardModel, "card"> = {
        id: node.id,
        type: "card",
        position: node.position,
        selected: selectedIds.includes(node.id),
        data: cardModel(node, source, role, access, revoked),
      };
      nodeCache.set(node.id, { key, flow });
      next.push(flow);
    }
    for (const id of nodeCache.keys()) {
      if (!seen.has(id)) nodeCache.delete(id);
    }
    return next;
  }, [nodes, canvasId, selectedIds, role, access, revoked]);

  const flowEdges = useMemo(() => {
    const visible = new Set(flowNodes.map((node) => node.id));
    const running = new Set(nodes.filter((node) => node.job?.status === "running").map((node) => node.id));
    const seen = new Set<string>();
    const lanes = new Map<string, number>();
    const next: Edge[] = [];
    for (const edge of edges) {
      if (edge.canvasId !== canvasId || !visible.has(edge.source) || !visible.has(edge.target)) continue;
      seen.add(edge.id);
      const pair = `${edge.source}->${edge.target}`;
      const lane = lanes.get(pair) ?? 0;
      lanes.set(pair, lane + 1);
      const hot = running.has(edge.target);
      const itemName = itemLabel(nodes, edge, role, access, revoked);
      const key = `${edge.sourceVersion}:${edge.itemId}:${itemName}:${hot}:${lane}`;
      const cached = edgeCache.get(edge.id);
      if (cached && cached.key === key) {
        next.push(cached.flow);
        continue;
      }
      const flow: Edge = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.itemId ? `item:${edge.itemId}` : "out",
        type: "flow",
        data: { hot, itemName, lane },
      };
      edgeCache.set(edge.id, { key, flow });
      next.push(flow);
    }
    for (const id of edgeCache.keys()) {
      if (!seen.has(id)) edgeCache.delete(id);
    }
    return next;
  }, [edges, canvasId, flowNodes, nodes, role, access, revoked]);

  return (
    <div
      className="relative h-full w-full"
      onDoubleClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".react-flow__pane")) return;
        openMenu(event.clientX, event.clientY);
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={demoNodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(event, node) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, textarea, select, iframe")) return;
          setMenu(null);
          select(node.id);
        }}
        onPaneClick={(event) => {
          const now = Date.now();
          if (now - lastPaneClick.current < 320) {
            lastPaneClick.current = 0;
            openMenu(event.clientX, event.clientY);
            return;
          }
          lastPaneClick.current = now;
          setMenu(null);
          select(null);
        }}
        onPaneContextMenu={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
          event.preventDefault();
          openMenu(event.clientX, event.clientY);
        }}
        onNodeContextMenu={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
          event.preventDefault();
        }}
        onSelectionChange={(params: OnSelectionChangeParams) => {
          useCanvasUi.getState().setSelection(params.nodes.map((node) => node.id));
        }}
        onNodesChange={(changes) => {
          for (const change of changes) {
            if (change.type === "remove") remove(change.id);
          }
        }}
        onEdgesChange={(changes) => {
          for (const change of changes) {
            if (change.type === "remove") unlink(change.id);
          }
        }}
        onNodeDragStop={(_, node) => move(node.id, node.position)}
        onConnect={(connection: Connection) => {
          if (!connection.source || !connection.target) return;
          const itemId = connection.sourceHandle?.startsWith("item:")
            ? connection.sourceHandle.slice("item:".length)
            : undefined;
          link(connection.source, connection.target, itemId);
        }}
        onlyRenderVisibleElements
        minZoom={0.2}
        maxZoom={1.75}
        zoomOnDoubleClick={false}
        panOnDrag
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        colorMode="dark"
        deleteKeyCode={["Backspace", "Delete"]}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={28}
        proOptions={{ hideAttribution: true }}
        aria-label="页织画布"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="#2a2e28" />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="rounded-md bg-[#101218]/80 px-2 py-1 text-[11px] text-white/45">
          双击空白添加节点 · 单击节点对话 · 按住 Shift 多选
        </Panel>
        <MiniMap
          pannable
          zoomable
          style={{ top: 36, right: 12, width: 128, height: 84 }}
          maskColor="rgba(0,0,0,0.55)"
          bgColor="#12141a"
          nodeColor={(node) => KIND_COLOR[(node.data as CardModel | undefined)?.kind ?? "doc"]}
        />
      </ReactFlow>
      {flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/10 bg-[#16181d]/90 px-5 py-4 text-center shadow-xl">
            <p className="text-sm font-medium">画布是空的</p>
            <p className="mt-1 text-xs text-white/50">双击空白处添加节点。点开节点，用对话改内容。</p>
          </div>
        </div>
      ) : null}
      {menu ? (
        <AddNodeMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onPick={(kind: NodeKind) => {
            add(kind, { x: menu.flow.x - 140, y: menu.flow.y - 24 });
            setMenu(null);
          }}
        />
      ) : null}
      <NodeChat />
      <PreviewDialog />
    </div>
  );
}
