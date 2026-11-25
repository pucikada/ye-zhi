"use client";

import { create } from "zustand";

import { restoreCanvasHistory, type CanvasSnap } from "./history";
import { normalizeWorkspace } from "./persist";
import { createSeed } from "./seed";
import {
  acquireLock,
  addNode,
  archiveNode,
  bumpVersion,
  cancelJob,
  comment,
  canAccess,
  connect,
  createCanvas,
  createProject,
  createReference,
  deleteCanvas,
  deleteEdge,
  deleteNode,
  dismissStopped,
  failJob,
  finishJob,
  handleReminder,
  moveNode,
  publishSpec,
  releaseLock,
  remind,
  removeItem,
  renameCanvas,
  renameItem,
  renameNode,
  resetSamples,
  resolveIntent,
  restoreAccess,
  retryStopped,
  revokeAccess,
  selectNode,
  setCanvas,
  setFormatCheck,
  setRole,
  setTestResult,
  setVisual,
  submitInstruction,
  toggleCompare,
  uploadReport,
} from "./rules";
import type { DemoState, NodeKind, Outcome, RoleId } from "./types";

const KEY = "yezhi.workspace.v1";
const LEGACY_KEY = "yezhi.demo.v1";

type DemoStore = DemoState & {
  hydrated: boolean;
  toast: string;
  hydrate: () => void;
  resetExamples: () => void;
  openCanvas: (canvasId: string) => void;
  createProject: (name: string) => void;
  createCanvas: (projectId: string, name: string) => void;
  renameCanvas: (canvasId: string, name: string) => void;
  deleteCanvas: (canvasId: string) => void;
  run: (outcome: Outcome) => void;
  add: (kind: NodeKind, position: { x: number; y: number }) => void;
  move: (id: string, position: { x: number; y: number }) => void;
  select: (id: string | null) => void;
  chooseRole: (role: RoleId) => void;
  link: (source: string, target: string, itemId?: string) => void;
  unlink: (edgeId: string) => void;
  instruct: (nodeId: string, text: string) => void;
  chooseIntent: (choice: "version" | "derive") => void;
  cancel: (nodeId: string) => void;
  simulateFail: (nodeId: string) => void;
  simulateBump: (nodeId: string) => void;
  retry: (nodeId: string) => void;
  dismiss: (nodeId: string) => void;
  sendReminder: (nodeId: string, to: RoleId[], text: string) => void;
  settleReminder: (id: string, note: string) => void;
  note: (nodeId: string, text: string) => void;
  lock: (nodeId: string) => void;
  unlock: (nodeId: string) => void;
  rename: (nodeId: string, name: string) => void;
  renameEntry: (nodeId: string, itemId: string, name: string) => void;
  dropEntry: (nodeId: string, itemId: string) => void;
  cite: (nodeId: string, version: number) => void;
  archive: (nodeId: string) => void;
  remove: (nodeId: string) => void;
  recordTest: (nodeId: string, itemId: string, status: "pass" | "fail" | "pending", note: string) => void;
  report: (nodeId: string, text: string) => void;
  visual: (nodeId: string, value: "accepted" | "rejected") => void;
  formatCheck: (nodeId: string, value: "pass" | "fail") => void;
  spec: (version: string, text: string) => void;
  revoke: (roleId: RoleId, projectId: string) => void;
  restore: (roleId: RoleId, projectId: string) => void;
    compare: (nodeId: string) => void;
    focus: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const past: CanvasSnap[] = [];
const future: CanvasSnap[] = [];

function rememberSnap() {
  const current = useDemo.getState();
  past.push({ nodes: current.nodes, edges: current.edges, selectedNodeId: current.selectedNodeId });
  if (past.length > 50) past.shift();
  future.length = 0;
}

function syncTimers(nodes: DemoState["nodes"]) {
  for (const [id, timer] of timers) {
    const node = nodes.find((item) => item.id === id);
    if (node?.job?.status !== "running") {
      clearTimeout(timer);
      timers.delete(id);
    }
  }
}

function schedule(nodeId: string) {
  const existing = timers.get(nodeId);
  if (existing) clearTimeout(existing);
  timers.set(
    nodeId,
    setTimeout(() => {
      timers.delete(nodeId);
      const current = useDemo.getState();
      const outcome = finishJob(current, nodeId, new Date().toISOString());
      if (!outcome.ok) {
        useDemo.setState({ toast: outcome.message });
        return;
      }
      useDemo.setState({ ...outcome.state, toast: outcome.message, hydrated: true });
    }, 700),
  );
}

export const useDemo = create<DemoStore>((set, get) => {
  const seed = createSeed();
  function run(outcome: Outcome) {
    if (!outcome.ok) {
      set({ toast: outcome.message });
      return;
    }
    rememberSnap();
    set({ ...outcome.state, toast: outcome.message, hydrated: true });
    if (outcome.jobNodeId) schedule(outcome.jobNodeId);
  }

  return {
    ...seed,
    hydrated: false,
    toast: "",
    hydrate: () => {
      if (get().hydrated) return;
      const stored = readStored(KEY) ?? readStored(LEGACY_KEY);
      if (stored) {
        set({ ...stored, hydrated: true, toast: "" });
        return;
      }
      set({ ...createSeed(), hydrated: true, toast: "" });
    },
    resetExamples: () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      const current = get();
      set({ ...resetSamples(current, createSeed()), hydrated: true, toast: "示例画布已恢复，你新建的项目和画布还在" });
    },
    openCanvas: (canvasId) => {
      const current = get();
      const canvas = current.canvases.find((item) => item.id === canvasId);
      if (!canvas) return;
      if (!canAccess(current, current.activeRole, canvas.projectId)) {
        set({ toast: "你不能打开这个项目" });
        return;
      }
      set({ ...setCanvas(current, canvasId), toast: "" });
    },
    createProject: (name) => run(createProject(get(), name)),
    createCanvas: (projectId, name) => run(createCanvas(get(), projectId, name)),
    renameCanvas: (canvasId, name) => run(renameCanvas(get(), canvasId, name)),
    deleteCanvas: (canvasId) => run(deleteCanvas(get(), canvasId)),
    run,
    add: (kind, position) => run(addNode(get(), kind, position)),
    move: (id, position) => {
      const current = get();
      const node = current.nodes.find((item) => item.id === id);
      if (!node || (node.position.x === position.x && node.position.y === position.y)) return;
      rememberSnap();
      set(moveNode(current, id, position));
    },
    undo: () => {
      const snap = past.pop();
      if (!snap) return;
      const current = get();
      future.push({ nodes: current.nodes, edges: current.edges, selectedNodeId: current.selectedNodeId });
      const restored = restoreCanvasHistory(current, snap);
      syncTimers(restored.nodes);
      set({ ...restored, toast: "已撤销" });
    },
    redo: () => {
      const snap = future.pop();
      if (!snap) return;
      const current = get();
      past.push({ nodes: current.nodes, edges: current.edges, selectedNodeId: current.selectedNodeId });
      const restored = restoreCanvasHistory(current, snap);
      syncTimers(restored.nodes);
      set({ ...restored, toast: "已重做" });
    },
    select: (id) => set(selectNode(get(), id)),
    chooseRole: (role) => {
      const next = setRole(get(), role);
      const canvas = next.canvases.find((item) => item.id === next.activeCanvasId);
      if (canvas && !canAccess(next, role, canvas.projectId)) {
        const fallback = next.canvases.find((item) => canAccess(next, role, item.projectId));
        set({
          ...(fallback ? setCanvas(next, fallback.id) : next),
          toast: "已切换身份。原来的画布不在这个身份能打开的项目里。",
        });
        return;
      }
      set({ ...next, toast: "" });
    },
    link: (source, target, itemId) => run(connect(get(), { source, target, itemId })),
    unlink: (edgeId) => run(deleteEdge(get(), edgeId)),
    instruct: (nodeId, text) => run(submitInstruction(get(), nodeId, text)),
    chooseIntent: (choice) => run(resolveIntent(get(), choice)),
    cancel: (nodeId) => {
      const timer = timers.get(nodeId);
      if (timer) clearTimeout(timer);
      timers.delete(nodeId);
      run(cancelJob(get(), nodeId));
    },
    simulateFail: (nodeId) => {
      const timer = timers.get(nodeId);
      if (timer) clearTimeout(timer);
      timers.delete(nodeId);
      run(failJob(get(), nodeId));
    },
    simulateBump: (nodeId) => run(bumpVersion(get(), nodeId)),
    retry: (nodeId) => run(retryStopped(get(), nodeId)),
    dismiss: (nodeId) => run(dismissStopped(get(), nodeId)),
    sendReminder: (nodeId, to, text) => run(remind(get(), nodeId, to, text)),
    settleReminder: (id, note) => run(handleReminder(get(), id, note)),
    note: (nodeId, text) => run(comment(get(), nodeId, text)),
    lock: (nodeId) => run(acquireLock(get(), nodeId)),
    unlock: (nodeId) => run(releaseLock(get(), nodeId)),
    rename: (nodeId, name) => run(renameNode(get(), nodeId, name)),
    renameEntry: (nodeId, itemId, name) => run(renameItem(get(), nodeId, itemId, name)),
    dropEntry: (nodeId, itemId) => run(removeItem(get(), nodeId, itemId)),
    cite: (nodeId, version) => run(createReference(get(), nodeId, version)),
    archive: (nodeId) => run(archiveNode(get(), nodeId)),
    remove: (nodeId) => run(deleteNode(get(), nodeId)),
    recordTest: (nodeId, itemId, status, note) => run(setTestResult(get(), nodeId, itemId, status, note)),
    report: (nodeId, text) => run(uploadReport(get(), nodeId, text)),
    visual: (nodeId, value) => run(setVisual(get(), nodeId, value)),
    formatCheck: (nodeId, value) => run(setFormatCheck(get(), nodeId, value)),
    spec: (version, text) => run(publishSpec(get(), version, text)),
    revoke: (roleId, projectId) => run(revokeAccess(get(), roleId, projectId)),
    restore: (roleId, projectId) => run(restoreAccess(get(), roleId, projectId)),
    compare: (nodeId) => set(toggleCompare(get(), nodeId)),
    focus: (nodeId) => {
      const current = get();
      const node = current.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      if (!canAccess(current, current.activeRole, node.projectId)) {
        set({ toast: "无权访问这个资产" });
        return;
      }
      set({ ...setCanvas(current, node.canvasId), selectedNodeId: node.id, toast: "" });
    },
  };
});

function workspaceSnapshot(state: DemoStore): DemoState {
  return {
    seq: state.seq,
    specVersion: state.specVersion,
    specText: state.specText,
    projects: state.projects,
    canvases: state.canvases,
    nodes: state.nodes,
    edges: state.edges,
    comments: state.comments,
    reminders: state.reminders,
    access: state.access,
    revoked: state.revoked,
    activeRole: state.activeRole,
    activeCanvasId: state.activeCanvasId,
    selectedNodeId: state.selectedNodeId,
    intentAsk: state.intentAsk,
    compareIds: state.compareIds,
    testResults: state.testResults,
  };
}

function writeWorkspace(state: DemoStore) {
  if (!state.hydrated || typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(workspaceSnapshot(state)));
}

if (typeof window !== "undefined") {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useDemo.subscribe((state, previous) => {
    if (!state.hydrated) return;
    if (
      state.nodes === previous.nodes &&
      state.edges === previous.edges &&
      state.projects === previous.projects &&
      state.canvases === previous.canvases &&
      state.activeCanvasId === previous.activeCanvasId &&
      state.selectedNodeId === previous.selectedNodeId &&
      state.activeRole === previous.activeRole &&
      state.specVersion === previous.specVersion &&
      state.specText === previous.specText &&
      state.reminders === previous.reminders &&
      state.comments === previous.comments &&
      state.revoked === previous.revoked &&
      state.testResults === previous.testResults &&
      state.access === previous.access
    ) {
      return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => writeWorkspace(useDemo.getState()), 400);
  });
  window.addEventListener("pagehide", () => writeWorkspace(useDemo.getState()));
}

function readStored(key: string): DemoState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeWorkspace(JSON.parse(raw));
  } catch {
    return null;
  }
}
