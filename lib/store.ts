"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { create } from "zustand";

import { requestGeneration } from "@/lib/client-generate";
import { nodeWidth } from "@/lib/catalog";
import {
  canConnect,
  collectContext,
  hasContext,
  pageSinks,
  reaches,
  sortPages,
} from "@/lib/graph";
import { defaultData } from "@/lib/node-fields";
import { loadProject, saveProject } from "@/lib/storage";
import { buildTemplate, type TemplateId } from "@/lib/templates";
import type { AppNode, Format, GraphEdge, NodeKind, PageNode } from "@/lib/types";

type Snapshot = { nodes: AppNode[]; edges: GraphEdge[] };

type CanvasState = {
  projectName: string;
  nodes: AppNode[];
  edges: GraphEdge[];
  viewport: Viewport | null;
  past: Snapshot[];
  future: Snapshot[];
  hydrated: boolean;
  runningIds: string[];
  saveState: "saved" | "saving" | "error";
  toast: string;
  fitRequest: number;
  inspectorId: string | null;
  hydrate: () => void;
  setProjectName: (name: string) => void;
  setViewport: (viewport: Viewport) => void;
  setInspector: (id: string | null) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection | Edge) => boolean;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateData: (id: string, partial: Record<string, unknown>) => void;
  applyCodeEdit: (id: string, code: string) => void;
  undo: () => void;
  redo: () => void;
  loadTemplate: (id: TemplateId) => void;
  clearCanvas: () => void;
  rememberDrag: () => void;
  runOne: (id: string) => Promise<void>;
  runSelected: () => Promise<void>;
  runFromHere: () => Promise<void>;
  showToast: (message: string) => void;
};

const controllers = new Map<string, AbortController>();
const regenTimers = new Map<string, ReturnType<typeof setTimeout>>();
let checkpoint: Snapshot | null = null;
let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let graphEpoch = 0;

function cloneSnapshot(nodes: AppNode[], edges: GraphEdge[]): Snapshot {
  return structuredClone({ nodes, edges });
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-2)}`;
}

function makeNode(kind: NodeKind, position: { x: number; y: number }): AppNode {
  return {
    id: uid(kind),
    type: kind,
    position,
    style: { width: nodeWidth(kind) },
    data: defaultData(kind),
  } as AppNode;
}

function writePage(
  node: AppNode,
  code: string,
  patch: {
    format?: Format;
    themeCss?: string;
    status?: PageNode["data"]["status"];
    source?: PageNode["data"]["source"];
    warning?: string;
    edited?: boolean;
  },
): AppNode {
  if (node.type !== "page") return node;
  return {
    ...node,
    data: {
      ...node.data,
      code,
      format: patch.format ?? node.data.format,
      themeCss: patch.themeCss ?? node.data.themeCss,
      status: patch.status ?? node.data.status,
      source: patch.source ?? node.data.source,
      warning: patch.warning ?? node.data.warning,
      edited: patch.edited ?? false,
    },
  };
}

const PAGE_RUNTIME = new Set(["code", "status", "source", "warning", "themeCss", "edited", "device"]);

export const useCanvas = create<CanvasState>((set, get) => {
  function flushCheckpoint() {
    if (checkpointTimer) clearTimeout(checkpointTimer);
    checkpointTimer = null;
    if (!checkpoint) return;
    const snap = checkpoint;
    checkpoint = null;
    set((state) => ({ past: [...state.past, snap].slice(-50), future: [] }));
  }

  function remember() {
    const state = get();
    if (!checkpoint) {
      checkpoint = cloneSnapshot(state.nodes, state.edges);
      if (state.future.length > 0) set({ future: [] });
    }
    if (checkpointTimer) clearTimeout(checkpointTimer);
    checkpointTimer = setTimeout(() => {
      if (!checkpoint) return;
      const snap = checkpoint;
      checkpoint = null;
      checkpointTimer = null;
      set((current) => ({ past: [...current.past, snap].slice(-50), future: [] }));
    }, 450);
  }

  function commit(recipe: (state: CanvasState) => Partial<CanvasState>) {
    flushCheckpoint();
    const state = get();
    const snap = cloneSnapshot(state.nodes, state.edges);
    const next = recipe(get());
    set({
      ...next,
      past: [...get().past, snap].slice(-50),
      future: [],
    });
  }

  function cancelRuns() {
    for (const timer of regenTimers.values()) clearTimeout(timer);
    regenTimers.clear();
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
    graphEpoch += 1;
  }

  function schedule(id: string) {
    const existing = regenTimers.get(id);
    if (existing) clearTimeout(existing);
    regenTimers.set(
      id,
      setTimeout(() => {
        regenTimers.delete(id);
        void runOne(id, false);
      }, 80),
    );
  }

  function scheduleFrom(startId: string) {
    const state = get();
    for (const id of pageSinks(startId, state.nodes, state.edges)) schedule(id);
  }

  async function runOne(id: string, record = true) {
    const state = get();
    const node = state.nodes.find((item) => item.id === id);
    if (!node || node.type !== "page") return;
    const context = collectContext(id, state.nodes, state.edges);
    if (!hasContext(context)) {
      if (record) get().showToast("先把描述、风格、框架、动效或数据连到这个页面");
      return;
    }
    controllers.get(id)?.abort();
    const controller = new AbortController();
    controllers.set(id, controller);
    const epoch = graphEpoch;
    if (record) {
      flushCheckpoint();
      const snap = cloneSnapshot(get().nodes, get().edges);
      set((current) => ({
        past: [...current.past, snap].slice(-50),
        future: [],
        runningIds: [...current.runningIds.filter((item) => item !== id), id],
        nodes: current.nodes.map((item) =>
          item.id === id && item.type === "page"
            ? { ...item, data: { ...item.data, status: "running", warning: "" } }
            : item,
        ),
      }));
    } else {
      set((current) => ({
        runningIds: [...current.runningIds.filter((item) => item !== id), id],
        nodes: current.nodes.map((item) =>
          item.id === id && item.type === "page"
            ? { ...item, data: { ...item.data, status: "running", warning: "" } }
            : item,
        ),
      }));
    }

    let previewAt = 0;
    try {
      const result = await requestGeneration({
        context,
        model: node.data.model,
        signal: controller.signal,
        onChunk: (text) => {
          if (graphEpoch !== epoch) return;
          if (get().nodes.every((item) => item.id !== id)) return;
          const now = Date.now();
          const format = node.data.format;
          if (format === "html" && now - previewAt > 350 && /<body/i.test(text)) {
            previewAt = now;
            set({
              nodes: get().nodes.map((item) =>
                item.id === id ? writePage(item, text, { format, status: "running" }) : item,
              ),
            });
          } else {
            set({
              nodes: get().nodes.map((item) =>
                item.id === id && item.type === "page"
                  ? { ...item, data: { ...item.data, code: text, status: "running" } }
                  : item,
              ),
            });
          }
        },
      });
      if (controller.signal.aborted || graphEpoch !== epoch) return;
      if (get().nodes.every((item) => item.id !== id)) return;
      set({
        nodes: get().nodes.map((item) =>
          item.id === id
            ? writePage(item, result.code, {
                format: node.data.format,
                themeCss: result.themeCss,
                status: "done",
                source: result.source,
                warning: result.warning,
                edited: false,
              })
            : item,
        ),
      });
      if (result.warning) get().showToast(result.warning);
    } catch (error) {
      if (controller.signal.aborted || graphEpoch !== epoch) return;
      const message = error instanceof Error ? error.message : "生成失败";
      set({
        nodes: get().nodes.map((item) =>
          item.id === id && item.type === "page"
            ? {
                ...item,
                data: { ...item.data, status: "error", warning: message.slice(0, 180) },
              }
            : item,
        ),
      });
      get().showToast("生成失败，请再试一次");
    } finally {
      if (controllers.get(id) === controller) controllers.delete(id);
      set((current) => ({
        runningIds: current.runningIds.filter((item) => item !== id),
      }));
    }
  }

  return {
    projectName: "未命名项目",
    nodes: [],
    edges: [],
    viewport: null,
    past: [],
    future: [],
    hydrated: false,
    runningIds: [],
    saveState: "saved",
    toast: "",
    fitRequest: 0,
    inspectorId: null,
    showToast: (message) => {
      if (toastTimer) clearTimeout(toastTimer);
      set({ toast: message });
      toastTimer = setTimeout(() => set({ toast: "" }), 2600);
    },
    setInspector: (id) => set({ inspectorId: id }),
    hydrate: () => {
      if (get().hydrated) return;
      const saved = loadProject();
      if (saved) {
        set({
          projectName: saved.projectName || "未命名项目",
          nodes: saved.nodes.map((node) =>
            node.type === "page" && node.data.status === "running"
              ? { ...node, data: { ...node.data, status: "idle" } }
              : node,
          ),
          edges: saved.edges,
          viewport: saved.viewport,
          hydrated: true,
          past: [],
          future: [],
          inspectorId: null,
        });
        return;
      }
      const template = buildTemplate("landing");
      set({
        projectName: template.projectName,
        nodes: template.nodes,
        edges: template.edges,
        viewport: null,
        hydrated: true,
        past: [],
        future: [],
        inspectorId: null,
      });
    },
    setProjectName: (name) => {
      remember();
      set({ projectName: name });
    },
    setViewport: (viewport) => set({ viewport }),
    onNodesChange: (changes) => {
      const removed = changes.filter((change) => change.type === "remove");
      if (removed.length > 0) {
        const removedIds = new Set(removed.map((change) => change.id));
        commit((state) => ({
          nodes: applyNodeChanges(changes, state.nodes as Node[]) as AppNode[],
          inspectorId: removedIds.has(state.inspectorId ?? "") ? null : state.inspectorId,
        }));
        return;
      }
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes as Node[]) as AppNode[],
      }));
    },
    onEdgesChange: (changes) => {
      const removed = changes.filter((change) => change.type === "remove");
      if (removed.length > 0) {
        const state = get();
        const affected = new Set<string>();
        for (const change of removed) {
          const edge = state.edges.find((item) => item.id === change.id);
          if (!edge) continue;
          for (const id of pageSinks(edge.target, state.nodes, state.edges)) affected.add(id);
        }
        commit((current) => ({
          edges: applyEdgeChanges(changes, current.edges as Edge[]) as GraphEdge[],
        }));
        for (const id of affected) schedule(id);
        return;
      }
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges as Edge[]) as GraphEdge[],
      }));
    },
    isValidConnection: (connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      const { nodes, edges } = get();
      const source = nodes.find((node) => node.id === connection.source);
      const target = nodes.find((node) => node.id === connection.target);
      if (!source || !target || !canConnect(source.type, target.type)) return false;
      if (
        edges.some(
          (edge) => edge.source === connection.source && edge.target === connection.target,
        )
      ) {
        return false;
      }
      return !reaches(connection.target, connection.source, edges);
    },
    onConnect: (connection) => {
      if (!get().isValidConnection(connection)) return;
      commit((state) => ({
        edges: addEdge({ ...connection, type: "flow" }, state.edges as Edge[]) as GraphEdge[],
      }));
      if (connection.target) scheduleFrom(connection.target);
    },
    addNode: (kind, position) => {
      const node = makeNode(kind, {
        x: position.x - nodeWidth(kind) / 2,
        y: position.y - 24,
      });
      commit((state) => ({ nodes: [...state.nodes, node] }));
    },
    removeNode: (id) => {
      const state = get();
      const affected = pageSinks(id, state.nodes, state.edges).filter((pageId) => pageId !== id);
      commit((current) => ({
        nodes: current.nodes.filter((node) => node.id !== id),
        edges: current.edges.filter((edge) => edge.source !== id && edge.target !== id),
        inspectorId: current.inspectorId === id ? null : current.inspectorId,
      }));
      for (const pageId of affected) schedule(pageId);
    },
    updateData: (id, partial) => {
      const node = get().nodes.find((item) => item.id === id);
      if (!node) return;
      remember();
      set((state) => ({
        nodes: state.nodes.map((item) =>
          item.id === id ? ({ ...item, data: { ...item.data, ...partial } } as AppNode) : item,
        ),
      }));
      if (node.type === "page") {
        if ("format" in partial || "model" in partial) schedule(id);
        return;
      }
      if (Object.keys(partial).every((key) => PAGE_RUNTIME.has(key))) return;
      scheduleFrom(id);
    },
    applyCodeEdit: (id, code) => {
      remember();
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id && node.type === "page"
            ? writePage(node, code, { edited: true })
            : node,
        ),
      }));
    },
    undo: () => {
      flushCheckpoint();
      const { past, nodes, edges } = get();
      if (past.length === 0) return;
      cancelRuns();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({
        past: past.slice(0, -1),
        future: [cloneSnapshot(nodes, edges), ...get().future].slice(0, 50),
        nodes: previous.nodes,
        edges: previous.edges,
      });
    },
    redo: () => {
      flushCheckpoint();
      const { future, nodes, edges } = get();
      if (future.length === 0) return;
      cancelRuns();
      const next = future[0];
      if (!next) return;
      set({
        future: future.slice(1),
        past: [...get().past, cloneSnapshot(nodes, edges)].slice(-50),
        nodes: next.nodes,
        edges: next.edges,
      });
    },
    loadTemplate: (id) => {
      cancelRuns();
      const template = buildTemplate(id);
      commit(() => ({
        projectName: template.projectName,
        nodes: template.nodes,
        edges: template.edges,
        viewport: null,
        fitRequest: get().fitRequest + 1,
        inspectorId: null,
      }));
    },
    clearCanvas: () => {
      cancelRuns();
      commit(() => ({
        projectName: "未命名项目",
        nodes: [],
        edges: [],
        fitRequest: get().fitRequest + 1,
        inspectorId: null,
      }));
    },
    rememberDrag: () => {
      flushCheckpoint();
      const state = get();
      const snap = cloneSnapshot(state.nodes, state.edges);
      set({ past: [...state.past, snap].slice(-50), future: [] });
    },
    runOne,
    runSelected: async () => {
      const selected = get()
        .nodes.filter((node) => node.selected && node.type === "page")
        .map((node) => node.id);
      if (selected.length === 0) {
        get().showToast("请先选中页面节点");
        return;
      }
      for (const id of sortPages(selected, get().edges)) {
        await runOne(id);
      }
    },
    runFromHere: async () => {
      const { nodes, edges } = get();
      const selected = nodes.filter((node) => node.selected);
      const ids = new Set<string>();
      if (selected.length === 0) {
        for (const node of nodes) {
          if (node.type === "page") ids.add(node.id);
        }
      } else {
        for (const node of selected) {
          for (const id of pageSinks(node.id, nodes, edges)) ids.add(id);
        }
      }
      if (ids.size === 0) {
        get().showToast("从这里走不到页面节点");
        return;
      }
      for (const id of sortPages([...ids], edges)) {
        await runOne(id);
      }
    },
  };
});

if (typeof window !== "undefined") {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useCanvas.subscribe((state, previous) => {
    if (!state.hydrated) return;
    if (
      state.nodes === previous.nodes &&
      state.edges === previous.edges &&
      state.projectName === previous.projectName &&
      state.viewport === previous.viewport
    ) {
      return;
    }
    if (state.saveState !== "saving") useCanvas.setState({ saveState: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const current = useCanvas.getState();
      try {
        saveProject({
          projectName: current.projectName,
          nodes: current.nodes,
          edges: current.edges,
          viewport: current.viewport,
        });
        useCanvas.setState({ saveState: "saved" });
      } catch {
        useCanvas.setState({ saveState: "error" });
      }
    }, 350);
  });
}
