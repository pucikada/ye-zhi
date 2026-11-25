import type { DemoEdge, DemoNode, DemoState } from "./types";

export type CanvasSnap = {
  nodes: DemoNode[];
  edges: DemoEdge[];
  selectedNodeId: string | null;
};

export function restoreCanvasHistory(current: DemoState, snap: CanvasSnap): CanvasSnap {
  const frozen = new Map(current.nodes.filter((node) => node.frozen).map((node) => [node.id, node]));
  const nodes = snap.nodes.map((node) => {
    const now = frozen.get(node.id);
    return now ? { ...now, position: node.position } : node;
  });
  for (const now of frozen.values()) {
    if (!nodes.some((node) => node.id === now.id)) nodes.push(now);
  }
  const edges = snap.edges.filter((edge) => {
    if (!frozen.has(edge.target)) return true;
    return current.edges.some((item) => item.id === edge.id);
  });
  for (const edge of current.edges) {
    if (frozen.has(edge.target) && !edges.some((item) => item.id === edge.id)) edges.push(edge);
  }
  return { nodes, edges, selectedNodeId: snap.selectedNodeId };
}
