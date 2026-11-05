import type { AppNode, GraphEdge } from "@/lib/types";

export const STORAGE_KEY = "yezhi.project.v1";

export type PersistedProject = {
  v: 1;
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

export function loadProject(): PersistedProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedProject;
    if (parsed?.v !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProject(project: Omit<PersistedProject, "v">) {
  const payload: PersistedProject = {
    v: 1,
    projectName: project.projectName,
    nodes: project.nodes.map(leanNode),
    edges: project.edges,
    viewport: project.viewport,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
