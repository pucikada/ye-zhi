import {
  addNode,
  comment,
  connect,
  createReference,
  currentVersion,
  finishJob,
  remind,
  setTestResult,
  startJob,
  submitInstruction,
  uploadReport,
} from "./rules";
import type { DemoState, Outcome, RoleId } from "./types";

function apply(state: DemoState, outcome: Outcome) {
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.state;
}

function empty(): DemoState {
  const everyone: RoleId[] = ["pm", "be", "de", "fe", "qa"];
  return {
    seq: 40,
    specVersion: "规范 v1",
    specText: "按钮用品牌黄，文案用简体中文，间距用 8 的倍数。",
    projects: [
      { id: "p-campaign", name: "春日活动" },
      { id: "p-shop", name: "线上商城" },
      { id: "p-lib", name: "品牌资产" },
      { id: "p-member", name: "会员日" },
      { id: "p-release", name: "上线保障" },
    ],
    canvases: [
      { id: "cv-campaign", projectId: "p-campaign", name: "活动页", sample: true },
      { id: "cv-restyle", projectId: "p-shop", name: "首页换风格", sample: true },
      { id: "cv-lib", projectId: "p-lib", name: "组件库", sample: true },
      { id: "cv-member", projectId: "p-member", name: "会员日页面", sample: true },
      { id: "cv-qa", projectId: "p-release", name: "上线检查", sample: true },
    ],
    nodes: [],
    edges: [],
    comments: [],
    reminders: [],
    access: {
      "p-campaign": everyone,
      "p-shop": everyone,
      "p-lib": everyone,
      "p-member": [...everyone, "guest"],
      "p-release": everyone,
    },
    revoked: [],
    activeRole: "be",
    activeCanvasId: "cv-campaign",
    selectedNodeId: null,
    intentAsk: null,
    compareIds: [],
    testResults: {},
  };
}

function make(state: DemoState, canvasId: string, role: RoleId) {
  return { ...state, activeCanvasId: canvasId, activeRole: role };
}

function generate(state: DemoState, nodeId: string, instruction: string) {
  let next = apply(state, startJob(state, nodeId, instruction));
  next = apply(next, finishJob(next, nodeId, "2026-11-25T01:00:00.000Z"));
  return next;
}

function derive(state: DemoState, nodeId: string, instruction: string) {
  let next = apply(state, submitInstruction(state, nodeId, instruction));
  const created = next.selectedNodeId ?? "";
  if (next.nodes.find((node) => node.id === created)?.job?.status === "running") {
    next = apply(next, finishJob(next, created, "2026-11-25T02:00:00.000Z"));
  }
  return next;
}

export function createSeed(): DemoState {
  let state = empty();

  state = make(state, "cv-restyle", "de");
  state = apply(state, addNode(state, "doc", { x: 0, y: 40 }, "商城需求"));
  const shopDoc = state.selectedNodeId ?? "";
  state = generate(state, shopDoc, "微调：首页介绍当季活动和报名");
  state = apply(state, addNode(state, "design", { x: 340, y: 40 }, "设计稿 a"));
  const designA = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: shopDoc, target: designA }));
  state = generate(state, designA, "微调：春日绿底黄按钮");
  state = apply(state, addNode(state, "page", { x: 700, y: 40 }, "线上页面"));
  const livePage = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: designA, target: livePage }));
  state = generate(state, livePage, "生成线上页面");
  state = {
    ...state,
    nodes: state.nodes.map((node) => {
      if (node.id !== livePage) return node;
      return {
        ...node,
        online: true,
        versions: node.versions.map((version) =>
          version.version === currentVersion(node)?.version ? { ...version, visual: "accepted" } : version,
        ),
      };
    }),
  };
  state = derive(state, designA, "换成夜航配色");
  const designB = state.selectedNodeId ?? "";
  state = apply(state, addNode(state, "page", { x: 700, y: 280 }, "候选页面"));
  const candidate = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: designB, target: candidate }));
  state = generate(state, candidate, "微调：按新设计稿生成候选页");

  state = make(state, "cv-lib", "fe");
  state = apply(state, addNode(state, "component", { x: 40, y: 40 }, "活动倒计时"));
  const countdown = state.selectedNodeId ?? "";
  state = generate(state, countdown, "微调：可复用的活动倒计时组件");

  state = make(state, "cv-member", "fe");
  state = apply(state, createReference(state, countdown, 1));
  const card = state.selectedNodeId ?? "";
  state = apply(state, addNode(state, "page", { x: 420, y: 40 }, "会员日页面"));
  const memberPage = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: card, target: memberPage }));
  state = generate(state, memberPage, "微调：使用倒计时组件做会员日页");
  state = derive(state, card, "另做：把倒计时改成会员日配色");

  state = make(state, "cv-qa", "qa");
  state = apply(state, addNode(state, "doc", { x: 0, y: 30 }, "活动需求 v1"));
  const qaDoc = state.selectedNodeId ?? "";
  state = generate(state, qaDoc, "微调：春日活动报名，含正常、重复和结束");
  state = apply(state, addNode(state, "api", { x: 340, y: 30 }, "报名接口"));
  const qaApi = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: qaDoc, target: qaApi }));
  state = generate(state, qaApi, "按需求列接口");
  state = apply(state, addNode(state, "page", { x: 700, y: 30 }, "活动页"));
  const qaPage = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: qaApi, target: qaPage, itemId: "item-post-join" }));
  state = generate(state, qaPage, "汇合报名接口生成页面");
  state = apply(state, addNode(state, "testcase", { x: 340, y: 360 }, "回归用例"));
  const cases = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: qaDoc, target: cases }));
  state = apply(state, connect(state, { source: qaApi, target: cases, itemId: "item-post-join" }));
  state = generate(state, cases, "微调：覆盖正常、重复和结束");
  state = apply(state, setTestResult(state, cases, "item-dup", "fail", "同一用户第二次报名仍返回 200"));
  state = apply(state, uploadReport(state, cases, "人工执行 4 条，失败 1 条：重复报名。不是自动采集。"));
  state = derive(state, qaApi, "另做：重复报名返回 409");

  state = make(state, "cv-campaign", "pm");
  state = apply(state, addNode(state, "doc", { x: 0, y: 40 }, "活动需求"));
  const doc = state.selectedNodeId ?? "";
  state = generate(state, doc, "微调：春日活动报名页，面向独立开发者");
  state = apply(state, addNode(state, "api", { x: 360, y: 40 }, "报名接口"));
  const api = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: doc, target: api }));
  state = generate(state, api, "微调：按文档列接口");
  state = apply(state, addNode(state, "design", { x: 0, y: 340 }, "春日方案"));
  const design = state.selectedNodeId ?? "";
  state = generate(state, design, "微调：春日绿底和黄按钮");
  state = apply(state, addNode(state, "component", { x: 360, y: 340 }, "页面组件"));
  const component = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: design, target: component }));
  state = generate(state, component, "微调：识别轮播、图标和按钮");
  state = apply(state, addNode(state, "page", { x: 720, y: 180 }, "活动报名页"));
  const page = state.selectedNodeId ?? "";
  state = apply(state, connect(state, { source: api, target: page, itemId: "item-post-join" }));
  state = apply(state, connect(state, { source: design, target: page }));
  state = apply(state, connect(state, { source: component, target: page }));
  state = generate(state, page, "微调：汇合接口、设计和组件");
  state = apply(state, remind(state, api, ["fe"], "接口已整理，请对接页面"));
  state = apply(state, comment(state, doc, "报名对象先限定独立开发者。"));

  return { ...state, selectedNodeId: null };
}
