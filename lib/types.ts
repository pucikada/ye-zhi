export type NodeKind =
  | "brief"
  | "style"
  | "framework"
  | "motion"
  | "data"
  | "page";

export type Format = "html" | "react";

export type PresetId =
  | "ink"
  | "paper"
  | "midnight"
  | "grove"
  | "dawn"
  | "custom";

export type FontChoice = "sans" | "serif" | "mono";
export type Density = "compact" | "comfortable" | "spacious";
export type Radius = "sharp" | "soft" | "round";

export type StructureId =
  | "landing"
  | "pricing"
  | "dashboard"
  | "docs"
  | "auth"
  | "custom";

export type MotionLevel = "none" | "subtle" | "lively";
export type DataFormat = "table" | "list" | "stats" | "json";
export type Device = "desktop" | "tablet" | "mobile";
export type RunStatus = "idle" | "running" | "done" | "error";
export type RunSource = "" | "local" | "model";

export type BriefData = {
  title: string;
  audience: string;
  headline: string;
  prompt: string;
};

export type StyleData = {
  preset: PresetId;
  bg: string;
  fg: string;
  accent: string;
  font: FontChoice;
  density: Density;
  radius: Radius;
  notes: string;
};

export type FrameworkData = {
  stack: Format;
  structure: StructureId;
  sections: string[];
  components: string;
  notes: string;
};

export type MotionData = {
  level: MotionLevel;
  hover: boolean;
  scroll: boolean;
  enter: boolean;
  notes: string;
};

export type DataNodeData = {
  name: string;
  format: DataFormat;
  sample: string;
  notes: string;
};

export type PageData = {
  format: Format;
  model: string;
  status: RunStatus;
  source: RunSource;
  warning: string;
  code: string;
  themeCss: string;
  device: Device;
  edited: boolean;
};

export type ComponentSpec = {
  kind: string;
  name: string;
  spec: string;
};

export type XY = { x: number; y: number };

type NodeBase = {
  id: string;
  position: XY;
  selected?: boolean;
  style?: { width?: number | string; height?: number | string };
  width?: number;
  height?: number;
};

export type BriefNode = NodeBase & { type: "brief"; data: BriefData };
export type StyleNode = NodeBase & { type: "style"; data: StyleData };
export type FrameworkNode = NodeBase & { type: "framework"; data: FrameworkData };
export type MotionNode = NodeBase & { type: "motion"; data: MotionData };
export type DataNode = NodeBase & { type: "data"; data: DataNodeData };
export type PageNode = NodeBase & { type: "page"; data: PageData };

export type AppNode =
  | BriefNode
  | StyleNode
  | FrameworkNode
  | MotionNode
  | DataNode
  | PageNode;

export type NodeDataMap = {
  brief: BriefData;
  style: StyleData;
  framework: FrameworkData;
  motion: MotionData;
  data: DataNodeData;
  page: PageData;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  selected?: boolean;
  style?: Record<string, unknown>;
};

export type GenerationContext = {
  briefs: BriefData[];
  styles: StyleData[];
  frameworks: FrameworkData[];
  motions: MotionData[];
  datasets: DataNodeData[];
  format: Format;
};

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
};

export type NodeEditResult = {
  reply: string;
  patch: Record<string, unknown>;
  source: "local" | "model";
};
