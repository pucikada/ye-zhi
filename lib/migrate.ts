import { nodeWidth } from "@/lib/catalog";
import { serializeBlocks } from "@/lib/blocks";
import { fillData, isNodeKind } from "@/lib/node-fields";
import type { AppNode, ComponentSpec, GraphEdge, NodeKind } from "@/lib/types";

const LEGACY = new Set(["layout", "component", "generate", "preview", "code"]);

type Raw = Record<string, unknown>;

function isRaw(value: unknown): value is Raw {
  return Boolean(value) && typeof value === "object";
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function positionOf(raw: Raw) {
  const position = isRaw(raw.position) ? raw.position : {};
  return {
    x: typeof position.x === "number" ? position.x : 0,
    y: typeof position.y === "number" ? position.y : 0,
  };
}

function make(kind: NodeKind, id: string, raw: Raw, data: unknown): AppNode {
  return {
    id,
    type: kind,
    position: positionOf(raw),
    selected: Boolean(raw.selected),
    style: { width: nodeWidth(kind) },
    data: fillData(kind, data),
  } as AppNode;
}

function componentBlock(raw: Raw): ComponentSpec {
  const data = isRaw(raw.data) ? raw.data : {};
  return {
    kind: text(data.kind) || "custom",
    name: text(data.name),
    spec: text(data.spec),
  };
}

function dedupeEdges(
  edges: Raw[],
  ids: Set<string>,
  idMap?: Map<string, string>,
): GraphEdge[] {
  const seen = new Set<string>();
  const next: GraphEdge[] = [];
  for (const edge of edges) {
    const sourceRaw = text(edge.source);
    const targetRaw = text(edge.target);
    const source = idMap?.get(sourceRaw) ?? sourceRaw;
    const target = idMap?.get(targetRaw) ?? targetRaw;
    if (!source || !target || source === target) continue;
    if (!ids.has(source) || !ids.has(target)) continue;
    const key = `${source}>${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({
      id: key,
      source,
      target,
      type: "flow",
    });
  }
  return next;
}

function migrateLegacy(nodes: Raw[], edges: Raw[]): { nodes: AppNode[]; edges: GraphEdge[] } {
  const idMap = new Map<string, string>();
  const next: AppNode[] = [];
  const layouts = nodes.filter((node) => node.type === "layout");
  const components = nodes.filter((node) => node.type === "component");
  const generates = nodes.filter((node) => node.type === "generate");
  const usedComponents = new Set<string>();

  for (const node of nodes) {
    if (node.type !== "brief" && node.type !== "style") continue;
    const id = text(node.id);
    if (!id) continue;
    idMap.set(id, id);
    next.push(make(node.type, id, node, node.data));
  }

  const targetGenerate = (id: string) =>
    edges.find(
      (edge) =>
        edge.source === id && generates.some((node) => node.id === edge.target),
    )?.target;

  for (const layout of layouts) {
    const layoutId = text(layout.id);
    if (!layoutId) continue;
    const genId = targetGenerate(layoutId);
    const related = components.filter((node) => {
      const id = text(node.id);
      if (!id || usedComponents.has(id)) return false;
      const toLayout = edges.some((edge) => edge.source === id && edge.target === layoutId);
      const toGen = genId ? targetGenerate(id) === genId : false;
      return toLayout || toGen;
    });
    for (const node of related) usedComponents.add(text(node.id));
    const frameworkId = `framework-${layoutId}`;
    idMap.set(layoutId, frameworkId);
    for (const node of related) idMap.set(text(node.id), frameworkId);
    const data = isRaw(layout.data) ? layout.data : {};
    next.push(
      make("framework", frameworkId, layout, {
        stack: "html",
        structure: text(data.structure) || "landing",
        sections: Array.isArray(data.sections) ? data.sections : [],
        components: serializeBlocks(related.map(componentBlock)),
        notes: text(data.notes),
      }),
    );
  }

  const leftover = components.filter((node) => !usedComponents.has(text(node.id)));
  if (leftover.length > 0) {
    const anchor = leftover[0];
    if (anchor) {
      const frameworkId = "framework-migrated";
      for (const node of leftover) idMap.set(text(node.id), frameworkId);
      next.push(
        make("framework", frameworkId, anchor, {
          stack: "html",
          structure: "custom",
          sections: ["nav", "hero", "features", "cta", "footer"],
          components: serializeBlocks(leftover.map(componentBlock)),
          notes: "",
        }),
      );
    }
  }

  for (const generate of generates) {
    const id = text(generate.id);
    if (!id) continue;
    const data = isRaw(generate.data) ? generate.data : {};
    const codeNode = nodes.find(
      (node) =>
        node.type === "code" &&
        edges.some((edge) => edge.source === id && edge.target === node.id),
    );
    const codeData = codeNode && isRaw(codeNode.data) ? codeNode.data : {};
    const preview = nodes.find((node) => {
      if (node.type !== "preview") return false;
      return edges.some(
        (edge) =>
          edge.target === node.id &&
          (edge.source === id || edge.source === codeNode?.id),
      );
    });
    const previewData = preview && isRaw(preview.data) ? preview.data : {};
    const code =
      (codeData.edited ? text(codeData.code) : "") ||
      text(data.code) ||
      text(previewData.code);
    idMap.set(id, id);
    next.push(
      make("page", id, generate, {
        format: data.format === "react" ? "react" : "html",
        model: text(data.model),
        status: code ? "done" : "idle",
        source: data.source === "model" || data.source === "local" ? data.source : code ? "local" : "",
        warning: "",
        code,
        themeCss: text(data.themeCss),
        device:
          previewData.device === "mobile" || previewData.device === "tablet"
            ? previewData.device
            : "desktop",
        edited: Boolean(codeData.edited),
      }),
    );
  }

  const ids = new Set(next.map((node) => node.id));
  return { nodes: next, edges: dedupeEdges(edges, ids, idMap) };
}

export function normalizeGraph(nodes: unknown, edges: unknown) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
  const rawNodes = nodes.filter(isRaw);
  const rawEdges = edges.filter(isRaw);
  if (rawNodes.some((node) => LEGACY.has(String(node.type)))) {
    const migrated = migrateLegacy(rawNodes, rawEdges);
    if (rawNodes.length > 0 && migrated.nodes.length === 0) return null;
    return migrated;
  }
  const nextNodes = rawNodes.flatMap((node) => {
    if (!isNodeKind(node.type)) return [];
    const id = text(node.id);
    if (!id) return [];
    return [make(node.type, id, node, node.data)];
  });
  if (rawNodes.length > 0 && nextNodes.length === 0) return null;
  const ids = new Set(nextNodes.map((node) => node.id));
  return { nodes: nextNodes, edges: dedupeEdges(rawEdges, ids) };
}
