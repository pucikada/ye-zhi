"use client";

import { useState } from "react";

import { currentStep, scenarioOf } from "@/lib/demo/guide";
import { ROLES, KIND_LABEL, type RoleId } from "@/lib/demo/types";
import {
  canAccess,
  coverage,
  currentVersion,
  nodeById,
  testSummary,
  versionOf,
} from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

export function DemoSide() {
  const state = useDemo();
  const canvasNodes = state.nodes.filter((node) => node.canvasId === state.activeCanvasId && !node.archived);
  const node = canvasNodes.find((item) => item.id === state.selectedNodeId) ?? null;
  const { steps, index } = currentStep(state);
  const scenario = scenarioOf(state);

  return (
    <aside className="flex h-full w-[min(420px,42vw)] shrink-0 flex-col border-l border-white/10 bg-[#101218]">
      <div className="border-b border-white/10 px-3 py-2">
        <p className="text-[11px] text-white/45">逐步引导 · 按钮会真正改状态</p>
        <ol className="mt-2 grid gap-1">
          {steps.map((step, stepIndex) => (
            <li key={step.title} className={stepIndex === index ? "text-[#dff25a]" : "text-white/70"}>
              <span className="text-[12px]">
                {step.done ? "已完成" : stepIndex === index ? "当前" : "待做"} · {step.title}
              </span>
              {stepIndex === index ? <p className="text-[11px] text-white/45">{step.detail}</p> : null}
            </li>
          ))}
        </ol>
        <div className="mt-2">
          <GuideButton scenario={scenario} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {node ? <NodePanel /> : <p className="text-sm text-white/50">选中一个节点，查看版本、引用和提醒。</p>}
        <Compare />
        <Matrix />
      </div>
    </aside>
  );
}

function GuideButton({ scenario }: { scenario: ReturnType<typeof scenarioOf> }) {
  const state = useDemo();
  const add = useDemo((store) => store.add);
  const instruct = useDemo((store) => store.instruct);
  const link = useDemo((store) => store.link);
  const sendReminder = useDemo((store) => store.sendReminder);
  const chooseRole = useDemo((store) => store.chooseRole);
  const settleReminder = useDemo((store) => store.settleReminder);
  const cite = useDemo((store) => store.cite);
  const revoke = useDemo((store) => store.revoke);
  const restore = useDemo((store) => store.restore);
  const recordTest = useDemo((store) => store.recordTest);
  const report = useDemo((store) => store.report);
  const compare = useDemo((store) => store.compare);
  const { index } = currentStep(state);
  const nodes = state.nodes.filter((node) => node.canvasId === state.activeCanvasId);
  const find = (kind: (typeof nodes)[number]["kind"]) => nodes.find((node) => node.kind === kind);

  if (index < 0) return <p className="text-[12px] text-white/50">这一场景的引导步骤都走完了，仍可以继续手动操作。</p>;

  const button = (label: string, onClick: () => void) => (
    <button type="button" className="rounded-md bg-[#dff25a] px-2 py-1 text-[12px] font-medium text-[#1a1c08]" onClick={onClick}>
      {label}
    </button>
  );

  if (scenario === "campaign") {
    if (index === 0) return button("放入设计文档", () => add("doc", { x: 40, y: 40 }));
    if (index === 1) {
      const doc = find("doc");
      return button("生成文档（Mock）", () => doc && instruct(doc.id, "微调：春日活动报名页，面向独立开发者"));
    }
    if (index === 2) {
      const doc = find("doc");
      const api = find("api");
      if (!api) return button("放入数据接口", () => add("api", { x: 360, y: 40 }));
      if (doc && !state.edges.some((edge) => edge.source === doc.id && edge.target === api.id)) {
        return button("连上文档", () => link(doc.id, api.id));
      }
      return button("生成接口（Mock）", () => instruct(api.id, "微调：按文档列接口"));
    }
    if (index === 3) {
      const api = find("api");
      return button("提醒陈页对接", () => api && sendReminder(api.id, ["fe"], "接口已整理，请对接页面"));
    }
    if (index === 4) {
      if (state.activeRole !== "fe") return button("切换为陈页", () => chooseRole("fe"));
      const reminder = state.reminders.find((item) => item.to === "fe" && !item.handled);
      return button("标记已处理", () => reminder && settleReminder(reminder.id, "已看到，开始对接"));
    }
    if (index === 5) {
      const design = find("design");
      if (!design) return button("放入设计稿", () => add("design", { x: 40, y: 320 }));
      return button("生成方案①", () => instruct(design.id, "微调：春日绿底和黄按钮"));
    }
    if (index === 6) {
      const design = find("design");
      return button("追问：再活泼一点", () => design && instruct(design.id, "再活泼一点"));
    }
    if (index === 7) {
      const design = nodes.filter((node) => node.kind === "design").at(-1);
      const component = find("component");
      if (!component) return button("放入组件资产", () => add("component", { x: 360, y: 320 }));
      if (design && !state.edges.some((edge) => edge.source === design.id && edge.target === component.id)) {
        return button("连上设计稿", () => link(design.id, component.id));
      }
      return button("生成组件清单", () => instruct(component.id, "微调：识别轮播、图标和按钮"));
    }
    const page = find("page");
    const api = find("api");
    const component = find("component");
    const design = nodes.filter((item) => item.kind === "design").at(-1);
    if (!page) return button("放入页面", () => add("page", { x: 700, y: 180 }));
    if (api && !state.edges.some((edge) => edge.source === api.id && edge.target === page.id)) {
      return button("连上 POST /join", () => link(api.id, page.id, "item-post-join"));
    }
    if (design && !state.edges.some((edge) => edge.source === design.id && edge.target === page.id)) {
      return button("连上设计稿", () => link(design.id, page.id));
    }
    if (component && !state.edges.some((edge) => edge.source === component.id && edge.target === page.id)) {
      return button("连上组件资产", () => link(component.id, page.id));
    }
    return button("生成页面代码", () => instruct(page.id, "微调：汇合接口、设计和组件"));
  }

  if (scenario === "restyle") {
    const design = nodes.find((node) => node.kind === "design" && node.frozen && !node.derivedFrom);
    const derived = nodes.find((node) => node.kind === "design" && node.derivedFrom);
    if (index === 1) return button("要求换成夜航", () => design && instruct(design.id, "换成夜航配色"));
    if (index === 2) {
      const page = nodes.find((node) => node.kind === "page" && !node.online);
      if (!page) return button("新建候选页面", () => add("page", { x: 700, y: 280 }));
      if (derived && !state.edges.some((edge) => edge.source === derived.id && edge.target === page.id)) {
        return button("把 b 连到候选页", () => link(derived.id, page.id));
      }
      return button("生成候选页", () => instruct(page.id, "微调：按新设计稿生成候选页"));
    }
    if (index === 3) {
      const page = nodes.find((node) => node.kind === "page" && !node.online);
      return button("生成候选页", () => page && instruct(page.id, "微调：按新设计稿生成候选页"));
    }
    if (index === 4) {
      const live = nodes.find((node) => node.online);
      const candidate = nodes.find((node) => node.kind === "page" && !node.online && node.versions.length > 0);
      return button("并排对比两页", () => {
        if (live) compare(live.id);
        if (candidate) compare(candidate.id);
      });
    }
    return <p className="text-[12px] text-white/45">线上稿已经冻结。选中设计稿 a 再提修改。</p>;
  }

  if (scenario === "reuse") {
    const library = state.nodes.find((node) => node.name === "活动倒计时");
    const version = library ? currentVersion(library)?.version ?? 1 : 1;
    if (index === 0) return button("引用倒计时 v" + version, () => library && cite(library.id, version));
    if (index === 1) {
      const card = nodes.find((node) => node.reference);
      const page = nodes.find((node) => node.kind === "page");
      if (!page) return button("放入页面", () => add("page", { x: 380, y: 80 }));
      if (card && !state.edges.some((edge) => edge.source === card.id && edge.target === page.id)) {
        return button("连上引用卡", () => link(card.id, page.id));
      }
      return button("用引用生成页面", () => page && instruct(page.id, "微调：使用倒计时组件做会员日页"));
    }
    if (index === 2) {
      const card = nodes.find((node) => node.reference);
      return button("从引用派生新资产", () => card && instruct(card.id, "另做：把倒计时改成会员日配色"));
    }
    const revoked = state.revoked.some((item) => item.roleId === state.activeRole && item.projectId === "p-lib");
    if (revoked) return button("恢复对品牌资产的访问", () => restore(state.activeRole, "p-lib"));
    return button("撤掉我的品牌资产访问", () => revoke(state.activeRole, "p-lib"));
  }

  const cases = nodes.find((node) => node.kind === "testcase");
  const doc = nodes.find((node) => node.kind === "doc" && !node.name.includes("报告"));
  const api = nodes.find((node) => node.kind === "api" && !node.derivedFrom);
  if (index === 0) {
    if (cases && doc && !state.edges.some((edge) => edge.source === doc.id && edge.target === cases.id)) {
      return button("把需求连到用例", () => link(doc.id, cases.id));
    }
    if (cases && api && !state.edges.some((edge) => edge.target === cases.id && edge.itemId === "item-post-join")) {
      return button("连上 POST /join", () => link(api.id, cases.id, "item-post-join"));
    }
    return button("生成用例（Mock）", () => cases && instruct(cases.id, "微调：覆盖正常、重复和结束"));
  }
  if (index === 1) {
    return button("把重复报名标为失败", () => cases && recordTest(cases.id, "item-dup", "fail", "演示：同一用户第二次报名仍返回 200"));
  }
  if (index === 2) return button("上传本地报告", () => cases && report(cases.id, "人工执行 4 条，失败 1 条：重复报名。不是自动采集。"));
  return button("派生接口修复", () => api && instruct(api.id, "另做：重复报名返回 409"));
}

function NodePanel() {
  const state = useDemo();
  const node = state.nodes.find((item) => item.id === state.selectedNodeId);
  const [text, setText] = useState("微调这一版的文案");
  const [comment, setComment] = useState("");
  const [reminder, setReminder] = useState("请看一下这个节点");
  const [targets, setTargets] = useState<RoleId[]>(["fe"]);
  if (!node) return null;
  const version = currentVersion(node);
  const locked = node.lock && node.lock.roleId !== state.activeRole;
  const source = node.reference ? nodeById(state, node.reference.nodeId) : undefined;
  const allowed = node.reference ? canAccess(state, state.activeRole, node.reference.projectId) : true;
  const shown = node.reference && source ? versionOf(source, node.reference.version) : version;
  const incoming = state.edges.filter((edge) => edge.target === node.id);
  const summary = testSummary(state, node.id);

  return (
    <div className="grid gap-3 text-[12px] text-white/80">
      <div>
        <h2 className="text-sm font-medium text-white">{node.name}</h2>
        <p className="text-white/45">
          {KIND_LABEL[node.kind]} · {node.frozen ? "永久冻结" : "未冻结"}
          {node.freezeNote ? ` · ${node.freezeNote}` : ""}
        </p>
      </div>
      {node.reference ? (
        <p className={allowed ? "text-white/60" : "text-[#f3a0c0]"}>
          {allowed
            ? `引用 ${source?.name ?? "来源"} v${node.reference.version}，没有复制内容。`
            : "无权访问。不能读取来源，也不能再用它生成。"}
        </p>
      ) : null}
      {locked ? <p>当前由别人编辑，你只能看、评论和提醒。</p> : null}
      {node.job?.status === "running" ? (
        <div className="flex gap-2">
          <Small onClick={() => state.cancel(node.id)}>取消作业</Small>
          <Small onClick={() => state.simulateFail(node.id)}>模拟失败</Small>
        </div>
      ) : null}
      {node.job?.status === "stopped" ? (
        <div className="grid gap-2 rounded-lg border border-[#dff25a]/40 p-2">
          <p>{node.job.ask}</p>
          <div className="flex gap-2">
            <Small onClick={() => state.retry(node.id)}>按新版本重试</Small>
            <Small onClick={() => state.dismiss(node.id)}>不重试</Small>
          </div>
        </div>
      ) : null}
      {node.job?.status === "failed" ? <p>{node.job.ask || "演示失败，旧结果还在。"}</p> : null}
      <label className="grid gap-1">
        指令
        <textarea
          className="min-h-16 rounded-md border border-white/10 bg-black/30 p-2"
          value={text}
          disabled={Boolean(locked)}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Small onClick={() => state.instruct(node.id, text)} disabled={Boolean(locked)}>
          提交
        </Small>
        <Small onClick={() => state.lock(node.id)}>开始编辑</Small>
        <Small onClick={() => state.unlock(node.id)}>放开编辑</Small>
        {!node.frozen ? <Small onClick={() => state.simulateBump(node.id)}>演示上游更新</Small> : null}
        {node.frozen ? <Small onClick={() => state.archive(node.id)}>归档</Small> : null}
        <Small onClick={() => state.compare(node.id)}>加入对比</Small>
      </div>
      <p className="text-white/40">演示意图识别：含「微调 / 补充」走新版本，含「派生 / 另做」走新节点，否则先问。冻结后只能派生。</p>
      {shown ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-2 text-[11px]">{shown.body}</pre>
      ) : null}
      {shown?.html ? (
        <iframe title="节点预览" sandbox="" srcDoc={shown.html} className="h-48 w-full rounded-md bg-white" />
      ) : null}
      {shown?.checks ? (
        <div className="grid gap-1 rounded-md border border-white/10 p-2">
          <p>构建 {shown.checks.build} · 类型 {shown.checks.types} · 格式 {shown.checks.format}</p>
          <p>{shown.checks.note}</p>
          <p>视觉验收：{shown.visual === "accepted" ? "通过" : shown.visual === "rejected" ? "退回" : "待人工"}。检查不改变冻结。</p>
          <div className="flex gap-2">
            <Small onClick={() => state.visual(node.id, "accepted")}>视觉通过</Small>
            <Small onClick={() => state.visual(node.id, "rejected")}>视觉退回</Small>
            <Small onClick={() => state.formatCheck(node.id, shown.checks?.format === "pass" ? "fail" : "pass")}>
              切换格式检查
            </Small>
          </div>
        </div>
      ) : null}
      {node.kind === "testcase" && shown ? (
        <div className="grid gap-2">
          <p>
            人工记录 {summary.pass} 通过 / {summary.fail} 失败 / {summary.pending} 未执行，共 {summary.total}。不是自动采集。
          </p>
          {shown.items.map((item) => {
            const result = state.testResults[node.id]?.[item.id];
            const dead = node.removedItemIds.includes(item.id);
            return (
              <div key={item.id} className="rounded-md border border-white/10 p-2">
                <p>
                  {item.group} · {item.name} {dead ? "· 引用已失效" : ""}
                </p>
                <p className="text-white/45">{item.detail}</p>
                <div className="mt-1 flex gap-1">
                  {(["pass", "fail", "pending"] as const).map((status) => (
                    <Small key={status} onClick={() => state.recordTest(node.id, item.id, status, result?.note ?? "")}>
                      {status === "pass" ? "通过" : status === "fail" ? "失败" : "未执行"}
                    </Small>
                  ))}
                </div>
              </div>
            );
          })}
          <Small onClick={() => state.report(node.id, "人工执行记录见上。真实自动回归后续做。")}>上传为文档节点</Small>
        </div>
      ) : null}
      {shown && shown.items.length > 0 && node.kind !== "testcase" ? (
        <div className="grid gap-1">
          {shown.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span className={node.removedItemIds.includes(item.id) ? "line-through" : ""}>
                {item.name}
              </span>
              {node.frozen ? null : (
                <span className="flex gap-1">
                  <Small onClick={() => state.renameEntry(node.id, item.id, `${item.name}*`)}>改名</Small>
                  <Small onClick={() => state.dropEntry(node.id, item.id)}>删除项</Small>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-white/45">入边（具体版本）</p>
        {incoming.length === 0 ? <p>没有上游。</p> : null}
        {incoming.map((edge) => {
          const from = nodeById(state, edge.source);
          const ref = from?.reference ? nodeById(state, from.reference.nodeId) : undefined;
          const denied = from?.reference ? !canAccess(state, state.activeRole, from.reference.projectId) : false;
          return (
            <p key={edge.id}>
              {denied ? "无权访问" : `${from?.name ?? edge.source} v${edge.sourceVersion}`}
              {edge.itemId ? ` · ${edge.itemId}` : ""}
              {ref && denied ? " · 源已不可读" : ""}
              <button type="button" className="ml-2 underline" onClick={() => state.unlink(edge.id)}>
                删除
              </button>
            </p>
          );
        })}
      </div>
      <div className="grid gap-1">
        <p className="text-white/45">版本</p>
        {(node.reference && source ? source.versions : node.versions).map((item) => (
          <p key={item.version}>
            v{item.version} · {item.specVersion} · {item.origin} · {item.summary}
          </p>
        ))}
        {node.derivedFrom ? (
          <p>
            派生来源 {node.derivedFrom.nodeId} v{node.derivedFrom.version}。这条记录本身不冻结。
          </p>
        ) : null}
      </div>
      <label className="grid gap-1">
        评论
        <textarea className="min-h-12 rounded-md border border-white/10 bg-black/30 p-2" value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <Small onClick={() => state.note(node.id, comment)}>写评论</Small>
      {state.comments
        .filter((item) => item.nodeId === node.id)
        .map((item) => (
          <p key={item.id}>
            {ROLES.find((role) => role.id === item.roleId)?.name}：{item.text}
          </p>
        ))}
      <label className="grid gap-1">
        提醒说明
        <textarea className="min-h-12 rounded-md border border-white/10 bg-black/30 p-2" value={reminder} onChange={(event) => setReminder(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1">
        {ROLES.filter((role) => role.id !== state.activeRole).map((role) => (
          <button
            key={role.id}
            type="button"
            className={`rounded-full border px-2 py-0.5 ${targets.includes(role.id) ? "border-[#dff25a] text-white" : "border-white/10 text-white/50"}`}
            onClick={() =>
              setTargets((current) =>
                current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id],
              )
            }
          >
            {role.name}
          </button>
        ))}
      </div>
      <Small onClick={() => state.sendReminder(node.id, targets, reminder)}>发送提醒</Small>
      {state.reminders
        .filter((item) => item.nodeId === node.id)
        .map((item) => (
          <p key={item.id}>
            {ROLES.find((role) => role.id === item.from)?.name} → {ROLES.find((role) => role.id === item.to)?.name}：{item.text}
            {item.handled ? ` · 已处理 ${item.note}` : " · 未处理"}
          </p>
        ))}
    </div>
  );
}

function Compare() {
  const state = useDemo();
  if (state.compareIds.length < 2) return null;
  const pair = state.compareIds.map((id) => nodeById(state, id)).filter((node) => node != null);
  return (
    <div className="mt-4 grid gap-2">
      <p className="text-[12px] text-white/50">并排对比 · 不自动替换线上</p>
      <div className="grid grid-cols-2 gap-2">
        {pair.map((node) => {
          const version = currentVersion(node);
          return version?.html ? (
            <iframe key={node.id} title={node.name} sandbox="" srcDoc={version.html} className="h-40 w-full rounded bg-white" />
          ) : (
            <pre key={node.id} className="max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-white/70">
              {node.name}
              {"\n"}
              {version?.summary}
            </pre>
          );
        })}
      </div>
    </div>
  );
}

function Matrix() {
  const state = useDemo();
  if (scenarioOfCanvas(state) !== "qa") return null;
  const rows = coverage(state, state.activeCanvasId);
  return (
    <div className="mt-4 grid gap-1 text-[12px]">
      <p className="text-white/50">覆盖矩阵只统计已登记的连线，不保证没有漏连。自动回归是后续能力，这里不会自动通过。</p>
      {rows.map((row) => (
        <p key={row.docId}>
          {row.docName} · 用例 {row.cases.join("、") || "未登记"} · 页面 {row.pages.join("、") || "未登记"}
          {row.gap ? " · 有缺口" : ""}
        </p>
      ))}
    </div>
  );
}

function scenarioOfCanvas(state: DemoStateSlice) {
  return state.canvases.find((canvas) => canvas.id === state.activeCanvasId)?.scenario;
}

type DemoStateSlice = {
  canvases: Array<{ id: string; scenario: string }>;
  activeCanvasId: string;
};

function Small({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded border border-white/15 px-2 py-1 text-[11px] text-white disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
