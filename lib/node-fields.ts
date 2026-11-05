import { KIND_META, SECTION_LABELS, STRUCTURES } from "@/lib/catalog";
import { presetById } from "@/lib/theme";
import type {
  AppNode,
  DataFormat,
  Density,
  Device,
  FontChoice,
  Format,
  MotionLevel,
  NodeKind,
  PresetId,
  Radius,
  RunSource,
  RunStatus,
  StructureId,
} from "@/lib/types";

type FieldSpec =
  | { key: string; type: "string"; max: number }
  | { key: string; type: "enum"; values: readonly string[] }
  | { key: string; type: "bool" }
  | { key: string; type: "sections" };

const PRESETS = ["ink", "paper", "midnight", "grove", "dawn", "custom"] as const;
const FONTS = ["sans", "serif", "mono"] as const;
const DENSITIES = ["compact", "comfortable", "spacious"] as const;
const RADII = ["sharp", "soft", "round"] as const;
const STRUCTURES_IDS = ["landing", "pricing", "dashboard", "docs", "auth", "custom"] as const;
const FORMATS = ["html", "react"] as const;
const LEVELS = ["none", "subtle", "lively"] as const;
const DATA_FORMATS = ["table", "list", "stats", "json"] as const;
const DEVICES = ["desktop", "tablet", "mobile"] as const;
const STATUSES = ["idle", "running", "done", "error"] as const;
const SOURCES = ["", "local", "model"] as const;

const SPECS: Record<NodeKind, FieldSpec[]> = {
  brief: [
    { key: "title", type: "string", max: 80 },
    { key: "audience", type: "string", max: 80 },
    { key: "headline", type: "string", max: 120 },
    { key: "prompt", type: "string", max: 4000 },
  ],
  style: [
    { key: "preset", type: "enum", values: PRESETS },
    { key: "bg", type: "string", max: 16 },
    { key: "fg", type: "string", max: 16 },
    { key: "accent", type: "string", max: 16 },
    { key: "font", type: "enum", values: FONTS },
    { key: "density", type: "enum", values: DENSITIES },
    { key: "radius", type: "enum", values: RADII },
    { key: "notes", type: "string", max: 1000 },
  ],
  framework: [
    { key: "stack", type: "enum", values: FORMATS },
    { key: "structure", type: "enum", values: STRUCTURES_IDS },
    { key: "sections", type: "sections" },
    { key: "components", type: "string", max: 8000 },
    { key: "notes", type: "string", max: 1000 },
  ],
  motion: [
    { key: "level", type: "enum", values: LEVELS },
    { key: "hover", type: "bool" },
    { key: "scroll", type: "bool" },
    { key: "enter", type: "bool" },
    { key: "notes", type: "string", max: 1000 },
  ],
  data: [
    { key: "name", type: "string", max: 80 },
    { key: "format", type: "enum", values: DATA_FORMATS },
    { key: "sample", type: "string", max: 8000 },
    { key: "notes", type: "string", max: 1000 },
  ],
  page: [
    { key: "format", type: "enum", values: FORMATS },
    { key: "model", type: "string", max: 80 },
    { key: "status", type: "enum", values: STATUSES },
    { key: "source", type: "enum", values: SOURCES },
    { key: "warning", type: "string", max: 400 },
    { key: "code", type: "string", max: 200000 },
    { key: "themeCss", type: "string", max: 100000 },
    { key: "device", type: "enum", values: DEVICES },
    { key: "edited", type: "bool" },
  ],
};

export const CHAT_KEYS: Record<NodeKind, string[]> = {
  brief: ["title", "audience", "headline", "prompt"],
  style: ["preset", "bg", "fg", "accent", "font", "density", "radius", "notes"],
  framework: ["stack", "structure", "sections", "components", "notes"],
  motion: ["level", "hover", "scroll", "enter", "notes"],
  data: ["name", "format", "sample", "notes"],
  page: ["format", "model", "device"],
};

const SECTION_IDS = new Set(Object.keys(SECTION_LABELS));

export function defaultData(kind: NodeKind): AppNode["data"] {
  switch (kind) {
    case "brief":
      return { title: "", audience: "", headline: "", prompt: "" };
    case "style":
      return {
        preset: "ink",
        bg: "#0c0d0f",
        fg: "#f3f0e8",
        accent: "#e4f25a",
        font: "sans",
        density: "comfortable",
        radius: "soft",
        notes: "",
      };
    case "framework":
      return {
        stack: "html",
        structure: "landing",
        sections: [...STRUCTURES.landing.sections],
        components: "",
        notes: "",
      };
    case "motion":
      return { level: "subtle", hover: true, scroll: false, enter: true, notes: "" };
    case "data":
      return { name: "", format: "table", sample: "", notes: "" };
    case "page":
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
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "开" || value === "是") return true;
  if (value === "false" || value === "关" || value === "否") return false;
  return undefined;
}

function asString(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, max);
}

export function sanitizePatch(
  kind: NodeKind,
  patch: Record<string, unknown>,
  mode: "chat" | "full" = "full",
) {
  const allowed = mode === "chat" ? new Set(CHAT_KEYS[kind]) : null;
  const clean: Record<string, unknown> = {};
  for (const spec of SPECS[kind]) {
    if (allowed && !allowed.has(spec.key)) continue;
    if (!(spec.key in patch)) continue;
    const value = patch[spec.key];
    if (spec.type === "string") {
      const text = asString(value, spec.max);
      if (text !== undefined) clean[spec.key] = text;
    } else if (spec.type === "enum") {
      if (typeof value === "string" && spec.values.includes(value)) clean[spec.key] = value;
    } else if (spec.type === "bool") {
      const bool = asBool(value);
      if (bool !== undefined) clean[spec.key] = bool;
    } else if (spec.type === "sections" && Array.isArray(value)) {
      const sections = value
        .filter((item): item is string => typeof item === "string" && SECTION_IDS.has(item))
        .slice(0, 24);
      clean.sections = [...new Set(sections)];
    }
  }
  return clean;
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function expandPatch(
  kind: NodeKind,
  patch: Record<string, unknown>,
) {
  const clean = sanitizePatch(kind, patch, "chat");
  if (kind === "style") {
    for (const key of ["bg", "fg", "accent"] as const) {
      if (key in clean && !isHex(clean[key])) delete clean[key];
      else if (isHex(clean[key])) clean[key] = clean[key].toLowerCase();
    }
    if (typeof clean.preset === "string" && clean.preset !== "custom") {
      const preset = presetById(clean.preset as PresetId);
      if (!clean.bg) clean.bg = preset.bg;
      if (!clean.fg) clean.fg = preset.fg;
      if (!clean.accent) clean.accent = preset.accent;
    } else if ((clean.bg || clean.fg || clean.accent) && !clean.preset) {
      clean.preset = "custom";
    }
  }
  if (kind === "framework" && typeof clean.structure === "string" && !clean.sections) {
    const structure = clean.structure as StructureId;
    if (STRUCTURES[structure]) clean.sections = [...STRUCTURES[structure].sections];
  }
  if (kind === "motion" && clean.level === "none") {
    clean.hover = false;
    clean.scroll = false;
    clean.enter = false;
  }
  return clean;
}

export function fillData(kind: NodeKind, raw: unknown): AppNode["data"] {
  const defaults = defaultData(kind);
  if (!raw || typeof raw !== "object") return defaults;
  const clean = sanitizePatch(kind, raw as Record<string, unknown>, "full");
  return { ...defaults, ...clean } as AppNode["data"];
}

function clip(value: string, max = 72) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const DENSITY_LABEL: Record<Density, string> = {
  compact: "紧",
  comfortable: "适中",
  spacious: "松",
};
const RADIUS_LABEL: Record<Radius, string> = {
  sharp: "方",
  soft: "柔",
  round: "圆",
};
const FONT_LABEL: Record<FontChoice, string> = {
  sans: "无衬线",
  serif: "衬线",
  mono: "等宽",
};
const LEVEL_LABEL: Record<MotionLevel, string> = {
  none: "无动效",
  subtle: "克制",
  lively: "明显",
};
const DATA_LABEL: Record<DataFormat, string> = {
  table: "表格",
  list: "列表",
  stats: "指标",
  json: "JSON",
};
const DEVICE_LABEL: Record<Device, string> = {
  desktop: "桌面",
  tablet: "平板",
  mobile: "手机",
};
const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "等待上游",
  running: "生成中",
  done: "已生成",
  error: "生成失败",
};
const SOURCE_LABEL: Record<RunSource, string> = {
  "": "",
  local: "本地合成",
  model: "模型",
};

export function fieldRows(node: AppNode): Array<{ label: string; value: string }> {
  switch (node.type) {
    case "brief":
      return [
        { label: "产品名", value: node.data.title },
        { label: "受众", value: node.data.audience },
        { label: "主标题", value: node.data.headline },
        { label: "说明", value: node.data.prompt },
      ];
    case "style":
      return [
        { label: "预设", value: presetById(node.data.preset).label },
        { label: "背景", value: node.data.bg },
        { label: "文字", value: node.data.fg },
        { label: "强调", value: node.data.accent },
        { label: "字体", value: FONT_LABEL[node.data.font] },
        { label: "密度", value: DENSITY_LABEL[node.data.density] },
        { label: "圆角", value: RADIUS_LABEL[node.data.radius] },
        { label: "备注", value: node.data.notes },
      ];
    case "framework":
      return [
        { label: "输出", value: node.data.stack === "react" ? "React" : "HTML" },
        { label: "结构", value: STRUCTURES[node.data.structure].label },
        {
          label: "区块",
          value: node.data.sections.map((id) => SECTION_LABELS[id] ?? id).join("、"),
        },
        { label: "组件", value: node.data.components },
        { label: "备注", value: node.data.notes },
      ];
    case "motion":
      return [
        { label: "强度", value: LEVEL_LABEL[node.data.level] },
        { label: "悬停", value: node.data.hover ? "开" : "关" },
        { label: "滚动", value: node.data.scroll ? "开" : "关" },
        { label: "入场", value: node.data.enter ? "开" : "关" },
        { label: "说明", value: node.data.notes },
      ];
    case "data":
      return [
        { label: "名称", value: node.data.name },
        { label: "格式", value: DATA_LABEL[node.data.format] },
        { label: "样本", value: node.data.sample },
        { label: "备注", value: node.data.notes },
      ];
    case "page":
      return [
        { label: "格式", value: node.data.format === "react" ? "React" : "HTML" },
        { label: "设备", value: DEVICE_LABEL[node.data.device] },
        { label: "模型", value: node.data.model || "环境默认" },
        {
          label: "状态",
          value: [STATUS_LABEL[node.data.status], SOURCE_LABEL[node.data.source]]
            .filter(Boolean)
            .join(" · "),
        },
      ];
  }
}

export function summaryLines(node: AppNode) {
  switch (node.type) {
    case "brief":
      return [
        node.data.title || "未命名产品",
        node.data.audience || "受众未写",
        clip(node.data.headline || node.data.prompt || "还没有说明"),
      ];
    case "style":
      return [
        `${presetById(node.data.preset).label} · ${DENSITY_LABEL[node.data.density]} · ${RADIUS_LABEL[node.data.radius]}`,
        `${FONT_LABEL[node.data.font]} · ${node.data.accent}`,
        clip(node.data.notes || "颜色从这里流进页面"),
      ];
    case "framework": {
      const labels = node.data.sections
        .slice(0, 5)
        .map((id) => SECTION_LABELS[id] ?? id);
      return [
        `${STRUCTURES[node.data.structure].label} · ${node.data.stack === "react" ? "React" : "HTML"}`,
        labels.join("、") || "还没有区块",
        clip(node.data.notes || node.data.components || "组件规格写在对话里"),
      ];
    }
    case "motion": {
      const flags = [
        node.data.hover ? "悬停" : "",
        node.data.scroll ? "滚动" : "",
        node.data.enter ? "入场" : "",
      ].filter(Boolean);
      return [
        LEVEL_LABEL[node.data.level],
        flags.join("、") || "没有具体动效",
        clip(node.data.notes || "连到页面后，预览会带上这些动效"),
      ];
    }
    case "data": {
      const rows = node.data.sample.split(/\n/).filter((line) => line.trim()).length;
      return [
        node.data.name || "未命名数据",
        DATA_LABEL[node.data.format],
        rows ? `${rows} 行样本` : "还没有样本",
      ];
    }
    case "page":
      return [
        node.data.format === "react" ? "React" : "HTML",
        STATUS_LABEL[node.data.status],
        node.data.warning
          ? clip(node.data.warning, 48)
          : SOURCE_LABEL[node.data.source] || KIND_META.page.hint,
      ];
  }
}

export function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === "string" && value in KIND_META;
}

export type { Format };
