import assert from "node:assert/strict";
import test from "node:test";

import { addNode, createCanvas } from "./rules";
import { repairEmptySamples } from "./repair-samples";
import { createSeed } from "./seed";
import type { DemoState } from "./types";

function done(outcome: { ok: boolean; state: DemoState; message: string }) {
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.state;
}

function names(state: DemoState, canvasId: string) {
  return state.nodes.filter((node) => node.canvasId === canvasId).map((node) => node.name);
}

test("空的旧示例会补上当前预制内容，已有内容和用户画布不动", () => {
  const seed = createSeed();
  const restyle = seed.nodes.find((node) => node.canvasId === "cv-restyle");
  const countdown = seed.nodes.find((node) => node.canvasId === "cv-lib");
  assert.ok(restyle);
  assert.ok(countdown);
  const edited = { ...restyle, name: "商城需求-改过" };
  const user = {
    ...restyle,
    id: "node-user",
    projectId: "p-user",
    canvasId: "cv-user",
    name: "我的文档",
    versions: restyle.versions.map((version) => ({ ...version, summary: "用户写过的说明" })),
  };
  const stored: DemoState = {
    ...seed,
    projects: [...seed.projects, { id: "p-user", name: "我的项目" }],
    canvases: [
      ...seed.canvases
        .filter((canvas) => canvas.id !== "cv-member")
        .map((canvas) => (canvas.id === "cv-campaign" ? { ...canvas, name: "活动页草稿", scenario: "campaign" as const } : canvas)),
      { id: "cv-user", projectId: "p-user", name: "我的草稿", sample: false },
    ],
    nodes: [edited, countdown, user],
    edges: [],
    comments: [],
    reminders: [],
    testResults: {},
  };
  const once = repairEmptySamples(stored, seed);
  assert.deepEqual(names(once, "cv-campaign"), names(seed, "cv-campaign"));
  assert.equal(once.canvases.find((canvas) => canvas.id === "cv-campaign")?.name, "活动页草稿");
  assert.deepEqual(names(once, "cv-member"), names(seed, "cv-member"));
  assert.deepEqual(names(once, "cv-restyle"), ["商城需求-改过"]);
  assert.equal(once.nodes.filter((node) => node.canvasId === "cv-lib").length, 1);
  assert.equal(once.nodes.find((node) => node.id === "node-user")?.versions[0]?.summary, "用户写过的说明");
  const member = once.nodes.find((node) => node.canvasId === "cv-member" && node.reference);
  assert.equal(member?.reference?.nodeId, countdown.id);
  const twice = repairEmptySamples(once, seed);
  assert.equal(twice.nodes.length, once.nodes.length);
  assert.deepEqual(twice.nodes.map((node) => node.id), once.nodes.map((node) => node.id));
});

test("示例里已有节点时不补、不重复，新建空白画布保持为空", () => {
  const seed = createSeed();
  const campaign = seed.nodes.find((node) => node.canvasId === "cv-campaign" && node.kind === "doc");
  assert.ok(campaign);
  const touched: DemoState = {
    ...seed,
    nodes: seed.nodes.map((node) => (node.id === campaign.id ? { ...node, name: "我改过的需求" } : node)),
  };
  const kept = repairEmptySamples(touched, seed);
  assert.equal(kept, touched);
  assert.equal(names(kept, "cv-campaign").includes("我改过的需求"), true);
  assert.equal(names(kept, "cv-campaign").filter((name) => name === "活动需求").length, 0);
  let blank = done(createCanvas(seed, "p-campaign", "空白新建"));
  const blankId = blank.activeCanvasId;
  blank = repairEmptySamples(blank, seed);
  assert.deepEqual(names(blank, blankId), []);
});

test("预制节点编号被占用时改用新编号，之后新增不会撞号", () => {
  const seed = createSeed();
  const campaignIds = seed.nodes.filter((node) => node.canvasId === "cv-campaign").map((node) => node.id);
  const occupant = seed.nodes.find((node) => node.canvasId === "cv-restyle");
  assert.ok(occupant);
  const stored: DemoState = {
    ...seed,
    nodes: [{ ...occupant, id: campaignIds[0], canvasId: "cv-user", projectId: "p-user", name: "占用编号" }],
    edges: [],
    comments: [],
    reminders: [],
    testResults: {},
    canvases: [
      { id: "cv-campaign", projectId: "p-campaign", name: "活动页", sample: true },
      { id: "cv-user", projectId: "p-user", name: "我的草稿", sample: false },
    ],
    projects: [...seed.projects, { id: "p-user", name: "我的项目" }],
    seq: 3,
  };
  const repaired = repairEmptySamples(stored, seed);
  const ids = repaired.nodes.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(repaired.nodes.some((node) => node.id === campaignIds[0] && node.name === "占用编号"), true);
  assert.equal(names(repaired, "cv-campaign").includes("活动需求"), true);
  const added = done(addNode(repaired, "image", { x: 0, y: 0 }, "后加的图"));
  const created = added.nodes.find((node) => node.name === "后加的图");
  assert.ok(created);
  assert.equal(repaired.nodes.some((node) => node.id === created.id), false);
});

test("四张示例画布都带有预制节点、连线和产物", () => {
  const seed = createSeed();
  const expectChain: Record<string, string[]> = {
    "cv-campaign": ["活动需求", "报名接口", "春日方案", "页面组件", "活动报名页"],
    "cv-restyle": ["商城需求", "设计稿 a", "线上页面", "设计稿 a · 派生", "候选页面"],
    "cv-lib": ["活动倒计时"],
    "cv-member": ["引用 · 活动倒计时", "会员日页面", "引用 · 活动倒计时 · 派生"],
    "cv-qa": ["活动需求 v1", "报名接口", "活动页", "回归用例", "测试报告", "报名接口 · 派生"],
  };
  for (const [canvasId, chain] of Object.entries(expectChain)) {
    assert.deepEqual(names(seed, canvasId), chain);
    for (const name of chain) {
      const node = seed.nodes.find((item) => item.canvasId === canvasId && item.name === name);
      assert.ok(node);
      if (node.reference) {
        const source = seed.nodes.find((item) => item.id === node.reference?.nodeId);
        assert.equal(source?.versions.some((version) => version.version === node.reference?.version), true);
      } else {
        assert.equal(node.versions.length > 0, true);
      }
      assert.ok(node.position.x >= 0 && node.position.x <= 900);
      assert.ok(node.position.y >= 0 && node.position.y <= 500);
    }
    if (canvasId !== "cv-lib") assert.ok(seed.edges.some((edge) => edge.canvasId === canvasId));
  }
  const page = seed.nodes.find((node) => node.canvasId === "cv-campaign" && node.kind === "page");
  assert.match(page?.versions.at(-1)?.html ?? "", /模拟/);
});
