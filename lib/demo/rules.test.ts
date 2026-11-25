import assert from "node:assert/strict";
import test from "node:test";

import { classifyIntent } from "./mock-content";
import { normalizeWorkspace } from "./persist";
import { createSeed } from "./seed";
import {
  acquireLock,
  addNode,
  instructionGate,
  archiveNode,
  bumpVersion,
  cancelJob,
  connect,
  createCanvas,
  createReference,
  currentVersion,
  deleteCanvas,
  deleteEdge,
  deleteNode,
  failJob,
  finishJob,
  handleReminder,
  itemRefStatus,
  nodeById,
  publishSpec,
  remind,
  releaseLock,
  removeItem,
  renameItem,
  resetSamples,
  resolveIntent,
  revokeAccess,
  setRole,
  startJob,
  submitInstruction,
} from "./rules";
import type { DemoState, Outcome, RoleId } from "./types";

function blank(): DemoState {
  const roles: RoleId[] = ["pm", "be", "de", "fe", "qa", "guest"];
  return {
    seq: 10,
    specVersion: "规范 v1",
    specText: "用简体中文",
    projects: [
      { id: "p", name: "项目" },
      { id: "lib", name: "资产库" },
    ],
    canvases: [
      { id: "c", projectId: "p", name: "画布", sample: false },
      { id: "lib-c", projectId: "lib", name: "库", sample: false },
    ],
    nodes: [],
    edges: [],
    comments: [],
    reminders: [],
    access: { p: roles, lib: ["fe", "de"] },
    revoked: [],
    activeRole: "be",
    activeCanvasId: "c",
    selectedNodeId: null,
    intentAsk: null,
    compareIds: [],
    testResults: {},
  };
}

function done(outcome: Outcome) {
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.state;
}

function idOf(state: DemoState, name: string) {
  const node = state.nodes.find((item) => item.name === name);
  assert.ok(node, name);
  return node.id;
}

test("连线、失败和取消都不冻结，成功消费才冻结", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(startJob(state, docId, "微调活动报名"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  assert.equal(nodeById(state, docId)?.frozen, false);

  state = done(addNode(state, "api", { x: 200, y: 0 }, "接口"));
  const apiId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: docId, target: apiId }));
  assert.equal(nodeById(state, docId)?.frozen, false);

  state = done(startJob(state, apiId, "生成接口"));
  state = done(cancelJob(state, apiId));
  assert.equal(nodeById(state, docId)?.frozen, false);

  state = done(startJob(state, apiId, "生成接口"));
  state = done(failJob(state, apiId));
  assert.equal(nodeById(state, docId)?.frozen, false);

  state = done(startJob(state, apiId, "生成接口"));
  state = done(finishJob(state, apiId, "2026-11-25T00:01:00.000Z"));
  assert.equal(nodeById(state, docId)?.frozen, true);
  assert.equal(currentVersion(nodeById(state, apiId)!)?.items.length, 3);

  const edgeId = state.edges[0]?.id ?? "";
  state = done(deleteEdge(state, edgeId));
  assert.equal(nodeById(state, docId)?.frozen, true);
  assert.equal(deleteNode(state, docId).ok, false);
  assert.equal(archiveNode(state, docId).ok, true);
});

test("页面代码产出即冻结，检查失败不撤销", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(startJob(state, docId, "微调需求"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  state = done(addNode(state, "page", { x: 300, y: 0 }, "活动页"));
  const pageId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: docId, target: pageId }));
  state = done(startJob(state, pageId, "生成页面"));
  state = done(finishJob(state, pageId, "2026-11-25T00:02:00.000Z"));
  const page = nodeById(state, pageId);
  assert.equal(nodeById(state, docId)?.frozen, true);
  assert.equal(currentVersion(page!)?.checks?.format, "fail");
  assert.equal(currentVersion(page!)?.checks?.build, "pass");
  assert.match(currentVersion(page!)?.html ?? "", /北窗/);
  assert.equal(page?.frozen, false);
});

test("冻结后修改必须派生，派生继承上游且没有下游", () => {
  let state = done(addNode(blank(), "design", { x: 0, y: 0 }, "稿 a"));
  const designId = state.selectedNodeId ?? "";
  state = done(addNode(state, "doc", { x: -200, y: 0 }, "需求"));
  const docId = idOf(state, "需求");
  state = done(startJob(state, docId, "微调需求"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  state = done(connect(state, { source: docId, target: designId }));
  state = done(startJob(state, designId, "微调春日"));
  state = done(finishJob(state, designId, "2026-11-25T00:03:00.000Z"));
  state = done(addNode(state, "page", { x: 400, y: 0 }, "线上页"));
  const pageId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: designId, target: pageId }));
  state = done(startJob(state, pageId, "生成页面"));
  state = done(finishJob(state, pageId, "2026-11-25T00:04:00.000Z"));
  assert.equal(nodeById(state, designId)?.frozen, true);

  const beforeEdges = state.edges.length;
  const derived = submitInstruction(state, designId, "换成夜航配色");
  state = done(derived);
  const created = nodeById(state, state.selectedNodeId ?? "");
  assert.ok(created);
  assert.notEqual(created?.id, designId);
  assert.equal(created?.derivedFrom?.nodeId, designId);
  assert.equal(created?.frozen, false);
  assert.equal(state.edges.some((edge) => edge.source === created?.id), false);
  assert.equal(state.edges.some((edge) => edge.target === created?.id && edge.source === docId), true);
  assert.equal(nodeById(state, designId)?.name, "稿 a");
  assert.ok(state.edges.length >= beforeEdges);
  assert.equal(nodeById(state, pageId)?.online, false);
});

test("成环会被拒绝", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(startJob(state, docId, "微调"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  state = done(addNode(state, "design", { x: 100, y: 0 }, "稿"));
  const designId = state.selectedNodeId ?? "";
  state = done(startJob(state, designId, "微调初稿"));
  state = done(finishJob(state, designId, "2026-11-25T00:01:00.000Z"));
  state = done(connect(state, { source: docId, target: designId }));
  const loop = connect(state, { source: designId, target: docId });
  assert.equal(loop.ok, false);
  if (!loop.ok) assert.match(loop.message, /成环/);
});

test("生成中上游更新会停止作业且不冻结", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(startJob(state, docId, "微调"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  state = done(addNode(state, "api", { x: 100, y: 0 }, "接口"));
  const apiId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: docId, target: apiId }));
  state = done(startJob(state, apiId, "生成接口"));
  state = done(bumpVersion(state, docId));
  assert.equal(nodeById(state, apiId)?.job?.status, "stopped");
  assert.equal(nodeById(state, docId)?.frozen, false);
  const stopped = finishJob(state, apiId, "2026-11-25T00:02:00.000Z");
  assert.equal(stopped.ok, false);
});

test("项改名保留引用，删除后失效且不模糊匹配", () => {
  let state = done(addNode(blank(), "api", { x: 0, y: 0 }, "接口"));
  const apiId = state.selectedNodeId ?? "";
  state = done(startJob(state, apiId, "生成"));
  state = done(finishJob(state, apiId, "2026-11-25T00:00:00.000Z"));
  state = done(renameItem(state, apiId, "item-post-join", "POST /enrol"));
  const version = currentVersion(nodeById(state, apiId)!);
  assert.equal(version?.items.find((item) => item.id === "item-post-join")?.name, "POST /enrol");
  state = done(addNode(state, "page", { x: 200, y: 0 }, "页面"));
  const pageId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: apiId, target: pageId, itemId: "item-post-join" }));
  assert.equal(state.edges[0]?.itemId, "item-post-join");
  state = done(removeItem(state, apiId, "item-post-join"));
  const status = itemRefStatus(state, {
    nodeId: apiId,
    version: version?.version ?? 1,
    itemId: "item-post-join",
  });
  assert.equal(status.ok, false);
  if (!status.ok) assert.equal(status.reason, "引用已失效");
  const fuzzy = connect(state, { source: apiId, target: pageId, itemId: "item-get-campaign" });
  assert.equal(fuzzy.ok, true);
});

test("规范版本写在生成上，更新不改历史", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(startJob(state, docId, "微调"));
  state = done(finishJob(state, docId, "2026-11-25T00:00:00.000Z"));
  assert.equal(currentVersion(nodeById(state, docId)!)?.specVersion, "规范 v1");
  state = done(publishSpec(state, "规范 v2", "新规范"));
  assert.equal(currentVersion(nodeById(state, docId)!)?.specVersion, "规范 v1");
  assert.equal(state.nodes.length, 1);
});

test("意图含糊先问，明确词才执行", () => {
  assert.equal(classifyIntent("再活泼一点"), "ask");
  assert.equal(classifyIntent("微调标题"), "version");
  assert.equal(classifyIntent("另做一版"), "derive");
  let state = done(addNode(blank(), "design", { x: 0, y: 0 }, "稿"));
  const id = state.selectedNodeId ?? "";
  state = done(startJob(state, id, "微调初稿"));
  state = done(finishJob(state, id, "2026-11-25T00:00:00.000Z"));
  const asked = submitInstruction(state, id, "再活泼一点");
  state = done(asked);
  assert.ok(state.intentAsk);
  state = done(resolveIntent(state, "version"));
  assert.equal(nodeById(state, id)?.job?.status, "running");
});

test("提醒按人处理，编辑锁只锁当前节点", () => {
  let state = done(addNode(blank(), "doc", { x: 0, y: 0 }, "需求"));
  const docId = state.selectedNodeId ?? "";
  state = done(remind(state, docId, ["fe", "qa"], "请看接口"));
  assert.equal(state.reminders.length, 2);
  state = setRole(state, "fe");
  state = done(handleReminder(state, state.reminders.find((item) => item.to === "fe")?.id ?? "", "已对接"));
  assert.equal(state.reminders.find((item) => item.to === "qa")?.handled, false);
  state = setRole(state, "be");
  state = done(acquireLock(state, docId));
  state = setRole(state, "fe");
  assert.equal(acquireLock(state, docId).ok, false);
  state = done(addNode(state, "page", { x: 100, y: 0 }, "另一页"));
  const pageId = state.selectedNodeId ?? "";
  assert.equal(startJob(state, pageId, "微调空页面").ok, true);
});

test("无权限和编辑占用不能提交，冻结提交只派生", () => {
  let state = done(addNode(blank(), "design", { x: 0, y: 0 }, "稿 a"));
  const designId = state.selectedNodeId ?? "";
  state = done(startJob(state, designId, "微调初稿"));
  state = done(finishJob(state, designId, "2026-11-25T00:00:00.000Z"));
  state = done(acquireLock(state, designId));
  state = setRole(state, "fe");
  const locked = submitInstruction(state, designId, "微调标题");
  assert.equal(locked.ok, false);
  if (!locked.ok) assert.match(locked.message, /正在编辑/);
  assert.equal(instructionGate(state, designId).enabled, false);
  state = setRole(state, "be");
  state = done(releaseLock(state, designId));
  state = { ...state, access: { ...state.access, p: ["be"] } };
  state = setRole(state, "guest");
  const denied = submitInstruction(state, designId, "微调标题");
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.match(denied.message, /只能看/);
  state = setRole(state, "be");
  state = done(addNode(state, "page", { x: 300, y: 0 }, "线上页"));
  const pageId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: designId, target: pageId }));
  state = done(startJob(state, pageId, "生成页面"));
  state = done(finishJob(state, pageId, "2026-11-25T00:02:00.000Z"));
  assert.equal(nodeById(state, designId)?.frozen, true);
  const name = nodeById(state, designId)?.name;
  const derived = submitInstruction(state, designId, "微调标题");
  state = done(derived);
  const created = nodeById(state, state.selectedNodeId ?? "");
  assert.notEqual(created?.id, designId);
  assert.equal(created?.derivedFrom?.nodeId, designId);
  assert.equal(nodeById(state, designId)?.name, name);
  assert.equal(nodeById(state, designId)?.frozen, true);
});

test("撤权后不能读取或再生成，已有产物还在", () => {
  let state = setRole(blank(), "fe");
  state = { ...state, activeCanvasId: "lib-c" };
  state = done(addNode(state, "component", { x: 0, y: 0 }, "倒计时"));
  const sourceId = state.selectedNodeId ?? "";
  state = done(startJob(state, sourceId, "微调组件"));
  state = done(finishJob(state, sourceId, "2026-11-25T00:00:00.000Z"));
  state = { ...state, activeCanvasId: "c" };
  state = done(createReference(state, sourceId, 1));
  const cardId = state.selectedNodeId ?? "";
  state = done(addNode(state, "page", { x: 200, y: 0 }, "会员页"));
  const pageId = state.selectedNodeId ?? "";
  state = done(connect(state, { source: cardId, target: pageId }));
  state = done(startJob(state, pageId, "生成页面"));
  state = done(finishJob(state, pageId, "2026-11-25T00:01:00.000Z"));
  const html = currentVersion(nodeById(state, pageId)!)?.html ?? "";
  state = done(revokeAccess(state, "fe", "lib"));
  assert.match(html, /模拟/);
  assert.equal(startJob(state, cardId, "再生成").ok, false);
  const again = connect(state, { source: cardId, target: pageId });
  assert.equal(again.ok, false);
});

test("重置示例保留用户新建的画布", () => {
  let state = createSeed();
  const created = createCanvas(state, "p-campaign", "我的草稿");
  state = done(created);
  const canvasId = state.activeCanvasId;
  state = done(addNode(state, "doc", { x: 12, y: 12 }, "我的文档"));
  const nodeId = state.selectedNodeId ?? "";
  state = done(submitInstruction(state, nodeId, "微调：只属于我的文档"));
  const sampleCount = createSeed().nodes.filter((node) => node.canvasId === "cv-campaign").length;
  const reset = resetSamples(state, createSeed());
  assert.equal(reset.canvases.find((canvas) => canvas.id === canvasId)?.sample, false);
  assert.equal(reset.nodes.some((node) => node.id === nodeId && node.name === "我的文档"), true);
  assert.equal(reset.nodes.filter((node) => node.canvasId === "cv-campaign").length, sampleCount);
  assert.equal(deleteCanvas(reset, "cv-campaign").ok, false);
});

test("旧画布记录会标成示例，新建画布不会", () => {
  const legacy = normalizeWorkspace({
    ...blank(),
    canvases: [
      { id: "cv-campaign", projectId: "p", name: "活动页", scenario: "campaign" },
      { id: "canvas-user", projectId: "p", name: "草稿", sample: false },
    ],
  });
  assert.equal(legacy?.canvases.find((canvas) => canvas.id === "cv-campaign")?.sample, true);
  assert.equal(legacy?.canvases.find((canvas) => canvas.id === "canvas-user")?.sample, false);
  assert.equal(normalizeWorkspace({ nodes: [] }), null);
});
