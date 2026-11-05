import { normalizeGraph } from "@/lib/migrate";
import type { AppNode, GraphEdge } from "@/lib/types";

export const STORAGE_KEY = "yezhi.project.v2";
const LEGACY_KEY = "yezhi.project.v1";

export type PersistedProject = {
  v: 2;
  projectName: string;
  nodes: AppNode[];
  edges: GraphEdge[];
  viewport: { x: number; y: number; zoom: number } | null;
};

function leanNode(node: AppNode): AppNode {
  const copy = { ...node } as AppNode & {
    measured?: unknown;
    dragging?: unknown;
    internals?: unknown;
  };
  delete copy.measured;
  delete copy.dragging;
  delete copy.internals;
  return copy;
}

function leanEdge(edge: GraphEdge): GraphEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: "flow",
    selected: edge.selected,
  };
}

function read(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as {
      v?: number;
      projectName?: string;
      nodes?: unknown;
      edges?: unknown;
      viewport?: PersistedProject["viewport"];
    };
  } catch {
    return null;
  }
}

function accept(parsed: NonNullable<ReturnType<typeof read>>): PersistedProject | null {
  const graph = normalizeGraph(parsed.nodes, parsed.edges);
  if (!graph) return null;
  const viewport = parsed.viewport;
  return {
    v: 2,
    projectName: typeof parsed.projectName === "string" ? parsed.projectName : "未命名项目",
    nodes: graph.nodes,
    edges: graph.edges,
    viewport:
      viewport &&
      typeof viewport.x === "number" &&
      typeof viewport.y === "number" &&
      typeof viewport.zoom === "number"
        ? viewport
        : null,
  };
}

export function loadProject(): PersistedProject | null {
  const current = read(STORAGE_KEY);
  if (current) return accept(current);
  const legacy = read(LEGACY_KEY);
  if (legacy) return accept(legacy);
  return null;
}

export function saveProject(project: Omit<PersistedProject, "v">) {
  const payload: PersistedProject = {
    v: 2,
    projectName: project.projectName,
    nodes: project.nodes.map(leanNode),
    edges: project.edges.map(leanEdge),
    viewport: project.viewport,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
