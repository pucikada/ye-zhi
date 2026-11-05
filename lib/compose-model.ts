import { STRUCTURES } from "@/lib/catalog";
import {
  firstComponent,
  parseCta,
  parseFaqs,
  parseFeatures,
  parseHero,
  parseLinks,
  parseQuote,
  parseStats,
  parseTable,
  parseTiers,
  type Faq,
  type Feature,
  type Quote,
  type Stat,
  type Tier,
} from "@/lib/spec";
import { resolveTheme, type ResolvedTheme } from "@/lib/theme";
import type {
  Density,
  GenerationContext,
  Radius,
  StructureId,
} from "@/lib/types";

const LOGO_POOL = ["青岫", "慢递", "拾光", "南风", "木白", "折页", "回声"];

export type PageModel = {
  name: string;
  audience: string;
  headline: string;
  lede: string;
  notes: string;
  structure: StructureId;
  sections: string[];
  theme: ResolvedTheme;
  ui: {
    section: string;
    card: string;
    btn: string;
    hero: string;
    gap: string;
    pad: string;
  };
  nav: string[];
  features: Feature[];
  featureTitle: string;
  tiers: Tier[];
  faqs: Faq[];
  quote: Quote;
  stats: Stat[];
  table: { columns: string[]; rows: string[][] };
  sidebar: string[];
  activity: Feature[];
  logos: string[];
  article: string[];
  fields: string[];
  footerNote: string;
  extras: Array<{ title: string; body: string }>;
  cta: { title: string; primary: string; secondary: string };
};

function firstSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.split(/[。！？\n]/)[0]?.trim() ?? "";
  return match;
}

function restAfter(text: string, sentence: string) {
  const trimmed = text.trim();
  if (!sentence) return trimmed;
  if (trimmed.startsWith(sentence)) {
    return trimmed.slice(sentence.length).replace(/^[。！？\s]+/, "").trim();
  }
  return trimmed;
}

function paragraphs(text: string) {
  const chunks = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (chunks.length > 1) return chunks;
  const sentences = text
    .split(/。/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.endsWith("。") ? part : `${part}。`));
  if (sentences.length <= 2) return [text.trim()].filter(Boolean);
  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    grouped.push(sentences.slice(i, i + 2).join(""));
  }
  return grouped;
}

function uiFor(density: Density, radius: Radius) {
  const space =
    density === "compact"
      ? { section: "py-12", hero: "py-14", gap: "gap-3", pad: "p-4" }
      : density === "spacious"
        ? { section: "py-20", hero: "py-24", gap: "gap-6", pad: "p-6" }
        : { section: "py-16", hero: "py-20", gap: "gap-4", pad: "p-5" };
  const card =
    radius === "sharp" ? "rounded-md" : radius === "round" ? "rounded-3xl" : "rounded-2xl";
  const btn = radius === "sharp" ? "rounded-md" : "rounded-full";
  return { ...space, card, btn };
}

function defaultFeatures(name: string, audience: string): Feature[] {
  return [
    {
      title: "先把话说清",
      body: `${name} 从一句需求开始，而不是从空白文件开始。`,
    },
    {
      title: "风格一起走",
      body: "颜色、疏密和字体留在风格里，页面跟着变。",
    },
    {
      title: audience ? `给${audience}` : "给人看的一页",
      body: "结构和文案围着具体的人，不拿占位句子充数。",
    },
  ];
}

function defaultTiers(name: string): Tier[] {
  return [
    {
      name: "起步",
      price: "¥0",
      blurb: "先做一页看看",
      points: ["1 个项目", "本地预览", "导出 HTML"],
      featured: false,
    },
    {
      name: "工作室",
      price: "¥49/月",
      blurb: `${name} 的日常档`,
      points: ["无限页面", "共享风格", "代码可改"],
      featured: true,
    },
    {
      name: "团队",
      price: "¥199/月",
      blurb: "需要权限的时候",
      points: ["成员权限", "审计记录", "专属支持"],
      featured: false,
    },
  ];
}

function defaultFaqs(name: string, audience: string): Faq[] {
  return [
    {
      q: `${name} 适合谁？`,
      a: audience ? `主要是${audience}。` : "适合想先看到页面、再决定细节的人。",
    },
    {
      q: "可以改文案吗？",
      a: "可以。生成之后直接改代码，预览会跟着变。",
    },
    {
      q: "能随时停吗？",
      a: "按月的档位可以停。已经导出的页面仍是你的。",
    },
  ];
}

function defaultStats(): Stat[] {
  return [
    { value: "128", label: "进行中", hint: "今天" },
    { value: "7", label: "需要处理", hint: "优先看这些" },
    { value: "36", label: "在线", hint: "过去 1 小时" },
    { value: "18分", label: "平均用时", hint: "目标 20 分" },
  ];
}

export function buildModel(context: GenerationContext): PageModel {
  const brief = context.briefs[0];
  const style = context.styles[0];
  const layout = context.layouts[0];
  const components = context.components;
  const name = brief?.title?.trim() || "未命名产品";
  const audience = brief?.audience?.trim() || "";
  const prompt = brief?.prompt?.trim() || "";
  const heroSpec = parseHero(firstComponent(components, "hero")?.spec ?? "");
  const sentence = firstSentence(prompt);
  const headline =
    heroSpec.headline ||
    brief?.headline?.trim() ||
    (sentence.length > 0 && sentence.length <= 32 ? sentence : "") ||
    `${name}，先看一页`;
  const lede =
    heroSpec.lede ||
    restAfter(prompt, headline === sentence ? sentence : "") ||
    prompt ||
    `${name} 把要说的话收成一页能打开的前端。`;
  const structure = layout?.structure ?? "landing";
  const presetSections = STRUCTURES[structure].sections;
  const sections = layout?.sections?.length ? [...layout.sections] : [...presetSections];
  for (const component of components) {
    if (
      component.kind !== "custom" &&
      component.kind !== "form" &&
      component.spec.trim() &&
      !sections.includes(component.kind)
    ) {
      sections.push(component.kind);
    }
  }

  const featureSpec = firstComponent(components, "features");
  const features = parseFeatures(featureSpec?.spec ?? "");
  const tiers = parseTiers(firstComponent(components, "pricing")?.spec ?? "");
  const faqs = parseFaqs(firstComponent(components, "faq")?.spec ?? "");
  const quote = parseQuote(firstComponent(components, "quote")?.spec ?? "");
  const stats = parseStats(firstComponent(components, "stats")?.spec ?? "");
  const table = parseTable(firstComponent(components, "table")?.spec ?? "");
  const navLinks = parseLinks(firstComponent(components, "nav")?.spec ?? "");
  const sidebar = parseLinks(firstComponent(components, "sidebar")?.spec ?? "");
  const activity = parseFeatures(firstComponent(components, "activity")?.spec ?? "");
  const logoLines = parseLinks(firstComponent(components, "logos")?.spec ?? "");
  const ctaSpec = parseCta(firstComponent(components, "cta")?.spec ?? "");
  const footerNote = (firstComponent(components, "footer")?.spec ?? "").trim();
  const formLines = parseLinks(firstComponent(components, "form")?.spec ?? "");
  const articleSpec = firstComponent(components, "article")?.spec ?? "";
  const extras = components
    .filter((item) => item.kind === "custom" && item.spec.trim())
    .map((item) => ({ title: item.name.trim() || "补充", body: item.spec.trim() }));

  const density = style?.density ?? "comfortable";
  const radius = style?.radius ?? "soft";

  return {
    name,
    audience,
    headline,
    lede,
    notes: layout?.notes?.trim() || style?.notes?.trim() || "",
    structure,
    sections,
    theme: resolveTheme(style),
    ui: uiFor(density, radius),
    nav: navLinks.length ? navLinks : ["产品", "方案", "价格"],
    features: features.length ? features : defaultFeatures(name, audience),
    featureTitle: featureSpec?.name?.trim() || "为什么是现在",
    tiers: tiers.length ? tiers : defaultTiers(name),
    faqs: faqs.length ? faqs : defaultFaqs(name, audience),
    quote: quote ?? {
      text: lede.length > 42 ? `${lede.slice(0, 42)}…` : lede,
      by: audience || "早期用户",
    },
    stats: stats.length ? stats : defaultStats(),
    table: table.columns.length
      ? table
      : {
          columns: ["编号", "对象", "状态", "负责人"],
          rows: [
            ["001", name, "进行中", "值班"],
            ["002", "北区", "等待", "夜班"],
            ["003", "南区", "已完成", "白班"],
          ],
        },
    sidebar: sidebar.length ? sidebar : ["总览", "记录", "状态", "设置"],
    activity: activity.length
      ? activity
      : [
          { title: "刚刚有更新", body: `${name} 的最新一条记在这里。` },
          { title: "待确认", body: audience ? `${audience}还没点过。` : "有一条等待确认。" },
        ],
    logos: logoLines.length
      ? logoLines
      : LOGO_POOL.filter((item) => item !== name).slice(0, 5),
    article: articleSpec.trim() ? paragraphs(articleSpec) : paragraphs(prompt || lede),
    fields: formLines.length ? formLines : ["邮箱", "密码"],
    footerNote,
    extras,
    cta: {
      title: `准备好看看${name}了吗`,
      primary: ctaSpec.primary || "开始使用",
      secondary: ctaSpec.secondary || "看示例",
    },
  };
}
