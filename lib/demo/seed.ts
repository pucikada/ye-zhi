import { addNode, connect, currentVersion, finishJob, startJob } from "./rules";
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
      { id: "cv-campaign", projectId: "p-campaign", name: "活动页", scenario: "campaign" },
      { id: "cv-restyle", projectId: "p-shop", name: "首页换风格", scenario: "restyle" },
      { id: "cv-lib", projectId: "p-lib", name: "组件库", scenario: "reuse" },
      { id: "cv-member", projectId: "p-member", name: "会员日页面", scenario: "reuse" },
      { id: "cv-qa", projectId: "p-release", name: "上线检查", scenario: "qa" },
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

  state = make(state, "cv-lib", "fe");
  state = apply(state, addNode(state, "component", { x: 40, y: 40 }, "活动倒计时"));
  const countdown = state.selectedNodeId ?? "";
  state = generate(state, countdown, "微调：可复用的活动倒计时组件");

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

  return make(state, "cv-campaign", "be");
}

export const SCENARIOS = [
  {
    id: "campaign" as const,
    canvasId: "cv-campaign",
    role: "be" as const,
    name: "新活动页",
    blurb: "从需求文档做到可预览页面",
  },
  {
    id: "restyle" as const,
    canvasId: "cv-restyle",
    role: "de" as const,
    name: "换风格",
    blurb: "冻结稿派生，旧链不动",
  },
  {
    id: "reuse" as const,
    canvasId: "cv-member",
    role: "fe" as const,
    name: "跨项目引用",
    blurb: "引用选定版本，可撤权",
  },
  {
    id: "qa" as const,
    canvasId: "cv-qa",
    role: "qa" as const,
    name: "测试上线",
    blurb: "人工记录结果，不自动回归",
  },
];
