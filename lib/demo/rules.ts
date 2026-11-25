import { classifyIntent, mockVersion } from "./mock-content";
import type {
  DemoEdge,
  DemoNode,
  DemoState,
  NodeKind,
  Outcome,
  RefPin,
  RoleId,
} from "./types";

export { classifyIntent };

const ALL_ROLES: RoleId[] = ["pm", "be", "de", "fe", "qa", "guest"];

export function roleName(roleId: RoleId) {
  const names: Record<RoleId, string> = {
    pm: "林可",
    be: "周衡",
    de: "苏晚",
    fe: "陈页",
    qa: "唐测",
    guest: "顾外",
  };
  return names[roleId];
}

export function canAccess(state: DemoState, roleId: RoleId, projectId: string) {
  if (!(state.access[projectId] ?? []).includes(roleId)) return false;
  return !state.revoked.some((item) => item.roleId === roleId && item.projectId === projectId);
}

export function nodeById(state: DemoState, id: string) {
  return state.nodes.find((node) => node.id === id);
}

export function currentVersion(node: DemoNode) {
  return node.versions[node.versions.length - 1];
}

export function versionOf(node: DemoNode, version: number) {
  return node.versions.find((item) => item.version === version);
}

function ok(state: DemoState, message: string, jobNodeId?: string): Outcome {
  return jobNodeId ? { ok: true, state, message, jobNodeId } : { ok: true, state, message };
}

function err(state: DemoState, message: string): Outcome {
  return { ok: false, state, message };
}

function nextId(state: DemoState, prefix: string): [DemoState, string] {
  const seq = state.seq + 1;
  return [{ ...state, seq }, `${prefix}-${seq}`];
}

function replaceNode(state: DemoState, node: DemoNode): DemoState {
  return { ...state, nodes: state.nodes.map((item) => (item.id === node.id ? node : item)) };
}

function reaches(state: DemoState, from: string, to: string, canvasId: string) {
  const outgoing = new Map<string, string[]>();
  for (const edge of state.edges) {
    if (edge.canvasId !== canvasId) continue;
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    if (current === to) return true;
    seen.add(current);
    for (const next of outgoing.get(current) ?? []) stack.push(next);
  }
  return false;
}

export function itemRefStatus(state: DemoState, pin: RefPin) {
  const node = nodeById(state, pin.nodeId);
  if (!node) return { ok: false as const, reason: "节点不存在" };
  if (!canAccess(state, state.activeRole, node.projectId)) {
    return { ok: false as const, reason: "无权访问" };
  }
  if (pin.itemId && node.removedItemIds.includes(pin.itemId)) {
    return { ok: false as const, reason: "引用已失效" };
  }
  const version = versionOf(node, pin.version);
  if (!version) return { ok: false as const, reason: "版本不存在" };
  if (!pin.itemId) return { ok: true as const, node, version, item: null };
  const item = version.items.find((entry) => entry.id === pin.itemId) ?? findItem(node, pin.itemId);
  if (!item || node.removedItemIds.includes(item.id)) {
    return { ok: false as const, reason: "引用已失效" };
  }
  return { ok: true as const, node, version, item };
}

function findItem(node: DemoNode, itemId: string) {
  for (let index = node.versions.length - 1; index >= 0; index -= 1) {
    const item = node.versions[index]?.items.find((entry) => entry.id === itemId);
    if (item) return item;
  }
  return undefined;
}

export function incomingPins(state: DemoState, nodeId: string): RefPin[] {
  const pins: RefPin[] = [];
  for (const edge of state.edges) {
    if (edge.target !== nodeId) continue;
    const source = nodeById(state, edge.source);
    if (source?.reference) {
      pins.push({
        nodeId: source.reference.nodeId,
        version: source.reference.version,
        itemId: edge.itemId,
      });
      continue;
    }
    pins.push({ nodeId: edge.source, version: edge.sourceVersion, itemId: edge.itemId });
  }
  return pins;
}

function upstreamText(state: DemoState, pins: RefPin[]) {
  return pins
    .map((pin) => {
      const source = nodeById(state, pin.nodeId);
      const version = source ? versionOf(source, pin.version) : undefined;
      if (!source || !version) return "";
      const item = pin.itemId ? version.items.find((entry) => entry.id === pin.itemId) : undefined;
      return `${source.name} v${pin.version}${item ? ` · ${item.name}` : ""}\n${version.summary}\n${item?.detail ?? version.body.slice(0, 280)}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function freezeSources(state: DemoState, pins: RefPin[], by: string) {
  const ids = new Set(pins.map((pin) => pin.nodeId));
  return {
    ...state,
    nodes: state.nodes.map((node) => {
      if (!ids.has(node.id) || node.frozen) return node;
      return {
        ...node,
        frozen: true,
        freezeNote: `已被 ${by} 成功使用`,
      };
    }),
  };
}

export function connect(
  state: DemoState,
  input: { source: string; target: string; itemId?: string },
): Outcome {
  const source = nodeById(state, input.source);
  const target = nodeById(state, input.target);
  if (!source || !target) return err(state, "节点不存在");
  if (source.canvasId !== target.canvasId) return err(state, "不能把不同画布直接连成边，请用引用卡");
  if (source.id === target.id) return err(state, "不能连接自己");
  if (target.frozen) return err(state, "目标已冻结，不能再改它的上游引用");
  if (target.reference) return err(state, "引用卡只绑定选定版本，不能再接上游");
  if (!canAccess(state, state.activeRole, source.projectId)) return err(state, "无权访问来源");
  const resolved = edgeSource(state, source);
  if (!resolved.ok) return err(state, resolved.reason);
  const itemId = input.itemId ?? "";
  if (itemId) {
    const status = itemRefStatus(state, {
      nodeId: resolved.nodeId,
      version: resolved.version,
      itemId,
    });
    if (!status.ok) return err(state, status.reason);
  }
  if (
    state.edges.some(
      (edge) =>
        edge.source === source.id &&
        edge.target === target.id &&
        edge.itemId === itemId &&
        edge.sourceVersion === resolved.version,
    )
  ) {
    return err(state, "这条引用已经在了");
  }
  if (reaches(state, target.id, source.id, target.canvasId)) {
    return err(state, "这条线会成环，已拦截");
  }
  const [withId, id] = nextId(state, "edge");
  const edge: DemoEdge = {
    id,
    canvasId: target.canvasId,
    source: source.id,
    target: target.id,
    sourceVersion: resolved.version,
    itemId,
  };
  return ok(
    { ...withId, edges: [...withId.edges, edge] },
    `已引用 ${source.name} v${resolved.version}${itemId ? " 的一项" : ""}。只连线不会冻结来源。`,
  );
}

function edgeSource(
  state: DemoState,
  source: DemoNode,
): { ok: true; nodeId: string; version: number } | { ok: false; reason: string } {
  if (source.reference) {
    if (!canAccess(state, state.activeRole, source.reference.projectId)) {
      return { ok: false, reason: "无权访问来源" };
    }
    const real = nodeById(state, source.reference.nodeId);
    if (!real || !versionOf(real, source.reference.version)) {
      return { ok: false, reason: "引用的版本不存在" };
    }
    return { ok: true, nodeId: real.id, version: source.reference.version };
  }
  const version = currentVersion(source);
  if (!version) return { ok: false, reason: "来源还没有版本" };
  return { ok: true, nodeId: source.id, version: version.version };
}

export function deleteEdge(state: DemoState, edgeId: string): Outcome {
  const edge = state.edges.find((item) => item.id === edgeId);
  if (!edge) return err(state, "连线不存在");
  const target = nodeById(state, edge.target);
  if (target?.frozen) return err(state, "目标已冻结，不能改它的上游引用");
  return ok(
    { ...state, edges: state.edges.filter((item) => item.id !== edgeId) },
    "已删除连线。删除不会解除冻结。",
  );
}

function deniedPins(state: DemoState, pins: RefPin[]) {
  for (const pin of pins) {
    const source = nodeById(state, pin.nodeId);
    if (!source) return "来源节点不存在";
    if (!canAccess(state, state.activeRole, source.projectId)) return "无权访问来源，不能再生成";
    if (pin.itemId) {
      const status = itemRefStatus({ ...state, activeRole: state.activeRole }, pin);
      if (!status.ok && status.reason === "引用已失效") return "有引用已失效，不能生成";
      if (!status.ok && status.reason === "无权访问") return "无权访问来源，不能再生成";
    }
  }
  return "";
}

export function startJob(state: DemoState, nodeId: string, instruction: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.archived) return err(state, "资产已归档");
  if (node.frozen) return err(state, "节点已冻结。要修改请派生新节点。");
  if (node.lock && node.lock.roleId !== state.activeRole) {
    return err(state, `${roleName(node.lock.roleId)} 正在编辑这个节点，你只能看`);
  }
  if (node.reference && !canAccess(state, state.activeRole, node.reference.projectId)) {
    return err(state, "无权访问来源，不能再生成");
  }
  const pins = incomingPins(state, node.id);
  const denied = deniedPins(state, pins);
  if (denied) return err(state, denied);
  const jobNode: DemoNode = {
    ...node,
    lock: { roleId: state.activeRole, at: new Date().toISOString() },
    job: {
      status: "running",
      instruction: instruction.trim(),
      pinned: pins,
      specVersion: state.specVersion,
      ask: "",
    },
  };
  return ok(replaceNode(state, jobNode), "已开始本地模拟。没有真实进度，也没有接入模型。", node.id);
}

export function cancelJob(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.job || node.job.status !== "running") return err(state, "没有可取消的作业");
  return ok(
    replaceNode(state, { ...node, job: { ...node.job, status: "cancelled", ask: "" } }),
    "已取消。取消不会冻结来源。",
  );
}

export function failJob(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.job || node.job.status !== "running") return err(state, "没有进行中的作业");
  return ok(
    replaceNode(state, {
      ...node,
      job: { ...node.job, status: "failed", ask: "模拟失败：结果没有写回。先前版本仍在。" },
    }),
    "已标为失败。来源没有冻结。",
  );
}

export function finishJob(state: DemoState, nodeId: string, at: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.job || node.job.status !== "running") return err(state, "没有进行中的作业");
  for (const pin of node.job.pinned) {
    const source = nodeById(state, pin.nodeId);
    if (!source) {
      return ok(
        replaceNode(state, { ...node, job: { ...node.job, status: "failed", ask: "来源不见了" } }),
        "来源不见了，作业失败，没有冻结。",
      );
    }
    if (!canAccess(state, state.activeRole, source.projectId)) {
      return ok(
        replaceNode(state, {
          ...node,
          job: { ...node.job, status: "failed", ask: "无权访问" },
        }),
        "无权访问来源，作业失败，没有冻结。",
      );
    }
    const latest = currentVersion(source);
    if (!latest || latest.version !== pin.version) {
      return ok(
        replaceNode(state, {
          ...node,
          job: {
            ...node.job,
            status: "stopped",
            ask: `${source.name} 已变成 v${latest?.version ?? "?"}。要按新版本重试吗？`,
          },
        }),
        "引用的上游更新了，作业已停止。没有自动重试，也没有冻结。",
      );
    }
    if (pin.itemId && source.removedItemIds.includes(pin.itemId)) {
      return ok(
        replaceNode(state, {
          ...node,
          job: { ...node.job, status: "failed", ask: "引用已失效" },
        }),
        "引用已失效，作业失败，没有冻结。",
      );
    }
  }
  const versionNumber = (currentVersion(node)?.version ?? 0) + 1;
  const produced = mockVersion({
    kind: node.kind,
    instruction: node.job.instruction,
    upstream: upstreamText(state, node.job.pinned),
    specVersion: node.job.specVersion,
    version: versionNumber,
    at,
    by: state.activeRole,
    consumed: node.job.pinned,
  });
  const cards = state.edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => nodeById(state, edge.source))
    .filter((item): item is DemoNode => Boolean(item?.reference));
  const nextNode: DemoNode = {
    ...node,
    job: null,
    lock: null,
    versions: [...node.versions, produced],
  };
  const frozen = freezeSources(
    replaceNode(state, nextNode),
    [...node.job.pinned, ...cards.map((card) => ({ nodeId: card.id, version: 0, itemId: "" }))],
    node.name,
  );
  const checkNote = produced.checks
    ? "代码已产出，来源已冻结。格式检查未通过，但这不撤销冻结，也不能当作可交付。"
    : "生成完成。实际用到的来源已冻结。";
  return ok(frozen, checkNote);
}

export function retryStopped(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.job || node.job.status !== "stopped") return err(state, "没有等待确认的作业");
  const instruction = node.job.instruction;
  const cleared = replaceNode(state, { ...node, job: null });
  return startJob(cleared, nodeId, instruction);
}

export function dismissStopped(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.job || node.job.status !== "stopped") return err(state, "没有等待确认的作业");
  return ok(replaceNode(state, { ...node, job: null }), "已留下停止记录的结果：不重试，不冻结。");
}

export type InstructionGate = {
  enabled: boolean;
  reason: string;
  mode: "job" | "derive";
};

export function instructionGate(state: DemoState, nodeId: string): InstructionGate {
  const node = nodeById(state, nodeId);
  if (!node) return { enabled: false, reason: "节点不存在", mode: "job" };
  if (!canAccess(state, state.activeRole, node.projectId)) {
    return { enabled: false, reason: "你不能编辑这个项目，当前只能看", mode: "job" };
  }
  if (node.lock && node.lock.roleId !== state.activeRole) {
    return { enabled: false, reason: `${roleName(node.lock.roleId)} 正在编辑，你只能看、评论和提醒`, mode: "job" };
  }
  if (node.reference && !canAccess(state, state.activeRole, node.reference.projectId)) {
    return { enabled: false, reason: "权限已撤回，不能读取或再生成", mode: "derive" };
  }
  if (node.archived && !node.frozen && !node.reference) {
    return { enabled: false, reason: "资产已归档，不能再生成", mode: "job" };
  }
  if (node.job?.status === "running") {
    return { enabled: false, reason: "生成中，先取消或等它结束", mode: "job" };
  }
  if (node.job?.status === "stopped") {
    return { enabled: false, reason: node.job.ask || "上游版本变了，先确认是否重试", mode: "job" };
  }
  if (node.frozen || node.reference) return { enabled: true, reason: "", mode: "derive" };
  return { enabled: true, reason: "", mode: "job" };
}

export function submitInstruction(state: DemoState, nodeId: string, text: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  const instruction = text.trim();
  if (!instruction) return err(state, "先写一句要改的内容");
  const gate = instructionGate(state, nodeId);
  if (!gate.enabled) return err(state, gate.reason);
  if (gate.mode === "derive") {
    return deriveNode(state, nodeId, instruction);
  }
  const intent = classifyIntent(instruction);
  if (intent === "ask") {
    return ok(
      { ...state, intentAsk: { nodeId, text: instruction } },
      "这句话没有写明是微调还是派生，先确认。",
    );
  }
  if (intent === "derive") return deriveNode(state, nodeId, instruction);
  return startJob({ ...state, intentAsk: null }, nodeId, instruction);
}

export function resolveIntent(state: DemoState, choice: "version" | "derive"): Outcome {
  const ask = state.intentAsk;
  if (!ask) return err(state, "没有待确认的意图");
  const cleared = { ...state, intentAsk: null };
  if (choice === "derive") return deriveNode(cleared, ask.nodeId, ask.text);
  return startJob(cleared, ask.nodeId, ask.text);
}

export function deriveNode(state: DemoState, nodeId: string, instruction: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.reference && !canAccess(state, state.activeRole, node.reference.projectId)) {
    return err(state, "无权访问来源，不能读取或派生");
  }
  const version = currentVersion(node) ?? (node.reference ? referencedVersion(state, node) : undefined);
  if (!version) return err(state, "还没有可派生的版本");
  const [withNodeId, id] = nextId(state, "node");
  const sourceVersion = node.reference?.version ?? version.version;
  const created: DemoNode = {
    id,
    projectId: node.projectId,
    canvasId: node.canvasId,
    kind: node.kind,
    name: `${node.name} · 派生`,
    tags: [...node.tags],
    position: { x: node.position.x + 48, y: node.position.y + 56 },
    versions: node.reference
      ? [
          {
            ...version,
            version: 1,
            at: new Date().toISOString(),
            by: state.activeRole,
            instruction,
            origin: "manual",
            summary: `${version.summary}（派生快照）`,
            specVersion: state.specVersion,
            consumed: [],
            associations: [{ nodeId: node.reference.nodeId, version: node.reference.version, itemId: "" }],
            checks: null,
            visual: null,
          },
        ]
      : [],
    removedItemIds: [],
    frozen: false,
    freezeNote: "",
    archived: false,
    online: false,
    derivedFrom: { nodeId: node.reference?.nodeId ?? node.id, version: sourceVersion },
    reference: null,
    lock: null,
    job: null,
  };
  const inherited = state.edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => ({ ...edge, target: id }));
  let next: DemoState = {
    ...withNodeId,
    nodes: [...withNodeId.nodes, created],
    selectedNodeId: id,
    intentAsk: null,
  };
  const [withEdges, edgeSeed] = inherited.reduce<[DemoState, number]>(
    (acc, edge) => {
      const [current, seq] = acc;
      const edged: DemoEdge = { ...edge, id: `edge-${current.seq + 1}` };
      return [{ ...current, seq: current.seq + 1, edges: [...current.edges, edged] }, seq];
    },
    [next, 0],
  );
  next = withEdges;
  void edgeSeed;
  if (node.reference) {
    return ok(next, "已从引用派生新资产。引用卡仍指向原版本，新节点没有下游。派生本身不会冻结来源。");
  }
  return startJob(next, id, instruction);
}

function referencedVersion(state: DemoState, node: DemoNode) {
  if (!node.reference) return undefined;
  const source = nodeById(state, node.reference.nodeId);
  if (!source || !canAccess(state, state.activeRole, source.projectId)) return undefined;
  return versionOf(source, node.reference.version);
}

export function addNode(
  state: DemoState,
  kind: NodeKind,
  position: { x: number; y: number },
  name?: string,
): Outcome {
  const canvas = state.canvases.find((item) => item.id === state.activeCanvasId);
  if (!canvas) return err(state, "没有打开的画布");
  if (!canAccess(state, state.activeRole, canvas.projectId)) return err(state, "你不能编辑这个项目");
  const [withId, id] = nextId(state, "node");
  const labels: Record<NodeKind, string> = {
    doc: "设计文档",
    api: "数据接口",
    design: "设计稿",
    component: "组件资产",
    page: "页面",
    image: "图片素材",
    testcase: "测试用例",
  };
  const node: DemoNode = {
    id,
    projectId: canvas.projectId,
    canvasId: canvas.id,
    kind,
    name: name?.trim() || labels[kind],
    tags: [],
    position,
    versions: [],
    removedItemIds: [],
    frozen: false,
    freezeNote: "",
    archived: false,
    online: false,
    derivedFrom: null,
    reference: null,
    lock: null,
    job: null,
  };
  return ok(
    { ...withId, nodes: [...withId.nodes, node], selectedNodeId: id },
    `已放上${labels[kind]}`,
  );
}

export function moveNode(state: DemoState, nodeId: string, position: { x: number; y: number }): DemoState {
  const node = nodeById(state, nodeId);
  if (!node) return state;
  return replaceNode(state, { ...node, position });
}

export function renameNode(state: DemoState, nodeId: string, name: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.frozen) return err(state, "已冻结，名称不能改。请派生新节点。");
  if (node.lock && node.lock.roleId !== state.activeRole) return err(state, "这个节点正被别人编辑");
  return ok(replaceNode(state, { ...node, name: name.trim() || node.name }), "已改名");
}

export function renameItem(state: DemoState, nodeId: string, itemId: string, name: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.frozen) return err(state, "已冻结，不能改项。请派生。");
  const version = currentVersion(node);
  if (!version) return err(state, "还没有版本");
  const items = version.items.map((item) => (item.id === itemId ? { ...item, name } : item));
  if (!version.items.some((item) => item.id === itemId)) return err(state, "没有这一项");
  const versions = node.versions.map((item) => (item.version === version.version ? { ...item, items } : item));
  return ok(replaceNode(state, { ...node, versions }), "已改名。项 ID 没变，旧引用还在。");
}

export function removeItem(state: DemoState, nodeId: string, itemId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.frozen) return err(state, "已冻结，不能删项。请派生。");
  if (node.removedItemIds.includes(itemId)) return err(state, "这项已经失效");
  return ok(
    replaceNode(state, { ...node, removedItemIds: [...node.removedItemIds, itemId] }),
    "这项已删除。引用会显示失效，不会自动改绑到别的项。",
  );
}

export function comment(state: DemoState, nodeId: string, text: string): Outcome {
  const body = text.trim();
  if (!body) return err(state, "评论是空的");
  if (!nodeById(state, nodeId)) return err(state, "节点不存在");
  const [withId, id] = nextId(state, "cmt");
  return ok(
    {
      ...withId,
      comments: [
        ...withId.comments,
        { id, nodeId, roleId: state.activeRole, text: body, at: new Date().toISOString() },
      ],
    },
    "评论已留下。评论不会改写冻结内容。",
  );
}

export function remind(state: DemoState, nodeId: string, to: RoleId[], text: string): Outcome {
  const body = text.trim();
  if (!body) return err(state, "写一句说明");
  if (to.length === 0) return err(state, "先选接收人");
  if (!nodeById(state, nodeId)) return err(state, "节点不存在");
  let next = state;
  const created: DemoState["reminders"] = [];
  for (const roleId of to) {
    if (!ALL_ROLES.includes(roleId) || roleId === state.activeRole) continue;
    const [bumped, id] = nextId(next, "rmd");
    next = bumped;
    created.push({
      id,
      nodeId,
      from: state.activeRole,
      to: roleId,
      text: body,
      at: new Date().toISOString(),
      handled: false,
      note: "",
    });
  }
  if (created.length === 0) return err(state, "没有可发送的接收人");
  return ok({ ...next, reminders: [...next.reminders, ...created] }, `已提醒 ${created.length} 人。提醒不改变连线。`);
}

export function handleReminder(state: DemoState, reminderId: string, note: string): Outcome {
  const reminder = state.reminders.find((item) => item.id === reminderId);
  if (!reminder) return err(state, "提醒不存在");
  if (reminder.to !== state.activeRole) return err(state, "这是别人的提醒");
  return ok(
    {
      ...state,
      reminders: state.reminders.map((item) =>
        item.id === reminderId ? { ...item, handled: true, note: note.trim() } : item,
      ),
    },
    "已处理。其他人的提醒状态不变。",
  );
}

export function acquireLock(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.lock && node.lock.roleId !== state.activeRole) {
    return err(state, `${roleName(node.lock.roleId)} 正在编辑`);
  }
  return ok(
    replaceNode(state, { ...node, lock: { roleId: state.activeRole, at: new Date().toISOString() } }),
    "你开始编辑。别人打开这个节点只能看。",
  );
}

export function releaseLock(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node?.lock) return ok(state, "没有编辑占用");
  if (node.lock.roleId !== state.activeRole) return err(state, "不能解开别人的编辑");
  return ok(replaceNode(state, { ...node, lock: null }), "已放开编辑");
}

export function publishSpec(state: DemoState, version: string, text: string): Outcome {
  return ok(
    { ...state, specVersion: version, specText: text },
    `规范已记为 ${version}。只影响之后的生成，不会重跑历史。`,
  );
}

export function revokeAccess(state: DemoState, roleId: RoleId, projectId: string): Outcome {
  if (state.revoked.some((item) => item.roleId === roleId && item.projectId === projectId)) {
    return err(state, "已经撤过了");
  }
  return ok(
    { ...state, revoked: [...state.revoked, { roleId, projectId }] },
    "已撤权。不能再读取来源或用它生成；已经产出的内容还在。",
  );
}

export function restoreAccess(state: DemoState, roleId: RoleId, projectId: string): Outcome {
  return ok(
    {
      ...state,
      revoked: state.revoked.filter((item) => !(item.roleId === roleId && item.projectId === projectId)),
    },
    "已恢复访问。",
  );
}

export function createReference(
  state: DemoState,
  sourceNodeId: string,
  version: number,
): Outcome {
  const source = nodeById(state, sourceNodeId);
  if (!source) return err(state, "资产不存在");
  const canvas = state.canvases.find((item) => item.id === state.activeCanvasId);
  if (!canvas) return err(state, "没有打开的画布");
  if (!canAccess(state, state.activeRole, source.projectId) || !canAccess(state, state.activeRole, canvas.projectId)) {
    return err(state, "需要能访问两边项目才能引用");
  }
  if (!versionOf(source, version)) return err(state, "没有这个版本");
  const [withId, id] = nextId(state, "ref");
  const card: DemoNode = {
    id,
    projectId: canvas.projectId,
    canvasId: canvas.id,
    kind: source.kind,
    name: `引用 · ${source.name}`,
    tags: ["引用"],
    position: { x: 80, y: 80 },
    versions: [],
    removedItemIds: [],
    frozen: false,
    freezeNote: "",
    archived: false,
    online: false,
    derivedFrom: null,
    reference: { projectId: source.projectId, nodeId: source.id, version },
    lock: null,
    job: null,
  };
  return ok(
    { ...withId, nodes: [...withId.nodes, card], selectedNodeId: id },
    `已绑定 ${source.name} v${version}。这是引用，不是复制。`,
  );
}

export function archiveNode(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (!node.frozen) return err(state, "还没被成功使用，不必归档");
  return ok(replaceNode(state, { ...node, archived: true }), "已归档。内容和来源都还在，冻结也不会解除。");
}

export function deleteNode(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.frozen) return err(state, "已被成功使用，只能归档，不能删除");
  return ok(
    {
      ...state,
      nodes: state.nodes.filter((item) => item.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    },
    node.reference ? "已移除引用卡。源资产还在。" : "已删除这个还没被成功使用的节点。",
  );
}

export function setTestResult(
  state: DemoState,
  nodeId: string,
  itemId: string,
  status: "pass" | "fail" | "pending",
  note: string,
): Outcome {
  const node = nodeById(state, nodeId);
  if (!node || node.kind !== "testcase") return err(state, "这不是用例节点");
  const results = { ...(state.testResults[nodeId] ?? {}) };
  results[itemId] = { status, note: note.trim() };
  return ok(
    { ...state, testResults: { ...state.testResults, [nodeId]: results } },
    "已记下人工结果。这不是自动执行。",
  );
}

export function uploadReport(state: DemoState, sourceNodeId: string, text: string): Outcome {
  const source = nodeById(state, sourceNodeId);
  if (!source) return err(state, "没有来源节点");
  const body = text.trim();
  if (!body) return err(state, "报告是空的");
  const added = addNode(state, "doc", { x: source.position.x + 340, y: source.position.y }, "测试报告");
  if (!added.ok) return added;
  const report = added.state.nodes.find((node) => node.id === added.state.selectedNodeId);
  if (!report) return err(state, "报告节点没有建出来");
  const version: DemoNode["versions"][number] = {
    version: 1,
    at: new Date().toISOString(),
    by: state.activeRole,
    instruction: "上传本地报告",
    summary: "人工上传的报告",
    body: `【导入 · 不是系统采集】\n${body}`,
    html: "",
    items: [],
    origin: "import",
    specVersion: state.specVersion,
    consumed: [],
    associations: [{ nodeId: source.id, version: currentVersion(source)?.version ?? 1, itemId: "" }],
    checks: null,
    visual: null,
  };
  return ok(
    replaceNode(added.state, { ...report, versions: [version] }),
    "报告放在设计文档节点里，只做关联记录，没有往上游连线。",
  );
}

export function setVisual(
  state: DemoState,
  nodeId: string,
  visual: "accepted" | "rejected",
): Outcome {
  const node = nodeById(state, nodeId);
  const version = node ? currentVersion(node) : undefined;
  if (!node || !version) return err(state, "还没有可验收的版本");
  const versions = node.versions.map((item) =>
    item.version === version.version ? { ...item, visual } : item,
  );
  return ok(
    replaceNode(state, { ...node, versions }),
    visual === "accepted" ? "已记下视觉通过。这不改变冻结。" : "已记下视觉退回。冻结保持原样。",
  );
}

export function setFormatCheck(state: DemoState, nodeId: string, format: "pass" | "fail"): Outcome {
  const node = nodeById(state, nodeId);
  const version = node ? currentVersion(node) : undefined;
  if (!node || !version?.checks) return err(state, "还没有检查记录");
  const checks = { ...version.checks, format };
  const versions = node.versions.map((item) =>
    item.version === version.version ? { ...item, checks } : item,
  );
  return ok(replaceNode(state, { ...node, versions }), "检查记录已更新。冻结没有变化。");
}

export function selectNode(state: DemoState, nodeId: string | null): DemoState {
  return { ...state, selectedNodeId: nodeId };
}

export function setRole(state: DemoState, roleId: RoleId): DemoState {
  return { ...state, activeRole: roleId };
}

export function setCanvas(state: DemoState, canvasId: string): DemoState {
  return { ...state, activeCanvasId: canvasId, selectedNodeId: null, intentAsk: null, compareIds: [] };
}

export function createProject(state: DemoState, name: string): Outcome {
  const trimmed = name.trim();
  if (!trimmed) return err(state, "先写项目名称");
  const [withId, id] = nextId(state, "project");
  const roles = ALL_ROLES.filter((role) => role !== "guest");
  return ok(
    {
      ...withId,
      projects: [...withId.projects, { id, name: trimmed }],
      access: { ...withId.access, [id]: roles },
    },
    "已新建项目",
  );
}

export function createCanvas(state: DemoState, projectId: string, name: string): Outcome {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return err(state, "项目不存在");
  if (!canAccess(state, state.activeRole, projectId)) return err(state, "你不能在这个项目里新建画布");
  const [withId, id] = nextId(state, "canvas");
  return ok(
    {
      ...withId,
      canvases: [...withId.canvases, { id, projectId, name: name.trim() || "未命名画布", sample: false }],
      activeCanvasId: id,
      selectedNodeId: null,
      intentAsk: null,
      compareIds: [],
    },
    "已新建画布",
  );
}

export function renameCanvas(state: DemoState, canvasId: string, name: string): Outcome {
  const canvas = state.canvases.find((item) => item.id === canvasId);
  if (!canvas) return err(state, "画布不存在");
  if (!canAccess(state, state.activeRole, canvas.projectId)) return err(state, "你不能编辑这个项目");
  const trimmed = name.trim();
  if (!trimmed) return err(state, "画布名称不能为空");
  return ok(
    {
      ...state,
      canvases: state.canvases.map((item) => (item.id === canvasId ? { ...item, name: trimmed } : item)),
    },
    "已重命名画布",
  );
}

export function deleteCanvas(state: DemoState, canvasId: string): Outcome {
  const canvas = state.canvases.find((item) => item.id === canvasId);
  if (!canvas) return err(state, "画布不存在");
  if (canvas.sample) return err(state, "示例画布不能删除。要恢复初始内容，用重置示例。");
  if (!canAccess(state, state.activeRole, canvas.projectId)) return err(state, "你不能编辑这个项目");
  const nodeIds = new Set(state.nodes.filter((node) => node.canvasId === canvasId).map((node) => node.id));
  const canvases = state.canvases.filter((item) => item.id !== canvasId);
  const fallback = canvases.find((item) => canAccess(state, state.activeRole, item.projectId)) ?? canvases[0];
  return ok(
    {
      ...state,
      canvases,
      nodes: state.nodes.filter((node) => node.canvasId !== canvasId),
      edges: state.edges.filter((edge) => edge.canvasId !== canvasId),
      comments: state.comments.filter((item) => !nodeIds.has(item.nodeId)),
      reminders: state.reminders.filter((item) => !nodeIds.has(item.nodeId)),
      activeCanvasId: state.activeCanvasId === canvasId ? (fallback?.id ?? "") : state.activeCanvasId,
      selectedNodeId: null,
    },
    "已删除画布",
  );
}

export function resetSamples(state: DemoState, seed: DemoState): DemoState {
  const sampleCanvasIds = new Set(seed.canvases.filter((canvas) => canvas.sample).map((canvas) => canvas.id));
  const sampleProjectIds = new Set(seed.projects.map((project) => project.id));
  const userCanvases = state.canvases.filter((canvas) => !canvas.sample && !sampleCanvasIds.has(canvas.id));
  const userCanvasIds = new Set(userCanvases.map((canvas) => canvas.id));
  const userProjects = state.projects.filter((project) => !sampleProjectIds.has(project.id));
  const userNodes = state.nodes.filter((node) => userCanvasIds.has(node.canvasId));
  const userNodeIds = new Set(userNodes.map((node) => node.id));
  const userTests = Object.fromEntries(Object.entries(state.testResults).filter(([nodeId]) => userNodeIds.has(nodeId)));
  const keepActive = userCanvasIds.has(state.activeCanvasId) || sampleCanvasIds.has(state.activeCanvasId);
  return {
    ...seed,
    seq: Math.max(seed.seq, state.seq),
    specVersion: state.specVersion,
    specText: state.specText,
    projects: [...seed.projects, ...userProjects],
    canvases: [...seed.canvases, ...userCanvases],
    nodes: [...seed.nodes, ...userNodes],
    edges: [...seed.edges, ...state.edges.filter((edge) => userCanvasIds.has(edge.canvasId))],
    comments: [...seed.comments, ...state.comments.filter((item) => userNodeIds.has(item.nodeId))],
    reminders: [...seed.reminders, ...state.reminders.filter((item) => userNodeIds.has(item.nodeId))],
    access: {
      ...seed.access,
      ...Object.fromEntries(userProjects.map((project) => [project.id, state.access[project.id] ?? []])),
    },
    revoked: [...seed.revoked, ...state.revoked.filter((item) => !sampleProjectIds.has(item.projectId))],
    testResults: { ...seed.testResults, ...userTests },
    activeRole: state.activeRole,
    activeCanvasId: keepActive ? state.activeCanvasId : seed.activeCanvasId,
    selectedNodeId: null,
    intentAsk: null,
    compareIds: [],
  };
}

export function toggleCompare(state: DemoState, nodeId: string): DemoState {
  const has = state.compareIds.includes(nodeId);
  const compareIds = has
    ? state.compareIds.filter((id) => id !== nodeId)
    : [...state.compareIds, nodeId].slice(-2);
  return { ...state, compareIds };
}

export function bumpVersion(state: DemoState, nodeId: string): Outcome {
  const node = nodeById(state, nodeId);
  if (!node) return err(state, "节点不存在");
  if (node.frozen) return err(state, "已冻结，不能原地出新版本");
  const version = currentVersion(node);
  if (!version) return err(state, "还没有版本");
  const nextVersion = {
    ...version,
    version: version.version + 1,
    at: new Date().toISOString(),
    origin: "manual" as const,
    summary: `${version.summary} · 手工再记了一版`,
    instruction: "手工再记一版",
    consumed: [],
  };
  const written = replaceNode(state, { ...node, versions: [...node.versions, nextVersion] });
  return ok(
    {
      ...written,
      nodes: written.nodes.map((item) => {
        if (!item.job || item.job.status !== "running") return item;
        if (!item.job.pinned.some((pin) => pin.nodeId === node.id)) return item;
        return {
          ...item,
          job: {
            ...item.job,
            status: "stopped",
            ask: `${node.name} 已更新到 v${nextVersion.version}。要按新版本重试吗？`,
          },
        };
      }),
    },
    "已写出新版本。正在引用旧版本的作业已停止，没有冻结。",
  );
}

export function coverage(state: DemoState, canvasId: string) {
  const nodes = state.nodes.filter((node) => node.canvasId === canvasId);
  const edges = state.edges.filter((edge) => edge.canvasId === canvasId);
  const docs = nodes.filter((node) => node.kind === "doc");
  const cases = nodes.filter((node) => node.kind === "testcase");
  const pages = nodes.filter((node) => node.kind === "page");
  return docs.map((doc) => {
    const linkedCases = cases.filter((item) =>
      edges.some((edge) => edge.source === doc.id && edge.target === item.id),
    );
    const linkedPages = pages.filter((item) =>
      edges.some(
        (edge) =>
          edge.target === item.id &&
          (edge.source === doc.id || linkedCases.some((test) => test.id === edge.source)),
      ),
    );
    return {
      docId: doc.id,
      docName: doc.name,
      cases: linkedCases.map((item) => item.name),
      pages: linkedPages.map((item) => item.name),
      gap: linkedCases.length === 0 || linkedPages.length === 0,
    };
  });
}

export function testSummary(state: DemoState, nodeId: string) {
  const node = nodeById(state, nodeId);
  const version = node ? currentVersion(node) : undefined;
  const items = version?.items.filter((item) => !node?.removedItemIds.includes(item.id)) ?? [];
  const results = state.testResults[nodeId] ?? {};
  const counts = { pass: 0, fail: 0, pending: 0 };
  for (const item of items) {
    const status = results[item.id]?.status ?? "pending";
    counts[status] += 1;
  }
  return { total: items.length, ...counts };
}
