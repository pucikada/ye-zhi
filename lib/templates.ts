import { nodeWidth } from "@/lib/catalog";
import { renderPage } from "@/lib/compose";
import { collectContext } from "@/lib/graph";
import { presetById } from "@/lib/theme";
import type {
  AppNode,
  BriefData,
  DataNodeData,
  FrameworkData,
  GraphEdge,
  MotionData,
  PageData,
  StyleData,
} from "@/lib/types";

export const TEMPLATES = [
  {
    id: "landing",
    name: "落地页",
    description: "描述、风格、框架和动效汇进页面",
    projectName: "页织落地页",
  },
  {
    id: "pricing",
    name: "SaaS 定价",
    description: "价格数据连进定价页",
    projectName: "北窗定价",
  },
  {
    id: "dashboard",
    name: "调度台",
    description: "指标和运单数据连进调度页",
    projectName: "岸线调度台",
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

function edge(source: string, target: string): GraphEdge {
  return { id: `${source}>${target}`, source, target, type: "flow" };
}

function place(
  type: AppNode["type"],
  id: string,
  x: number,
  y: number,
  data: AppNode["data"],
  selected = false,
): AppNode {
  return {
    id,
    type,
    position: { x, y },
    selected,
    style: { width: nodeWidth(type) },
    data,
  } as AppNode;
}

function pageData(): PageData {
  return {
    format: "html",
    model: "",
    status: "idle",
    source: "",
    warning: "",
    code: "",
    themeCss: "",
    device: "desktop",
    edited: false,
  };
}

function withOutput(nodes: AppNode[], edges: GraphEdge[]) {
  return nodes.map((node) => {
    if (node.type !== "page") return node;
    const page = renderPage(collectContext(node.id, nodes, edges));
    return {
      ...node,
      data: {
        ...node.data,
        code: node.data.format === "react" ? page.react : page.html,
        themeCss: page.themeCss,
        status: "done" as const,
        source: "local" as const,
        warning: "",
        edited: false,
      },
    };
  });
}

function landing(): { nodes: AppNode[]; edges: GraphEdge[] } {
  const ink = presetById("ink");
  const brief: BriefData = {
    title: "页织",
    audience: "独立开发者",
    headline: "把页面从一句需求里织出来",
    prompt:
      "页织是一块无限画布。把页面描述、风格、框架、动效和数据连到页面节点，生成可以预览的前端。不从空白文件开始。",
  };
  const style: StyleData = {
    preset: "ink",
    bg: ink.bg,
    fg: ink.fg,
    accent: ink.accent,
    font: "sans",
    density: "spacious",
    radius: "soft",
    notes: "语气干脆，少口号，像工具而不是发布会。",
  };
  const framework: FrameworkData = {
    stack: "html",
    structure: "landing",
    sections: ["nav", "hero", "logos", "features", "quote", "cta", "footer"],
    components: [
      "@features 三件事",
      "无限画布 — 节点自由相连，上游汇进页面",
      "对话改稿 — 点开节点，用一句话改文案和参数",
      "当场能看 — 页面节点里就是预览",
      "",
      "@quote 评价",
      "终于不用先开一个空的 index.html — 独立开发者",
    ].join("\n"),
    notes: "",
  };
  const motion: MotionData = {
    level: "subtle",
    hover: true,
    scroll: true,
    enter: true,
    notes: "悬停轻轻抬起，区块入场即可，不要弹跳。",
  };
  const logos: DataNodeData = {
    name: "客户标识",
    format: "list",
    sample: "青岫\n慢递\n拾光\n南风\n木白",
    notes: "",
  };
  const nodes: AppNode[] = [
    place("brief", "landing-brief", 0, 20, brief),
    place("style", "landing-style", 0, 280, style),
    place("framework", "landing-framework", 360, 20, framework),
    place("motion", "landing-motion", 360, 300, motion),
    place("data", "landing-logos", 360, 520, logos),
    place("page", "landing-page", 760, 140, pageData()),
  ];
  const edges = [
    edge("landing-brief", "landing-page"),
    edge("landing-style", "landing-page"),
    edge("landing-framework", "landing-page"),
    edge("landing-motion", "landing-page"),
    edge("landing-logos", "landing-page"),
  ];
  return { nodes: withOutput(nodes, edges), edges };
}

function pricing(): { nodes: AppNode[]; edges: GraphEdge[] } {
  const paper = presetById("paper");
  const brief: BriefData = {
    title: "北窗",
    audience: "小型客服团队",
    headline: "把工单收成一扇安静的窗",
    prompt:
      "北窗是给小团队的客户支持台。来信、备注和回复在同一条时间线上，价格公开，没有销售墙。",
  };
  const style: StyleData = {
    preset: "paper",
    bg: paper.bg,
    fg: paper.fg,
    accent: paper.accent,
    font: "serif",
    density: "comfortable",
    radius: "soft",
    notes: "纸色背景，标题用衬线，像一封写完的信。",
  };
  const framework: FrameworkData = {
    stack: "html",
    structure: "pricing",
    sections: ["nav", "hero", "pricing", "faq", "cta", "footer"],
    components: [
      "@faq 问答",
      "可以按月停吗 — 可以。停用后数据保留 30 天。",
      "有没有席位费 — 工作室档包含 5 个席位，之后每个 ¥12。",
      "支持自建邮箱吗 — 支持 IMAP 和常见企业邮箱。",
    ].join("\n"),
    notes: "",
  };
  const motion: MotionData = {
    level: "subtle",
    hover: true,
    scroll: true,
    enter: false,
    notes: "价格卡悬停即可。",
  };
  const tiers: DataNodeData = {
    name: "价格档",
    format: "table",
    sample: [
      "观察 | ¥0 | 一个人先试 | 1 个收件箱, 7 天历史, 社区支持",
      "工作室 | ¥49/月 | 正在长大的团队 | 无限收件箱, 共享备注, 邮件与页面插件",
      "柜面 | ¥199/月 | 需要权限的团队 | SSO, 审计日志, 专属值班",
    ].join("\n"),
    notes: "",
  };
  const nodes: AppNode[] = [
    place("brief", "pricing-brief", 0, 20, brief),
    place("style", "pricing-style", 0, 280, style),
    place("framework", "pricing-framework", 360, 20, framework),
    place("data", "pricing-tiers", 360, 340, tiers),
    place("motion", "pricing-motion", 360, 620, motion),
    place("page", "pricing-page", 760, 160, pageData()),
  ];
  const edges = [
    edge("pricing-brief", "pricing-page"),
    edge("pricing-style", "pricing-page"),
    edge("pricing-framework", "pricing-page"),
    edge("pricing-tiers", "pricing-page"),
    edge("pricing-motion", "pricing-page"),
  ];
  return { nodes: withOutput(nodes, edges), edges };
}

function dashboard(): { nodes: AppNode[]; edges: GraphEdge[] } {
  const night = presetById("midnight");
  const brief: BriefData = {
    title: "岸线",
    audience: "调度员",
    headline: "今日岸线",
    prompt: "岸线是港口与城配之间的调度台。值班的人打开就能看见运单、延误和车辆。",
  };
  const style: StyleData = {
    preset: "midnight",
    bg: night.bg,
    fg: night.fg,
    accent: night.accent,
    font: "sans",
    density: "compact",
    radius: "sharp",
    notes: "密一点，数字对齐，状态用短词。",
  };
  const framework: FrameworkData = {
    stack: "html",
    structure: "dashboard",
    sections: ["sidebar", "topbar", "stats", "table", "activity"],
    components: ["@sidebar 侧栏", "总览\n运单\n车辆\n延误\n班次"].join("\n"),
    notes: "",
  };
  const motion: MotionData = {
    level: "none",
    hover: false,
    scroll: false,
    enter: false,
    notes: "值班台保持静止。",
  };
  const stats: DataNodeData = {
    name: "今日指标",
    format: "stats",
    sample: [
      "128 | 在途运单 | 较昨日 +6",
      "7 | 延误 | 需要值班确认",
      "36 | 车辆在线 | 4 辆充电中",
      "18 分 | 平均靠台 | 目标 20 分",
    ].join("\n"),
    notes: "",
  };
  const table: DataNodeData = {
    name: "运单",
    format: "table",
    sample: [
      "运单 | 去向 | 状态 | 车辆",
      "SH-2041 | 外高桥 | 靠台中 | 沪A·3921",
      "SH-2048 | 洋山 | 延误 40 分 | 沪B·1108",
      "NB-118 | 宁波港 | 在途 | 浙B·6620",
      "SZ-090 | 苏州园区 | 已签 | 苏E·4412",
    ].join("\n"),
    notes: "",
  };
  const nodes: AppNode[] = [
    place("brief", "dash-brief", 0, 20, brief),
    place("style", "dash-style", 0, 280, style),
    place("framework", "dash-framework", 360, 20, framework),
    place("data", "dash-stats", 360, 300, stats),
    place("data", "dash-table", 720, 300, table),
    place("motion", "dash-motion", 720, 560, motion),
    place("page", "dash-page", 1100, 80, pageData()),
  ];
  const edges = [
    edge("dash-brief", "dash-page"),
    edge("dash-style", "dash-page"),
    edge("dash-framework", "dash-page"),
    edge("dash-stats", "dash-page"),
    edge("dash-table", "dash-page"),
    edge("dash-motion", "dash-page"),
  ];
  return { nodes: withOutput(nodes, edges), edges };
}

export function buildTemplate(id: TemplateId) {
  const meta = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0];
  const graph = id === "pricing" ? pricing() : id === "dashboard" ? dashboard() : landing();
  return { projectName: meta.projectName, ...graph };
}
