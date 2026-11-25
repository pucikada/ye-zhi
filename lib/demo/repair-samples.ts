import type { DemoNode, DemoState, RefPin } from "./types";

const SAMPLE_IDS = ["cv-campaign", "cv-restyle", "cv-lib", "cv-member", "cv-qa"];

function emptyShell(state: DemoState, canvasId: string) {
  const canvas = state.canvases.find((item) => item.id === canvasId);
  if (!canvas) return true;
  const nodeIds = new Set(state.nodes.filter((node) => node.canvasId === canvasId).map((node) => node.id));
  if (nodeIds.size > 0) return false;
  if (state.edges.some((edge) => edge.canvasId === canvasId)) return false;
  if (state.comments.some((item) => nodeIds.has(item.nodeId))) return false;
  if (state.reminders.some((item) => nodeIds.has(item.nodeId))) return false;
  return true;
}

function usedIds(state: DemoState) {
  const ids = new Set<string>();
  for (const node of state.nodes) ids.add(node.id);
  for (const edge of state.edges) ids.add(edge.id);
  for (const comment of state.comments) ids.add(comment.id);
  for (const reminder of state.reminders) ids.add(reminder.id);
  return ids;
}

function claim(id: string, used: Set<string>, seq: { value: number }) {
  const match = /-(\d+)$/.exec(id);
  if (match) seq.value = Math.max(seq.value, Number(match[1]));
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let next = "";
  do {
    seq.value += 1;
    next = `node-${seq.value}`;
  } while (used.has(next));
  used.add(next);
  return next;
}

function mapPin(pin: RefPin, resolve: (id: string) => string): RefPin {
  return { ...pin, nodeId: resolve(pin.nodeId) };
}

function rewriteNode(node: DemoNode, idMap: Map<string, string>, resolve: (id: string) => string): DemoNode {
  const copy = structuredClone(node);
  copy.id = idMap.get(node.id) ?? node.id;
  if (copy.derivedFrom) copy.derivedFrom = { ...copy.derivedFrom, nodeId: resolve(copy.derivedFrom.nodeId) };
  if (copy.reference) copy.reference = { ...copy.reference, nodeId: resolve(copy.reference.nodeId) };
  copy.versions = copy.versions.map((version) => ({
    ...version,
    consumed: version.consumed.map((pin) => mapPin(pin, resolve)),
    associations: version.associations.map((pin) => mapPin(pin, resolve)),
  }));
  if (copy.job) copy.job = { ...copy.job, pinned: copy.job.pinned.map((pin) => mapPin(pin, resolve)) };
  return copy;
}

export function repairEmptySamples(state: DemoState, seed: DemoState): DemoState {
  const targets = seed.canvases.filter((canvas) => canvas.sample && SAMPLE_IDS.includes(canvas.id) && emptyShell(state, canvas.id));
  if (targets.length === 0) return state;
  const targetIds = new Set(targets.map((canvas) => canvas.id));
  const seedNodes = seed.nodes.filter((node) => targetIds.has(node.canvasId));
  const used = usedIds(state);
  const seq = { value: state.seq };
  const idMap = new Map<string, string>();
  for (const node of seedNodes) idMap.set(node.id, claim(node.id, used, seq));
  for (const edge of seed.edges) {
    if (targetIds.has(edge.canvasId)) idMap.set(edge.id, claim(edge.id, used, seq));
  }
  for (const comment of seed.comments) {
    if (idMap.has(comment.nodeId)) idMap.set(comment.id, claim(comment.id, used, seq));
  }
  for (const reminder of seed.reminders) {
    if (idMap.has(reminder.nodeId)) idMap.set(reminder.id, claim(reminder.id, used, seq));
  }

  const resolve = (id: string) => {
    const mapped = idMap.get(id);
    if (mapped) return mapped;
    if (state.nodes.some((node) => node.id === id)) return id;
    const source = seed.nodes.find((node) => node.id === id);
    if (!source) return id;
    const matches = state.nodes.filter(
      (node) => !node.archived && node.canvasId === source.canvasId && node.kind === source.kind && node.name === source.name,
    );
    return matches.length === 1 ? matches[0].id : id;
  };

  const nodes = seedNodes.map((node) => rewriteNode(node, idMap, resolve));
  const edges = seed.edges
    .filter((edge) => targetIds.has(edge.canvasId) && idMap.has(edge.source) && idMap.has(edge.target))
    .map((edge) => ({
      ...structuredClone(edge),
      id: idMap.get(edge.id) ?? edge.id,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));
  const comments = seed.comments
    .filter((comment) => idMap.has(comment.nodeId))
    .map((comment) => ({
      ...structuredClone(comment),
      id: idMap.get(comment.id) ?? comment.id,
      nodeId: idMap.get(comment.nodeId) ?? comment.nodeId,
    }));
  const reminders = seed.reminders
    .filter((reminder) => idMap.has(reminder.nodeId))
    .map((reminder) => ({
      ...structuredClone(reminder),
      id: idMap.get(reminder.id) ?? reminder.id,
      nodeId: idMap.get(reminder.nodeId) ?? reminder.nodeId,
    }));
  const testResults = { ...state.testResults };
  for (const [id, mapped] of idMap) {
    const result = seed.testResults[id];
    if (result) testResults[mapped] = structuredClone(result);
  }

  const projects = [...state.projects];
  let access = state.access;
  for (const canvas of targets) {
    const project = seed.projects.find((item) => item.id === canvas.projectId);
    if (project && !projects.some((item) => item.id === project.id)) {
      projects.push({ ...project });
      if (!access[project.id] && seed.access[project.id]) access = { ...access, [project.id]: [...seed.access[project.id]] };
    }
  }
  const canvases = state.canvases.map((canvas) => ({ ...canvas }));
  for (const canvas of targets) {
    if (canvases.some((item) => item.id === canvas.id)) continue;
    canvases.push({ id: canvas.id, projectId: canvas.projectId, name: canvas.name, sample: true });
  }

  return {
    ...state,
    seq: Math.max(state.seq, seq.value),
    projects,
    canvases,
    nodes: [...state.nodes, ...nodes],
    edges: [...state.edges, ...edges],
    comments: [...state.comments, ...comments],
    reminders: [...state.reminders, ...reminders],
    access,
    testResults,
  };
}
