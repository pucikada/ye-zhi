import type { NodeKind, StructureId } from "@/lib/types";

export const KIND_META: Record<
  NodeKind,
  { label: string; en: string; hint: string; color: string }
> = {
  brief: {
    label: "简报",
    en: "Brief",
    hint: "产品是什么，给谁用",
    color: "#e7c27a",
  },
  style: {
    label: "风格",
    en: "Style",
    hint: "颜色、字体、疏密",
    color: "#d7b4ff",
  },
  layout: {
    label: "布局",
    en: "Layout",
    hint: "页面骨架和区块",
    color: "#8fd0ff",
  },
  component: {
    label: "组件",
    en: "Component",
    hint: "某一块的具体规格",
    color: "#8ee0c2",
  },
  generate: {
    label: "生成",
    en: "Generate",
    hint: "读取上游，写出页面",
    color: "#dff25a",
  },
  preview: {
    label: "预览",
    en: "Preview",
    hint: "在沙箱里看结果",
    color: "#ffb08a",
  },
  code: {
    label: "代码",
    en: "Code",
    hint: "改代码、复制、导出",
    color: "#b7c0ff",
  },
};

export const NODE_KINDS: NodeKind[] = [
  "brief",
  "style",
  "layout",
  "component",
  "generate",
  "preview",
  "code",
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

export const COMPONENT_KINDS: Array<[string, string]> = [
  ["nav", "导航"],
  ["hero", "首屏"],
  ["features", "特性"],
  ["pricing", "定价"],
  ["faq", "问答"],
  ["quote", "评价"],
  ["cta", "行动号召"],
  ["footer", "页脚"],
  ["logos", "客户标识"],
  ["stats", "指标"],
  ["table", "表格"],
  ["sidebar", "侧栏"],
  ["activity", "动态"],
  ["form", "表单"],
  ["article", "正文"],
  ["custom", "自定义"],
];

export const ALL_SECTIONS = Object.keys(SECTION_LABELS);

export function specPlaceholder(kind: string) {
  switch (kind) {
    case "pricing":
      return "名称 | 价格 | 说明 | 要点,要点";
    case "features":
    case "activity":
      return "标题 — 一句说明";
    case "faq":
      return "问题 — 答案";
    case "stats":
      return "数字 | 标签 | 补充";
    case "table":
      return "第一行表头，用 | 分隔；下面每行一条";
    case "nav":
    case "sidebar":
      return "一行一个链接";
    case "cta":
      return "主按钮 | 次按钮";
    case "quote":
      return "引文 — 署名";
    case "hero":
      return "第一行主标题，第二行副文案";
    default:
      return "这一块要出现的具体内容";
  }
}

export function nodeWidth(kind: NodeKind) {
  if (kind === "preview") return 400;
  if (kind === "code") return 360;
  return 300;
}
