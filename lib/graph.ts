import type { AppNode, GenerationContext, GraphEdge, NodeKind } from "@/lib/types";

export function canConnect(source: NodeKind, target: NodeKind) {
  return Boolean(source && target);
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
  pageId: string,
  nodes: AppNode[],
  edges: Array<Pick<GraphEdge, "source" | "target">>,
): GenerationContext {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const briefs: GenerationContext["briefs"] = [];
  const styles: GenerationContext["styles"] = [];
  const frameworks: GenerationContext["frameworks"] = [];
  const motions: GenerationContext["motions"] = [];
  const datasets: GenerationContext["datasets"] = [];

  for (const id of upstreamIds(pageId, edges)) {
    const node = byId.get(id);
    if (!node) continue;
    if (node.type === "brief") briefs.push(node.data);
    else if (node.type === "style") styles.push(node.data);
    else if (node.type === "framework") frameworks.push(node.data);
    else if (node.type === "motion") motions.push(node.data);
    else if (node.type === "data") datasets.push(node.data);
  }

  const self = byId.get(pageId);
  const format = self?.type === "page" ? self.data.format : "html";
  return { briefs, styles, frameworks, motions, datasets, format };
}

export function pageSinks(
  startId: string,
  nodes: AppNode[],
  edges: Array<Pick<GraphEdge, "source" | "target">>,
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [startId, ...downstreamIds(startId, edges)].filter(
    (id) => byId.get(id)?.type === "page",
  );
}

export function sortPages(
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

export function hasContext(context: GenerationContext) {
  return (
    context.briefs.length +
      context.styles.length +
      context.frameworks.length +
      context.motions.length +
      context.datasets.length >
    0
  );
}
