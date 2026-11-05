import { nodeWidth } from "@/lib/catalog";
import { renderPage } from "@/lib/compose";
import { collectContext } from "@/lib/graph";
import { presetById } from "@/lib/theme";
import type {
  AppNode,
  BriefData,
  CodeData,
  ComponentData,
  GenerateData,
  GraphEdge,
  LayoutData,
  PreviewData,
  StyleData,
} from "@/lib/types";

export const TEMPLATES = [
  {
    id: "landing",
    name: "落地页",
    description: "产品介绍、特性、一句评价",
    projectName: "页织落地页",
  },
  {
    id: "pricing",
    name: "SaaS 定价",
    description: "三档价格和常见问题",
    projectName: "北窗定价",
  },
  {
    id: "dashboard",
    name: "调度台",
    description: "侧栏、指标和运单表",
    projectName: "岸线调度台",
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

function edge(source: string, target: string): GraphEdge {
  return { id: `${source}>${target}`, source, target, type: "smoothstep" };
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

const idleGenerate = (format: GenerateData["format"] = "html"): GenerateData => ({
  format,
  model: "",
  status: "idle",
  source: "",
  warning: "",
  code: "",
  themeCss: "",
});

const emptyCode = (): CodeData => ({
  code: "",
  format: "html",
  themeCss: "",
  edited: false,
});

const emptyPreview = (): PreviewData => ({
  code: "",
  format: "html",
  themeCss: "",
  device: "desktop",
});

function withOutput(nodes: AppNode[], edges: GraphEdge[]) {
  const generate = nodes.find((node) => node.type === "generate");
  if (!generate) return nodes;
  const page = renderPage(collectContext(generate.id, nodes, edges));
  return nodes.map((node) => {
    if (node.type === "generate") {
      return {
        ...node,
        data: {
          ...node.data,
          code: page.html,
          themeCss: page.themeCss,
          status: "done" as const,
          source: "local" as const,
          warning: "",
        },
      };
    }
    if (node.type === "code") {
      return { ...node, data: { ...node.data, code: page.html, themeCss: page.themeCss } };
    }
    if (node.type === "preview") {
      return { ...node, data: { ...node.data, code: page.html, themeCss: page.themeCss } };
    }
    return node;
  });
}

function landing(): { nodes: AppNode[]; edges: GraphEdge[] } {
  const ink = presetById("ink");
  const brief: BriefData = {
    title: "页织",
    audience: "独立开发者",
    headline: "把页面从一句需求里织出来",
    prompt:
      "页织是一块无限画布。把简报、风格和布局接成工作流，生成可以预览、可以改的前端页面。不从空白文件开始。",
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
  const layout: LayoutData = {
    structure: "landing",
    sections: ["nav", "hero", "logos", "features", "quote", "cta", "footer"],
    notes: "",
  };
  const features: ComponentData = {
    kind: "features",
    name: "三件事",
    spec: "无限画布 — 双击就加节点，把上下文拖到生成器上\n风格跟着走 — 颜色、密度和字体从风格节点流进页面\n当场能改 — 预览和代码在同一张画布上，改完就能导出",
  };
  const quote: ComponentData = {
    kind: "quote",
    name: "评价",
    spec: "终于不用先开一个空的 index.html — 独立开发者",
  };
  const nodes: AppNode[] = [
    place("brief", "landing-brief", 0, 0, brief),
    place("style", "landing-style", 0, 430, style),
    place("layout", "landing-layout", 360, 0, layout),
    place("component", "landing-features", 360, 390, features),
    place("component", "landing-quote", 360, 720, quote),
    place("generate", "landing-generate", 740, 180, idleGenerate(), true),
    place("code", "landing-code", 1100, 0, emptyCode()),
    place("preview", "landing-preview", 1100, 360, emptyPreview()),
  ];
  const edges = [
    edge("landing-brief", "landing-generate"),
    edge("landing-style", "landing-generate"),
    edge("landing-layout", "landing-generate"),
    edge("landing-features", "landing-generate"),
    edge("landing-quote", "landing-generate"),
    edge("landing-generate", "landing-code"),
    edge("landing-code", "landing-preview"),
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
  const layout: LayoutData = {
    structure: "pricing",
    sections: ["nav", "hero", "pricing", "faq", "cta", "footer"],
    notes: "",
  };
  const tiers: ComponentData = {
    kind: "pricing",
    name: "三档",
    spec: [
      "观察 | ¥0 | 一个人先试 | 1 个收件箱, 7 天历史, 社区支持",
      "工作室 | ¥49/月 | 正在长大的团队 | 无限收件箱, 共享备注, 邮件与页面插件",
      "柜面 | ¥199/月 | 需要权限的团队 | SSO, 审计日志, 专属值班",
    ].join("\n"),
  };
  const faq: ComponentData = {
    kind: "faq",
    name: "问答",
    spec: "可以按月停吗 — 可以。停用后数据保留 30 天。\n有没有席位费 — 工作室档包含 5 个席位，之后每个 ¥12。\n支持自建邮箱吗 — 支持 IMAP 和常见企业邮箱。",
  };
  const nodes: AppNode[] = [
    place("brief", "pricing-brief", 0, 0, brief),
    place("style", "pricing-style", 0, 430, style),
    place("layout", "pricing-layout", 360, 0, layout),
    place("component", "pricing-tiers", 360, 390, tiers),
    place("component", "pricing-faq", 360, 720, faq),
    place("generate", "pricing-generate", 740, 180, idleGenerate(), true),
    place("code", "pricing-code", 1100, 0, emptyCode()),
    place("preview", "pricing-preview", 1100, 360, emptyPreview()),
  ];
  const edges = [
    edge("pricing-brief", "pricing-generate"),
    edge("pricing-style", "pricing-generate"),
    edge("pricing-layout", "pricing-generate"),
    edge("pricing-tiers", "pricing-generate"),
    edge("pricing-faq", "pricing-generate"),
    edge("pricing-generate", "pricing-code"),
    edge("pricing-code", "pricing-preview"),
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
  const layout: LayoutData = {
    structure: "dashboard",
    sections: ["sidebar", "topbar", "stats", "table", "activity"],
    notes: "",
  };
  const stats: ComponentData = {
    kind: "stats",
    name: "指标",
    spec: "128 | 在途运单 | 较昨日 +6\n7 | 延误 | 需要值班确认\n36 | 车辆在线 | 4 辆充电中\n18 分 | 平均靠台 | 目标 20 分",
  };
  const table: ComponentData = {
    kind: "table",
    name: "运单",
    spec: "运单 | 去向 | 状态 | 车辆\nSH-2041 | 外高桥 | 靠台中 | 沪A·3921\nSH-2048 | 洋山 | 延误 40 分 | 沪B·1108\nNB-118 | 宁波港 | 在途 | 浙B·6620\nSZ-090 | 苏州园区 | 已签 | 苏E·4412",
  };
  const sidebar: ComponentData = {
    kind: "sidebar",
    name: "侧栏",
    spec: "总览\n运单\n车辆\n延误\n班次",
  };
  const nodes: AppNode[] = [
    place("brief", "dash-brief", 0, 0, brief),
    place("style", "dash-style", 0, 430, style),
    place("layout", "dash-layout", 360, 0, layout),
    place("component", "dash-stats", 360, 390, stats),
    place("component", "dash-table", 360, 700, table),
    place("component", "dash-side", 740, 500, sidebar),
    place("generate", "dash-generate", 740, 80, idleGenerate(), true),
    place("code", "dash-code", 1100, 0, emptyCode()),
    place("preview", "dash-preview", 1100, 360, emptyPreview()),
  ];
  const edges = [
    edge("dash-brief", "dash-generate"),
    edge("dash-style", "dash-generate"),
    edge("dash-layout", "dash-generate"),
    edge("dash-stats", "dash-generate"),
    edge("dash-table", "dash-generate"),
    edge("dash-side", "dash-generate"),
    edge("dash-generate", "dash-code"),
    edge("dash-code", "dash-preview"),
  ];
  return { nodes: withOutput(nodes, edges), edges };
}

export function buildTemplate(id: TemplateId) {
  const meta = TEMPLATES.find((item) => item.id === id) ?? TEMPLATES[0];
  const graph = id === "pricing" ? pricing() : id === "dashboard" ? dashboard() : landing();
  return { projectName: meta.projectName, ...graph };
}
