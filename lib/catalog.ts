import type { NodeKind, StructureId } from "@/lib/types";

export const KIND_META: Record<
  NodeKind,
  { label: string; en: string; hint: string; color: string }
> = {
  brief: {
    label: "页面描述",
    en: "Brief",
    hint: "这页要说什么、给谁看",
    color: "#e7c27a",
  },
  style: {
    label: "页面风格",
    en: "Style",
    hint: "颜色、字体、疏密",
    color: "#d7b4ff",
  },
  framework: {
    label: "框架&组件",
    en: "Framework",
    hint: "骨架、技术栈和组件",
    color: "#8fd0ff",
  },
  motion: {
    label: "交互动效",
    en: "Motion",
    hint: "悬停、滚动、入场",
    color: "#ffb08a",
  },
  data: {
    label: "数据",
    en: "Data",
    hint: "表格、列表或指标",
    color: "#8ee0c2",
  },
  page: {
    label: "页面",
    en: "Page",
    hint: "汇入上游，生成预览",
    color: "#dff25a",
  },
};

export const NODE_KINDS: NodeKind[] = [
  "brief",
  "style",
  "framework",
  "motion",
  "data",
  "page",
];

export const STRUCTURES: Record<
  StructureId,
  { label: string; sections: string[] }
> = {
  landing: {
    label: "落地页",
    sections: ["nav", "hero", "logos", "features", "quote", "cta", "footer"],
  },
  pricing: {
    label: "定价",
    sections: ["nav", "hero", "pricing", "faq", "cta", "footer"],
  },
  dashboard: {
    label: "仪表盘",
    sections: ["sidebar", "topbar", "stats", "table", "activity"],
  },
  docs: {
    label: "文档",
    sections: ["nav", "sidebar", "article"],
  },
  auth: {
    label: "登录",
    sections: ["auth"],
  },
  custom: {
    label: "自定义",
    sections: ["nav", "hero", "features", "cta", "footer"],
  },
};

export const SECTION_LABELS: Record<string, string> = {
  nav: "导航",
  hero: "首屏",
  logos: "客户标识",
  features: "特性",
  quote: "评价",
  pricing: "定价",
  faq: "问答",
  cta: "行动号召",
  footer: "页脚",
  sidebar: "侧栏",
  topbar: "顶栏",
  stats: "指标",
  table: "表格",
  activity: "动态",
  article: "正文",
  auth: "登录卡",
  form: "表单",
  custom: "自定义",
};

export const ALL_SECTIONS = Object.keys(SECTION_LABELS);

export function nodeWidth(kind: NodeKind) {
  if (kind === "page") return 380;
  if (kind === "framework") return 300;
  return 280;
}
