import { SECTION_LABELS, STRUCTURES } from "@/lib/catalog";
import { upsertBlock } from "@/lib/blocks";
import { expandPatch } from "@/lib/node-fields";
import type {
  DataFormat,
  Density,
  Device,
  FontChoice,
  Format,
  MotionLevel,
  NodeEditResult,
  NodeKind,
  PresetId,
  Radius,
  StructureId,
} from "@/lib/types";

export const CHAT_EXAMPLES: Record<NodeKind, string[]> = {
  brief: ["把产品名改成页织", "受众改成独立开发者", "说明写得更短一点"],
  style: ["换成纸本", "背景改成 #102018", "字体改成衬线，密度改成松"],
  framework: ["结构改成仪表盘", "加上定价", "输出改成 React"],
  motion: ["动效明显一点", "关掉滚动", "悬停保留，入场关掉"],
  data: ["名称改成价格档", "格式改成指标", "样本换成三行表格"],
  page: ["改成手机预览", "输出改成 React", "模型用 Gemini"],
};

const FIELD_ALIASES: Record<NodeKind, Array<{ field: string; label: string; words: string[] }>> = {
  brief: [
    { field: "title", label: "产品名", words: ["产品名", "产品", "名称", "名字"] },
    { field: "audience", label: "受众", words: ["受众", "用户", "人群", "给谁"] },
    { field: "headline", label: "主标题", words: ["主标题", "标题"] },
    { field: "prompt", label: "说明", words: ["说明", "描述", "文案", "简介", "介绍"] },
  ],
  style: [
    { field: "preset", label: "预设", words: ["预设", "配色", "风格", "主题"] },
    { field: "bg", label: "背景", words: ["背景", "底色"] },
    { field: "fg", label: "文字", words: ["文字", "前景", "字色"] },
    { field: "accent", label: "强调", words: ["强调", "点缀", "高亮"] },
    { field: "font", label: "字体", words: ["字体"] },
    { field: "density", label: "密度", words: ["密度", "疏密", "间距"] },
    { field: "radius", label: "圆角", words: ["圆角"] },
    { field: "notes", label: "备注", words: ["备注", "语气"] },
  ],
  framework: [
    { field: "stack", label: "输出", words: ["输出", "技术栈", "框架", "栈"] },
    { field: "structure", label: "结构", words: ["结构", "骨架", "版式"] },
    { field: "components", label: "组件", words: ["组件", "规格"] },
    { field: "notes", label: "备注", words: ["备注"] },
  ],
  motion: [
    { field: "level", label: "强度", words: ["强度", "程度", "动效"] },
    { field: "notes", label: "说明", words: ["说明", "备注"] },
  ],
  data: [
    { field: "name", label: "名称", words: ["名称", "名字"] },
    { field: "format", label: "格式", words: ["格式", "类型"] },
    { field: "sample", label: "样本", words: ["样本", "数据", "内容"] },
    { field: "notes", label: "备注", words: ["备注"] },
  ],
  page: [
    { field: "format", label: "格式", words: ["格式", "输出"] },
    { field: "device", label: "设备", words: ["设备", "预览", "宽度"] },
    { field: "model", label: "模型", words: ["模型"] },
  ],
};

const COLORS: Record<string, string> = {
  黑: "#111111",
  黑色: "#111111",
  深色: "#0c0d0f",
  深蓝: "#0b1020",
  墨绿: "#0e1512",
  纸色: "#f4f0e6",
  白: "#f7f4ee",
  白色: "#f7f4ee",
  浅色: "#f4f0e6",
  黄: "#e4f25a",
  黄色: "#e4f25a",
  蓝: "#7dd3fc",
  蓝色: "#7dd3fc",
  绿: "#86efac",
  绿色: "#86efac",
  红: "#e11d48",
  红色: "#e11d48",
  橙: "#c2410c",
  橙色: "#c2410c",
  紫: "#d7b4ff",
  紫色: "#d7b4ff",
  米: "#f4f0e6",
  米色: "#f4f0e6",
};

const BLOCK_KINDS: Array<[string, string[]]> = [
  ["features", ["特性", "功能", "卖点"]],
  ["pricing", ["定价", "价格", "套餐"]],
  ["faq", ["问答"]],
  ["quote", ["评价", "引用"]],
  ["hero", ["首屏"]],
  ["cta", ["行动号召", "按钮"]],
  ["stats", ["指标"]],
  ["table", ["表格"]],
  ["nav", ["导航"]],
  ["sidebar", ["侧栏"]],
  ["logos", ["客户标识", "标识"]],
  ["footer", ["页脚"]],
  ["article", ["正文"]],
  ["activity", ["动态"]],
];

function cleanValue(value: string) {
  return value.replace(/^[「"'「]|[」"'」]$/g, "").trim();
}

function parseAssignment(clause: string) {
  const match =
    /^(?:请|帮我)?(?:把|将)?\s*(.+?)\s*(?:改成|改为|换成|设为|设成|写成|调整为|变成)\s*[:：]?\s*(.+)$/.exec(
      clause.trim(),
    );
  if (!match) return null;
  const label = match[1]?.trim() ?? "";
  const value = cleanValue(match[2] ?? "");
  if (!label || !value || label.length > 18) return null;
  return { label, value };
}

function findAlias(kind: NodeKind, label: string) {
  const compact = label.replace(/\s/g, "");
  const aliases = FIELD_ALIASES[kind];
  return aliases.find((item) => item.words.some((word) => compact.includes(word))) ?? null;
}

function matchPreset(value: string): PresetId | null {
  if (/墨白|墨色|黑底黄/.test(value)) return "ink";
  if (/纸本|纸色|米白|暖纸/.test(value)) return "paper";
  if (/夜航|午夜|深蓝/.test(value)) return "midnight";
  if (/森绿|森林|青绿/.test(value)) return "grove";
  if (/曙光|黎明|玫红/.test(value)) return "dawn";
  return null;
}

function matchFont(value: string): FontChoice | null {
  if (/等宽|mono|代码字体/.test(value)) return "mono";
  if (/无衬线|黑体|sans/.test(value)) return "sans";
  if (/衬线|serif|宋体/.test(value)) return "serif";
  return null;
}

function matchDensity(value: string): Density | null {
  if (/紧/.test(value)) return "compact";
  if (/松|疏|宽松/.test(value)) return "spacious";
  if (/适中|舒适/.test(value)) return "comfortable";
  return null;
}

function matchRadius(value: string): Radius | null {
  if (/直角|尖角|方形/.test(value)) return "sharp";
  if (/大圆|很圆|圆润|胶囊/.test(value)) return "round";
  if (/柔|微圆/.test(value)) return "soft";
  return null;
}

function matchStructure(value: string): StructureId | null {
  if (/仪表|后台|控制台|调度/.test(value)) return "dashboard";
  if (/定价|价格页/.test(value)) return "pricing";
  if (/文档/.test(value)) return "docs";
  if (/登录|注册/.test(value)) return "auth";
  if (/落地|营销|首页/.test(value)) return "landing";
  if (/自定义/.test(value)) return "custom";
  return null;
}

function matchStack(value: string): Format | null {
  if (/react|jsx|tsx/i.test(value)) return "react";
  if (/html|静态/i.test(value)) return "html";
  return null;
}

function matchLevel(value: string): MotionLevel | null {
  if (/无动效|关掉动效|关闭动效|不要动效|静止/.test(value)) return "none";
  if (/活泼|明显|夸张|强一点|大一点/.test(value)) return "lively";
  if (/克制|轻微|细一点|弱一点|小一点/.test(value)) return "subtle";
  return null;
}

function matchDataFormat(value: string): DataFormat | null {
  if (/json/i.test(value)) return "json";
  if (/指标|统计/.test(value)) return "stats";
  if (/列表|清单/.test(value)) return "list";
  if (/表格/.test(value)) return "table";
  return null;
}

function matchDevice(value: string): Device | null {
  if (/手机|移动端/.test(value)) return "mobile";
  if (/平板/.test(value)) return "tablet";
  if (/桌面|电脑|宽屏/.test(value)) return "desktop";
  return null;
}

function matchModel(value: string) {
  if (/gemini/i.test(value)) return "google/gemini-3.5-flash";
  if (/gpt/i.test(value)) return "openai/gpt-5.4-mini";
  if (/claude|sonnet/i.test(value)) return "anthropic/claude-sonnet-5";
  if (/默认/.test(value)) return "";
  return null;
}

function colorValue(value: string) {
  const hex = /#([0-9a-fA-F]{6})/.exec(value);
  if (hex?.[1]) return `#${hex[1].toLowerCase()}`;
  const key = value.replace(/\s/g, "");
  return COLORS[key] ?? null;
}

function sectionIdFrom(text: string) {
  for (const [id, label] of Object.entries(SECTION_LABELS)) {
    if (text.includes(label)) return id;
  }
  return null;
}

function blockKindFrom(label: string) {
  return BLOCK_KINDS.find(([, words]) => words.some((word) => label.includes(word)))?.[0] ?? null;
}

function currentSections(data: Record<string, unknown>, patch: Record<string, unknown>) {
  const source = patch.sections ?? data.sections;
  return Array.isArray(source) ? source.filter((item): item is string => typeof item === "string") : [];
}

function currentText(data: Record<string, unknown>, patch: Record<string, unknown>, key: string) {
  const value = patch[key] ?? data[key];
  return typeof value === "string" ? value : "";
}

type Draft = {
  kind: NodeKind;
  data: Record<string, unknown>;
  patch: Record<string, unknown>;
  notes: string[];
};

function note(draft: Draft, text: string) {
  draft.notes.push(text);
}

function applyValue(draft: Draft, field: string, value: string) {
  const { kind } = draft;
  if (kind === "brief" && (field === "title" || field === "audience" || field === "headline" || field === "prompt")) {
    draft.patch[field] = value;
    return true;
  }
  if (kind === "style") {
    if (field === "preset") {
      const preset = matchPreset(value);
      if (!preset) return false;
      draft.patch.preset = preset;
      return true;
    }
    if (field === "bg" || field === "fg" || field === "accent") {
      const color = colorValue(value);
      if (!color) return false;
      draft.patch[field] = color;
      draft.patch.preset = "custom";
      return true;
    }
    if (field === "font") {
      const font = matchFont(value);
      if (!font) return false;
      draft.patch.font = font;
      return true;
    }
    if (field === "density") {
      const density = matchDensity(value);
      if (!density) return false;
      draft.patch.density = density;
      return true;
    }
    if (field === "radius") {
      const radius = matchRadius(value);
      if (!radius) return false;
      draft.patch.radius = radius;
      return true;
    }
    if (field === "notes") {
      draft.patch.notes = value;
      return true;
    }
  }
  if (kind === "framework") {
    if (field === "stack") {
      const stack = matchStack(value);
      if (!stack) return false;
      draft.patch.stack = stack;
      return true;
    }
    if (field === "structure") {
      const structure = matchStructure(value);
      if (!structure) return false;
      draft.patch.structure = structure;
      draft.patch.sections = [...STRUCTURES[structure].sections];
      return true;
    }
    if (field === "components" || field === "notes") {
      draft.patch[field] = value;
      return true;
    }
  }
  if (kind === "motion") {
    if (field === "level") {
      const level = matchLevel(value);
      if (!level) return false;
      draft.patch.level = level;
      return true;
    }
    if (field === "notes") {
      draft.patch.notes = value;
      return true;
    }
  }
  if (kind === "data") {
    if (field === "name" || field === "sample" || field === "notes") {
      draft.patch[field] = value;
      return true;
    }
    if (field === "format") {
      const format = matchDataFormat(value);
      if (!format) return false;
      draft.patch.format = format;
      return true;
    }
  }
  if (kind === "page") {
    if (field === "format") {
      const format = matchStack(value);
      if (!format) return false;
      draft.patch.format = format;
      return true;
    }
    if (field === "device") {
      const device = matchDevice(value);
      if (!device) return false;
      draft.patch.device = device;
      return true;
    }
    if (field === "model") {
      const model = matchModel(value);
      if (model === null) return false;
      draft.patch.model = model;
      return true;
    }
  }
  return false;
}

function applyLabeled(draft: Draft, label: string, value: string) {
  const block = draft.kind === "framework" ? blockKindFrom(label) : null;
  if (block) {
    draft.patch.components = upsertBlock(currentText(draft.data, draft.patch, "components"), {
      kind: block,
      name: "",
      spec: value,
    });
    const sections = currentSections(draft.data, draft.patch);
    if (!sections.includes(block) && block !== "custom") {
      draft.patch.sections = [...sections, block];
    }
    note(draft, `已更新${label}`);
    return true;
  }
  const alias = findAlias(draft.kind, label);
  if (!alias) return false;
  const ok = applyValue(draft, alias.field, value);
  if (ok) note(draft, `${alias.label}已更新`);
  return ok;
}

function applyBare(draft: Draft, clause: string) {
  if (draft.kind === "style") {
    const preset = matchPreset(clause);
    if (preset && /换成|改成|用|风格|预设|配色/.test(clause)) {
      draft.patch.preset = preset;
      note(draft, "预设已更新");
      return true;
    }
    const font = matchFont(clause);
    if (font && /字体|衬线|等宽/.test(clause)) {
      draft.patch.font = font;
      note(draft, "字体已更新");
      return true;
    }
    const density = matchDensity(clause);
    if (density && /密度|疏密|紧一点|松一点|宽松/.test(clause)) {
      draft.patch.density = density;
      note(draft, "密度已更新");
      return true;
    }
    const radius = matchRadius(clause);
    if (radius && /圆角|直角/.test(clause)) {
      draft.patch.radius = radius;
      note(draft, "圆角已更新");
      return true;
    }
  }
  if (draft.kind === "framework") {
    const structure = matchStructure(clause);
    if (structure && /结构|骨架|改成|换成|做成/.test(clause)) {
      draft.patch.structure = structure;
      draft.patch.sections = [...STRUCTURES[structure].sections];
      note(draft, `结构改为${STRUCTURES[structure].label}`);
      return true;
    }
    const stack = matchStack(clause);
    if (stack && /react|html|输出|框架/i.test(clause)) {
      draft.patch.stack = stack;
      note(draft, stack === "react" ? "输出改为 React" : "输出改为 HTML");
      return true;
    }
    if (/^(?:加上|添加|增加|要有)/.test(clause)) {
      const id = sectionIdFrom(clause);
      if (!id) return false;
      const sections = currentSections(draft.data, draft.patch);
      if (!sections.includes(id)) draft.patch.sections = [...sections, id];
      note(draft, `已加上${SECTION_LABELS[id]}`);
      return true;
    }
    if (/^(?:去掉|删除|移除|不要)/.test(clause)) {
      const id = sectionIdFrom(clause);
      if (!id) return false;
      draft.patch.sections = currentSections(draft.data, draft.patch).filter((item) => item !== id);
      note(draft, `已去掉${SECTION_LABELS[id]}`);
      return true;
    }
  }
  if (draft.kind === "motion") {
    let handled = false;
    const level = matchLevel(clause);
    if (level) {
      draft.patch.level = level;
      note(draft, level === "none" ? "已关掉动效" : level === "lively" ? "动效改为明显" : "动效改为克制");
      handled = true;
    }
    const toggles =
      /(打开|开启|保留|加上|关掉|关闭|不要|去掉)\s*(悬停|滚动|入场)|(悬停|滚动|入场)\s*(打开|开启|保留|关掉|关闭|不要|去掉)/g;
    for (const toggle of clause.matchAll(toggles)) {
      const verb = toggle[1] || toggle[4] || "";
      const noun = toggle[2] || toggle[3] || "";
      const on = /打开|开启|保留|加上/.test(verb);
      const key = noun === "悬停" ? "hover" : noun === "滚动" ? "scroll" : "enter";
      draft.patch[key] = on;
      note(draft, `${noun}已${on ? "打开" : "关掉"}`);
      handled = true;
    }
    if (handled) return true;
  }
  if (draft.kind === "page") {
    const device = matchDevice(clause);
    if (device) {
      draft.patch.device = device;
      note(draft, `预览改为${device === "mobile" ? "手机" : device === "tablet" ? "平板" : "桌面"}`);
      return true;
    }
    const format = matchStack(clause);
    if (format) {
      draft.patch.format = format;
      note(draft, format === "react" ? "输出改为 React" : "输出改为 HTML");
      return true;
    }
    const model = matchModel(clause);
    if (model !== null && /模型|gemini|gpt|claude|默认/i.test(clause)) {
      draft.patch.model = model;
      note(draft, model ? "模型已指定" : "模型改回默认");
      return true;
    }
  }
  if (draft.kind === "data") {
    const format = matchDataFormat(clause);
    if (format && /格式|改成|换成/.test(clause)) {
      draft.patch.format = format;
      note(draft, "数据格式已更新");
      return true;
    }
  }
  if (draft.kind === "brief" && /^(?:再)?(?:短一点|缩短|精简一下|精简)$/.test(clause)) {
    const source = currentText(draft.data, draft.patch, "prompt");
    const sentence = source.split(/[。！？\n]/)[0]?.trim() ?? "";
    if (!sentence) return false;
    draft.patch.prompt = sentence;
    note(draft, "已把说明收成一句");
    return true;
  }
  const append = /^(?:在)?(说明|描述|文案|备注|组件|样本|数据)(?:里|中)?(?:后面|末尾)?加上\s*(.+)$/.exec(clause);
  if (append) {
    const word = append[1] ?? "";
    const extra = cleanValue(append[2] ?? "");
    const alias = findAlias(draft.kind, word);
    if (!alias || !extra) return false;
    const previous = currentText(draft.data, draft.patch, alias.field);
    draft.patch[alias.field] = previous.trim() ? `${previous.trim()}\n${extra}` : extra;
    note(draft, `已补到${alias.label}`);
    return true;
  }
  return false;
}

function splitClauses(text: string) {
  if ((text.match(/\|/g) ?? []).length >= 2) return [text];
  const rough = text
    .split(/\n+|；|;/)
    .map((part) => part.trim())
    .filter(Boolean);
  const clauses: string[] = [];
  for (const part of rough) {
    const pieces = part
      .split(/，/)
      .map((piece) => piece.trim())
      .filter(Boolean);
    if (pieces.length > 1 && pieces.every((piece) => parseAssignment(piece))) clauses.push(...pieces);
    else clauses.push(part);
  }
  return clauses.length > 0 ? clauses : [text];
}

function emptyHint(kind: NodeKind) {
  if (kind === "page") {
    return "页面节点只改输出格式、预览设备和模型。文案请改上游的页面描述、框架或数据。";
  }
  const example = CHAT_EXAMPLES[kind][0];
  return `没对上可改的字段。可以试「${example}」，或直接发一段要写进去的文字。`;
}

const PRIMARY: Partial<Record<NodeKind, { key: string; label: string }>> = {
  brief: { key: "prompt", label: "说明" },
  style: { key: "notes", label: "备注" },
  framework: { key: "components", label: "组件" },
  motion: { key: "notes", label: "动效说明" },
  data: { key: "sample", label: "样本" },
};

export function localNodeEdit(
  kind: NodeKind,
  data: Record<string, unknown>,
  message: string,
): NodeEditResult {
  const text = message.trim();
  if (!text) {
    return { reply: "先写一句想改的内容。", patch: {}, source: "local" };
  }
  const draft: Draft = { kind, data, patch: {}, notes: [] };
  let understood = false;
  for (const clause of splitClauses(text)) {
    const assigned = parseAssignment(clause);
    if (assigned) {
      if (applyLabeled(draft, assigned.label, assigned.value)) {
        understood = true;
        continue;
      }
      if (findAlias(kind, assigned.label)) {
        understood = true;
        draft.notes.push(`没认出${assigned.label}要写成什么`);
        continue;
      }
    }
    if (applyBare(draft, clause)) understood = true;
  }
  if (!understood) {
    const primary = PRIMARY[kind];
    if (primary) {
      draft.patch[primary.key] = text;
      draft.notes.push(`已写入${primary.label}`);
    }
  }
  const patch = expandPatch(kind, draft.patch);
  if (Object.keys(patch).length === 0) {
    return { reply: draft.notes[0] || emptyHint(kind), patch: {}, source: "local" };
  }
  const reply = draft.notes.length > 0 ? `${draft.notes.join("；")}。` : "已更新这一节点。";
  return { reply, patch, source: "local" };
}

export function editInstruction(kind: NodeKind) {
  const fields = FIELD_ALIASES[kind].map((item) => `${item.label}（${item.field}）`).join("、");
  const extra =
    kind === "framework"
      ? "还可以改 sections（区块 id 数组）和 components（以 @features 这类行开头的规格）。"
      : kind === "motion"
        ? "还可以改 hover、scroll、enter，值为 true 或 false。level 只能是 none、subtle、lively。"
        : kind === "page"
          ? "不要改 code。format 只能是 html 或 react，device 只能是 desktop、tablet、mobile。"
          : "";
  return [
    "你在改无限画布上的一个节点。只输出 JSON，不要 Markdown。",
    "只改这个节点的文案和参数，不要提连线，不要新增或删除节点。",
    `可改字段：${fields}。${extra}`,
    '格式：{"reply":"一句简体中文，说明改了什么","patch":{只包含要改的字段}}',
    "对不上字段时 patch 为 {}，并在 reply 里说明。",
  ].join("\n");
}

export function editUserPrompt(
  kind: NodeKind,
  data: Record<string, unknown>,
  message: string,
  history: Array<{ role: string; text: string }>,
) {
  const turns = history
    .slice(-6)
    .map((turn) => `${turn.role === "assistant" ? "助手" : "用户"}：${turn.text.slice(0, 400)}`)
    .join("\n");
  return [
    `节点类型：${kind}`,
    `当前字段：${JSON.stringify(data).slice(0, 4000)}`,
    turns ? `最近对话：\n${turns}` : "",
    `这次要改：${message.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
