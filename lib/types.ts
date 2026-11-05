export type NodeKind =
  | "brief"
  | "style"
  | "layout"
  | "component"
  | "generate"
  | "preview"
  | "code";

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

export type LayoutData = {
  structure: StructureId;
  sections: string[];
  notes: string;
};

export type ComponentData = {
  kind: string;
  name: string;
  spec: string;
};

export type GenerateData = {
  format: Format;
  model: string;
  status: "idle" | "running" | "done" | "error";
  source: "" | "local" | "model";
  warning: string;
  code: string;
  themeCss: string;
};

export type PreviewData = {
  code: string;
  format: Format;
  themeCss: string;
  device: "desktop" | "tablet" | "mobile";
};

export type CodeData = {
  code: string;
  format: Format;
  themeCss: string;
  edited: boolean;
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
export type LayoutNode = NodeBase & { type: "layout"; data: LayoutData };
export type ComponentNode = NodeBase & { type: "component"; data: ComponentData };
export type GenerateNode = NodeBase & { type: "generate"; data: GenerateData };
export type PreviewNode = NodeBase & { type: "preview"; data: PreviewData };
export type CodeNode = NodeBase & { type: "code"; data: CodeData };

export type AppNode =
  | BriefNode
  | StyleNode
  | LayoutNode
  | ComponentNode
  | GenerateNode
  | PreviewNode
  | CodeNode;

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
  layouts: LayoutData[];
  components: ComponentData[];
  upstreamCode: string[];
  format: Format;
};
