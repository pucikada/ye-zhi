import type { AppNode, GenerationContext, GraphEdge, NodeKind } from "@/lib/types";

export const OUTGOING: Record<NodeKind, NodeKind[]> = {
  brief: ["generate"],
  style: ["generate"],
  layout: ["generate"],
  component: ["generate", "layout"],
  generate: ["preview", "code", "generate"],
  preview: [],
  code: ["preview"],
};

export function canConnect(source: NodeKind, target: NodeKind) {
  return OUTGOING[source].includes(target);
}

export function reaches(
  from: string,
  to: string,
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    if (current === to) return true;
    seen.add(current);
    for (const next of outgoing.get(current) ?? []) stack.push(next);
  }
  return false;
}

function adjacency(edges: Array<Pick<GraphEdge, "source" | "target">>, inbound: boolean) {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    const key = inbound ? edge.target : edge.source;
    const value = inbound ? edge.source : edge.target;
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  }
  return map;
}

export function upstreamIds(
  id: string,
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const incoming = adjacency(edges, true);
  const seen = new Set<string>();
  const queue = [...(incoming.get(id) ?? [])];
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    ordered.push(current);
    for (const next of incoming.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return ordered;
}

export function downstreamIds(
  id: string,
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const outgoing = adjacency(edges, false);
  const seen = new Set<string>();
  const queue = [...(outgoing.get(id) ?? [])];
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    ordered.push(current);
    for (const next of outgoing.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return ordered;
}

export function collectContext(
  generateId: string,
  nodes: AppNode[],
  edges: Array<Pick<GraphEdge, "source" | "target">>,
): GenerationContext {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const briefs: GenerationContext["briefs"] = [];
  const styles: GenerationContext["styles"] = [];
  const layouts: GenerationContext["layouts"] = [];
  const components: GenerationContext["components"] = [];
  const upstreamCode: string[] = [];

  for (const id of upstreamIds(generateId, edges)) {
    const node = byId.get(id);
    if (!node) continue;
    if (node.type === "brief") briefs.push(node.data);
    else if (node.type === "style") styles.push(node.data);
    else if (node.type === "layout") layouts.push(node.data);
    else if (node.type === "component") components.push(node.data);
    else if (
      (node.type === "generate" || node.type === "code") &&
      node.data.code.trim()
    ) {
      upstreamCode.push(node.data.code.slice(0, 6000));
    }
  }

  const self = byId.get(generateId);
  const format = self?.type === "generate" ? self.data.format : "html";
  return { briefs, styles, layouts, components, upstreamCode, format };
}

export function sortGenerates(
  ids: string[],
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const set = new Set(ids);
  const indegree = new Map(ids.map((id) => [id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!set.has(edge.source) || !set.has(edge.target)) continue;
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    ordered.push(current);
    for (const next of outgoing.get(current) ?? []) {
      const degree = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function nearestUpstream(
  id: string,
  type: NodeKind,
  nodes: AppNode[],
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const incoming = adjacency(edges, true);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const queue = [...(incoming.get(id) ?? [])];
  const seen = new Set<string>([id]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const node = byId.get(current);
    if (node?.type === type) return node;
    for (const next of incoming.get(current) ?? []) queue.push(next);
  }
  return undefined;
}

export function hasContext(context: GenerationContext) {
  return (
    context.briefs.length +
      context.styles.length +
      context.layouts.length +
      context.components.length +
      context.upstreamCode.length >
    0
  );
}
