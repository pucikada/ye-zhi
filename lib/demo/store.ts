"use client";

import { create } from "zustand";

import { SCENARIOS, createSeed } from "./seed";
import {
  acquireLock,
  addNode,
  archiveNode,
  bumpVersion,
  cancelJob,
  comment,
  connect,
  createReference,
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
  renameItem,
  renameNode,
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

const KEY = "yezhi.demo.v1";

type DemoStore = DemoState & {
  hydrated: boolean;
  toast: string;
  hydrate: () => void;
  reset: () => void;
  openScenario: (canvasId: string, role: RoleId) => void;
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
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();

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
    set({ ...outcome.state, toast: outcome.message, hydrated: true });
    if (outcome.jobNodeId) schedule(outcome.jobNodeId);
  }

  return {
    ...seed,
    hydrated: false,
    toast: "",
    hydrate: () => {
      if (get().hydrated) return;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DemoState;
          if (parsed?.nodes && parsed.canvases) {
            set({ ...parsed, hydrated: true, toast: "" });
            return;
          }
        }
      } catch {
        /* use seed */
      }
      set({ ...createSeed(), hydrated: true, toast: "" });
    },
    reset: () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      localStorage.removeItem(KEY);
      set({ ...createSeed(), hydrated: true, toast: "演示已重置" });
    },
    openScenario: (canvasId, role) => set({ ...setCanvas(setRole(get(), role), canvasId), toast: "" }),
    run,
    add: (kind, position) => run(addNode(get(), kind, position)),
    move: (id, position) => set(moveNode(get(), id, position)),
    select: (id) => set(selectNode(get(), id)),
    chooseRole: (role) => set(setRole(get(), role)),
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
  };
});

if (typeof window !== "undefined") {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useDemo.subscribe((state, previous) => {
    if (!state.hydrated) return;
    if (state.nodes === previous.nodes && state.edges === previous.edges && state.toast === previous.toast) {
      const same =
        state.reminders === previous.reminders &&
        state.comments === previous.comments &&
        state.activeRole === previous.activeRole &&
        state.specVersion === previous.specVersion &&
        state.revoked === previous.revoked &&
        state.testResults === previous.testResults;
      if (same) return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const current = useDemo.getState();
      const { hydrated: _hydrated, toast: _toast, ...data } = current;
      void _hydrated;
      void _toast;
      const persist: DemoState = {
        seq: data.seq,
        specVersion: data.specVersion,
        specText: data.specText,
        projects: data.projects,
        canvases: data.canvases,
        nodes: data.nodes,
        edges: data.edges,
        comments: data.comments,
        reminders: data.reminders,
        access: data.access,
        revoked: data.revoked,
        activeRole: data.activeRole,
        activeCanvasId: data.activeCanvasId,
        selectedNodeId: data.selectedNodeId,
        intentAsk: data.intentAsk,
        compareIds: data.compareIds,
        testResults: data.testResults,
      };
      localStorage.setItem(KEY, JSON.stringify(persist));
    }, 200);
  });
}

export { SCENARIOS };
