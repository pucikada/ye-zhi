import { currentVersion } from "./rules";
import type { DemoState, ScenarioId } from "./types";

export type GuideStep = { title: string; detail: string; done: boolean };

export function stepsFor(state: DemoState, scenario: ScenarioId): GuideStep[] {
  const nodes = state.nodes.filter((node) => node.canvasId === state.activeCanvasId);
  const edges = state.edges.filter((edge) => edge.canvasId === state.activeCanvasId);
  const generated = (kind: DemoState["nodes"][number]["kind"]) =>
    nodes.some((node) => node.kind === kind && node.versions.length > 0);

  if (scenario === "campaign") {
    const doc = nodes.find((node) => node.kind === "doc");
    const api = nodes.find((node) => node.kind === "api");
    const design = nodes.find((node) => node.kind === "design");
    const component = nodes.find((node) => node.kind === "component");
    const page = nodes.find((node) => node.kind === "page");
    const derivedOrSecond =
      nodes.filter((node) => node.kind === "design").length > 1 ||
      (design?.versions.length ?? 0) > 1;
    return [
      { title: "放上设计文档", detail: "在空白处添加设计文档，写入活动需求。", done: Boolean(doc) },
      { title: "生成文档", detail: "演示生成会标成 Mock，并记下规范 v1。", done: Boolean(doc && doc.versions.length > 0) },
      {
        title: "连接并生成接口",
        detail: "只连线不会冻结。生成成功并实际使用文档后，文档才冻结。",
        done: Boolean(api && api.versions.length > 0 && doc?.frozen),
      },
      {
        title: "提醒前端",
        detail: "手动选择陈页。提醒不改变连线。",
        done: state.reminders.some((item) => item.nodeId === api?.id && item.to === "fe"),
      },
      {
        title: "切换到前端并处理提醒",
        detail: "每个接收人单独标记。处理不影响别人。",
        done: state.reminders.some((item) => item.nodeId === api?.id && item.to === "fe" && item.handled),
      },
      { title: "建设计稿并生成", detail: "方案①。未冻结时，含糊的追问会先问你。", done: generated("design") },
      {
        title: "追问一句含糊的修改",
        detail: "输入「再活泼一点」会先询问微调还是派生。演示意图识别会标明。",
        done: derivedOrSecond,
      },
      {
        title: "组件资产",
        detail: "连上选定设计稿再生成。清单不是可运行组件。",
        done: Boolean(component && component.versions.length > 0),
      },
      {
        title: "页面汇聚并生成",
        detail: "代码一产出即成功并冻结来源。格式检查失败也不会解冻。",
        done: Boolean(page && currentVersion(page)?.html && currentVersion(page)?.checks),
      },
    ];
  }

  if (scenario === "restyle") {
    const frozenDesign = nodes.find((node) => node.kind === "design" && node.frozen && !node.derivedFrom);
    const derived = nodes.find((node) => node.kind === "design" && node.derivedFrom);
    const candidate = nodes.find((node) => node.kind === "page" && !node.online && node.versions.length > 0);
    return [
      {
        title: "确认线上稿已冻结",
        detail: "设计稿 a 已被线上页面成功使用，不能再改内容。",
        done: Boolean(frozenDesign),
      },
      {
        title: "对 a 提出修改",
        detail: "会强制派生设计稿 b，继承 a 的上游版本。刚派生时没有下游，旧链不变。",
        done: Boolean(derived),
      },
      {
        title: "手动做候选页面",
        detail: "不会自动克隆整条链。你自己新建页面并连上 b。",
        done: Boolean(
          derived &&
            nodes.some(
              (node) =>
                node.kind === "page" &&
                !node.online &&
                edges.some((edge) => edge.source === derived.id && edge.target === node.id),
            ),
        ),
      },
      {
        title: "生成候选页",
        detail: "代码产出后冻结这次实际用到的上游。线上页面仍连着 a。",
        done: Boolean(candidate),
      },
      {
        title: "并排对比",
        detail: "把线上页和候选页放在一起看，不自动替换。",
        done: state.compareIds.length === 2,
      },
    ];
  }

  if (scenario === "reuse") {
    const card = nodes.find((node) => node.reference);
    const derived = nodes.find((node) => node.derivedFrom && !node.reference);
    const revoked = state.revoked.some((item) => item.projectId === "p-lib");
    return [
      {
        title: "从资产中心引用倒计时",
        detail: "绑定品牌资产里的选定版本，不复制内容。",
        done: Boolean(card),
      },
      {
        title: "用引用生成一页",
        detail: "能访问两边项目就可以引用。生成成功才冻结来源。",
        done: nodes.some((node) => node.kind === "page" && node.versions.length > 0),
      },
      {
        title: "在还能读的时候派生",
        detail: "修改引用必须派生新资产。引用卡仍指向原版本，新节点没有下游。",
        done: Boolean(derived),
      },
      {
        title: "撤掉对品牌资产的访问",
        detail: "之后不能读源，也不能再生成。已经产出的页面还在，来源显示无权访问。",
        done: revoked,
      },
    ];
  }

  const cases = nodes.find((node) => node.kind === "testcase");
  const results = state.testResults[cases?.id ?? ""] ?? {};
  const failed = Object.values(results).some((item) => item.status === "fail");
  const report = nodes.find((node) => node.kind === "doc" && node.name.includes("报告"));
  const derivedApi = nodes.some((node) => node.kind === "api" && node.derivedFrom);
  return [
    {
      title: "生成用例",
      detail: "连接需求或接口项后生成。每条用例有稳定项 ID。真实自动回归是后续能力。",
      done: Boolean(cases && (currentVersion(cases)?.items.length ?? 0) > 0),
    },
    {
      title: "人工填写结果",
      detail: "把至少一条标为失败，并写备注。统计来自人工记录。",
      done: failed,
    },
    {
      title: "上传报告",
      detail: "报告进设计文档节点，只做关联，不往上游连线。",
      done: Boolean(report && report.versions.length > 0),
    },
    {
      title: "从失败项派生修复",
      detail: "接口若已冻结，修复必须是新节点。旧页面和旧报告不自动改写。",
      done: derivedApi,
    },
  ];
}

export function scenarioOf(state: DemoState): ScenarioId {
  return state.canvases.find((canvas) => canvas.id === state.activeCanvasId)?.scenario ?? "campaign";
}

export function currentStep(state: DemoState) {
  const steps = stepsFor(state, scenarioOf(state));
  const index = steps.findIndex((step) => !step.done);
  return { steps, index };
}
