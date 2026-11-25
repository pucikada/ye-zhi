export const ROLES = [
  { id: "pm", name: "林可", title: "产品经理" },
  { id: "be", name: "周衡", title: "后端开发" },
  { id: "de", name: "苏晚", title: "设计师" },
  { id: "fe", name: "陈页", title: "前端开发" },
  { id: "qa", name: "唐测", title: "测试" },
  { id: "guest", name: "顾外", title: "外部协作者" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export type NodeKind =
  | "doc"
  | "api"
  | "design"
  | "component"
  | "page"
  | "image"
  | "testcase";

export type ScenarioId = "campaign" | "restyle" | "reuse" | "qa";

export type Origin = "mock-ai" | "manual" | "import";

export type CheckState = "pass" | "fail";

export type Item = {
  id: string;
  name: string;
  detail: string;
  group: string;
};

export type RefPin = {
  nodeId: string;
  version: number;
  itemId: string;
};

export type Checks = {
  build: CheckState;
  types: CheckState;
  format: CheckState;
  note: string;
};

export type NodeVersion = {
  version: number;
  at: string;
  by: RoleId;
  instruction: string;
  summary: string;
  body: string;
  html: string;
  items: Item[];
  origin: Origin;
  specVersion: string;
  consumed: RefPin[];
  associations: RefPin[];
  checks: Checks | null;
  visual: "pending" | "accepted" | "rejected" | null;
};

export type Job = {
  status: "running" | "stopped" | "failed" | "cancelled" | "done";
  instruction: string;
  pinned: RefPin[];
  specVersion: string;
  ask: string;
};

export type DemoNode = {
  id: string;
  projectId: string;
  canvasId: string;
  kind: NodeKind;
  name: string;
  tags: string[];
  position: { x: number; y: number };
  versions: NodeVersion[];
  removedItemIds: string[];
  frozen: boolean;
  freezeNote: string;
  archived: boolean;
  online: boolean;
  derivedFrom: { nodeId: string; version: number } | null;
  reference: { projectId: string; nodeId: string; version: number } | null;
  lock: { roleId: RoleId; at: string } | null;
  job: Job | null;
};

export type DemoEdge = {
  id: string;
  canvasId: string;
  source: string;
  target: string;
  sourceVersion: number;
  itemId: string;
};

export type Comment = {
  id: string;
  nodeId: string;
  roleId: RoleId;
  text: string;
  at: string;
};

export type Reminder = {
  id: string;
  nodeId: string;
  from: RoleId;
  to: RoleId;
  text: string;
  at: string;
  handled: boolean;
  note: string;
};

export type DemoState = {
  seq: number;
  specVersion: string;
  specText: string;
  projects: Array<{ id: string; name: string }>;
  canvases: Array<{ id: string; projectId: string; name: string; sample: boolean; scenario?: ScenarioId }>;
  nodes: DemoNode[];
  edges: DemoEdge[];
  comments: Comment[];
  reminders: Reminder[];
  access: Record<string, RoleId[]>;
  revoked: Array<{ roleId: RoleId; projectId: string }>;
  activeRole: RoleId;
  activeCanvasId: string;
  selectedNodeId: string | null;
  intentAsk: { nodeId: string; text: string } | null;
  compareIds: string[];
  testResults: Record<string, Record<string, { status: "pass" | "fail" | "pending"; note: string }>>;
};

export type Ok = { ok: true; state: DemoState; message: string; jobNodeId?: string };
export type Err = { ok: false; state: DemoState; message: string };
export type Outcome = Ok | Err;

export const KIND_LABEL: Record<NodeKind, string> = {
  doc: "设计文档",
  api: "数据接口",
  design: "设计稿",
  component: "组件资产",
  page: "页面",
  image: "图片素材",
  testcase: "测试用例",
};

export const KIND_COLOR: Record<NodeKind, string> = {
  doc: "#e7c27a",
  api: "#8fd0ff",
  design: "#d7b4ff",
  component: "#8ee0c2",
  page: "#dff25a",
  image: "#ffb08a",
  testcase: "#f3a0c0",
};
