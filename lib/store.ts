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
  downstreamIds,
  hasContext,
  nearestUpstream,
  reaches,
  sortGenerates,
} from "@/lib/graph";
import { loadProject, saveProject } from "@/lib/storage";
import { buildTemplate, type TemplateId } from "@/lib/templates";
import type {
  AppNode,
  Format,
  GenerateNode,
  GraphEdge,
  NodeKind,
} from "@/lib/types";

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
  hydrate: () => void;
  setProjectName: (name: string) => void;
  setViewport: (viewport: Viewport) => void;
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
let checkpoint: Snapshot | null = null;
let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function cloneSnapshot(nodes: AppNode[], edges: GraphEdge[]): Snapshot {
  return structuredClone({ nodes, edges });
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-2)}`;
}

function defaultData(kind: NodeKind): AppNode["data"] {
  switch (kind) {
    case "brief":
      return { title: "", audience: "", headline: "", prompt: "" };
    case "style":
      return {
        preset: "ink",
        bg: "#0c0d0f",
        fg: "#f3f0e8",
        accent: "#e4f25a",
        font: "sans",
        density: "comfortable",
        radius: "soft",
        notes: "",
      };
    case "layout":
      return {
        structure: "landing",
        sections: ["nav", "hero", "logos", "features", "quote", "cta", "footer"],
        notes: "",
      };
    case "component":
      return { kind: "features", name: "", spec: "" };
    case "generate":
      return {
        format: "html",
        model: "",
        status: "idle",
        source: "",
        warning: "",
        code: "",
        themeCss: "",
      };
    case "preview":
      return { code: "", format: "html", themeCss: "", device: "desktop" };
    case "code":
      return { code: "", format: "html", themeCss: "", edited: false };
  }
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

function writeArtifact(
  node: AppNode,
  code: string,
  patch: {
    format?: Format;
    themeCss?: string;
    status?: GenerateNode["data"]["status"];
    source?: GenerateNode["data"]["source"];
    warning?: string;
    edited?: boolean;
  },
): AppNode {
  if (node.type === "generate") {
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
      },
    };
  }
  if (node.type === "code") {
    return {
      ...node,
      data: {
        ...node.data,
        code,
        format: patch.format ?? node.data.format,
        themeCss: patch.themeCss ?? node.data.themeCss,
        edited: patch.edited ?? false,
      },
    };
  }
  if (node.type === "preview") {
    return {
      ...node,
      data: {
        ...node.data,
        code,
        format: patch.format ?? node.data.format,
        themeCss: patch.themeCss ?? node.data.themeCss,
      },
    };
  }
  return node;
}

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

  function patchDownstream(
    id: string,
    code: string,
    patch: Parameters<typeof writeArtifact>[2],
    includeSelf = true,
  ) {
    const state = get();
    const down = new Set(downstreamIds(id, state.edges));
    set({
      nodes: state.nodes.map((node) => {
        if (includeSelf && node.id === id) return writeArtifact(node, code, patch);
        if (!down.has(node.id)) return node;
        if (node.type === "preview" || node.type === "code") {
          return writeArtifact(node, code, {
            ...patch,
            edited: node.type === "code" ? false : undefined,
          });
        }
        return node;
      }),
    });
  }

  async function runOne(id: string) {
    const state = get();
    const node = state.nodes.find((item) => item.id === id);
    if (!node || node.type !== "generate") return;
    const context = collectContext(id, state.nodes, state.edges);
    if (!hasContext(context)) {
      get().showToast("先把简报、风格或布局连到这个生成节点");
      return;
    }
    controllers.get(id)?.abort();
    const controller = new AbortController();
    controllers.set(id, controller);
    flushCheckpoint();
    const snap = cloneSnapshot(get().nodes, get().edges);
    set((current) => ({
      past: [...current.past, snap].slice(-50),
      future: [],
      runningIds: [...current.runningIds.filter((item) => item !== id), id],
      nodes: current.nodes.map((item) =>
        item.id === id && item.type === "generate"
          ? { ...item, data: { ...item.data, status: "running", warning: "" } }
          : item,
      ),
    }));

    let previewAt = 0;
    try {
      const result = await requestGeneration({
        context,
        model: node.data.model,
        signal: controller.signal,
        onChunk: (text) => {
          if (get().nodes.every((item) => item.id !== id)) return;
          const now = Date.now();
          const format = node.data.format;
          if (format === "html" && now - previewAt > 350 && /<body/i.test(text)) {
            previewAt = now;
            patchDownstream(id, text, { format, status: "running" });
          } else {
            set({
              nodes: get().nodes.map((item) =>
                item.id === id && item.type === "generate"
                  ? { ...item, data: { ...item.data, code: text, status: "running" } }
                  : item,
              ),
            });
          }
        },
      });
      if (controller.signal.aborted) return;
      if (get().nodes.every((item) => item.id !== id)) return;
      patchDownstream(id, result.code, {
        format: node.data.format,
        themeCss: result.themeCss,
        status: "done",
        source: result.source,
        warning: result.warning,
        edited: false,
      });
      if (result.warning) get().showToast(result.warning);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "生成失败";
      set({
        nodes: get().nodes.map((item) =>
          item.id === id && item.type === "generate"
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
    showToast: (message) => {
      if (toastTimer) clearTimeout(toastTimer);
      set({ toast: message });
      toastTimer = setTimeout(() => set({ toast: "" }), 2600);
    },
    hydrate: () => {
      if (get().hydrated) return;
      const saved = loadProject();
      if (saved) {
        set({
          projectName: saved.projectName || "未命名项目",
          nodes: saved.nodes.map((node) =>
            node.type === "generate" && node.data.status === "running"
              ? { ...node, data: { ...node.data, status: "idle" } }
              : node,
          ),
          edges: saved.edges,
          viewport: saved.viewport,
          hydrated: true,
          past: [],
          future: [],
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
      });
    },
    setProjectName: (name) => {
      remember();
      set({ projectName: name });
    },
    setViewport: (viewport) => set({ viewport }),
    onNodesChange: (changes) => {
      const remove = changes.some((change) => change.type === "remove");
      if (remove) {
        commit((state) => ({
          nodes: applyNodeChanges(changes, state.nodes as Node[]) as AppNode[],
        }));
        return;
      }
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes as Node[]) as AppNode[],
      }));
    },
    onEdgesChange: (changes) => {
      const remove = changes.some((change) => change.type === "remove");
      if (remove) {
        commit((state) => ({
          edges: applyEdgeChanges(changes, state.edges as Edge[]) as GraphEdge[],
        }));
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
      if (!source || !target) return false;
      if (!canConnect(source.type, target.type)) return false;
      if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
        return false;
      }
      return !reaches(connection.target, connection.source, edges);
    },
    onConnect: (connection) => {
      if (!get().isValidConnection(connection)) return;
      commit((state) => ({
        edges: addEdge({ ...connection, type: "smoothstep" }, state.edges as Edge[]) as GraphEdge[],
      }));
    },
    addNode: (kind, position) => {
      const node = makeNode(kind, {
        x: position.x - nodeWidth(kind) / 2,
        y: position.y - 24,
      });
      commit((state) => ({ nodes: [...state.nodes, node] }));
    },
    removeNode: (id) => {
      commit((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      }));
    },
    updateData: (id, partial) => {
      remember();
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? ({ ...node, data: { ...node.data, ...partial } } as AppNode) : node,
        ),
      }));
    },
    applyCodeEdit: (id, code) => {
      remember();
      const down = new Set(downstreamIds(id, get().edges));
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === id && (node.type === "code" || node.type === "preview" || node.type === "generate")) {
            return writeArtifact(node, code, { edited: true });
          }
          if (down.has(node.id) && node.type === "preview") {
            return writeArtifact(node, code, {});
          }
          return node;
        }),
      }));
    },
    undo: () => {
      flushCheckpoint();
      const { past, nodes, edges } = get();
      if (past.length === 0) return;
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
      const template = buildTemplate(id);
      commit(() => ({
        projectName: template.projectName,
        nodes: template.nodes,
        edges: template.edges,
        viewport: null,
        fitRequest: get().fitRequest + 1,
      }));
    },
    clearCanvas: () => {
      commit(() => ({
        projectName: "未命名项目",
        nodes: [],
        edges: [],
        fitRequest: get().fitRequest + 1,
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
        .nodes.filter((node) => node.selected && node.type === "generate")
        .map((node) => node.id);
      if (selected.length === 0) {
        get().showToast("请先选中生成节点");
        return;
      }
      for (const id of sortGenerates(selected, get().edges)) {
        await runOne(id);
      }
    },
    runFromHere: async () => {
      const { nodes, edges } = get();
      const selected = nodes.filter((node) => node.selected);
      const ids = new Set<string>();
      if (selected.length === 0) {
        for (const node of nodes) {
          if (node.type === "generate") ids.add(node.id);
        }
      } else {
        for (const node of selected) {
          if (node.type === "generate") ids.add(node.id);
          for (const next of downstreamIds(node.id, edges)) {
            const target = nodes.find((item) => item.id === next);
            if (target?.type === "generate") ids.add(target.id);
          }
        }
      }
      if (ids.size === 0) {
        get().showToast("从这里走不到生成节点");
        return;
      }
      for (const id of sortGenerates([...ids], edges)) {
        await runOne(id);
      }
    },
  };
});

export function editTargetFor(id: string) {
  const { nodes, edges } = useCanvas.getState();
  const node = nodes.find((item) => item.id === id);
  if (!node) return id;
  if (node.type === "code") return id;
  if (node.type === "preview") return nearestUpstream(id, "code", nodes, edges)?.id ?? id;
  if (node.type === "generate") {
    const down = downstreamIds(id, edges);
    const code = nodes.find((item) => down.includes(item.id) && item.type === "code");
    return code?.id ?? id;
  }
  return id;
}

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
