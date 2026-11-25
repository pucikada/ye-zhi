"use client";

import { useState } from "react";

import { useCanvasUi } from "@/components/demo/canvas-ui";
import { ROLES, KIND_LABEL, type RoleId } from "@/lib/demo/types";
import { canAccess, coverage, currentVersion, instructionGate, nodeById, testSummary, versionOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

export function DemoSide() {
  const selectedId = useDemo((state) => state.selectedNodeId);
  return (
    <aside className="hidden h-full w-[min(380px,38vw)] shrink-0 flex-col overflow-auto border-l border-white/10 bg-[#101218] lg:flex">
      <div className="px-3 py-3">
        {selectedId ? <NodePanel /> : <p className="text-sm text-white/50">选中节点后，在节点下方写指令。这里查看版本、引用和提醒。</p>}
        <Compare />
        <Matrix />
      </div>
    </aside>
  );
}

function NodePanel() {
  const state = useDemo();
  const node = state.nodes.find((item) => item.id === state.selectedNodeId);
  const [comment, setComment] = useState("");
  const [reminder, setReminder] = useState("请看一下这个节点");
  const [targets, setTargets] = useState<RoleId[]>(["fe"]);
  if (!node) return null;
  const version = currentVersion(node);
  const source = node.reference ? nodeById(state, node.reference.nodeId) : undefined;
  const allowed = node.reference ? canAccess(state, state.activeRole, node.reference.projectId) : canAccess(state, state.activeRole, node.projectId);
  const shown = node.reference && source && allowed ? versionOf(source, node.reference.version) : allowed ? version : undefined;
  const incoming = state.edges.filter((edge) => edge.target === node.id);
  const summary = testSummary(state, node.id);
  const gate = instructionGate(state, node.id);
  const sourceProject = node.reference?.projectId;

  return (
    <div className="grid gap-3 text-[12px] text-white/80">
      <div>
        <h2 className="text-sm font-medium text-white">{allowed ? node.name : "无权访问"}</h2>
        <p className="text-white/45">
          {KIND_LABEL[node.kind]} · {node.frozen ? "永久冻结" : "未冻结"}
          {node.freezeNote ? ` · ${node.freezeNote}` : ""}
        </p>
      </div>
      {node.reference ? (
        <p className={allowed ? "text-white/60" : "text-[#f3a0c0]"}>
          {allowed ? `引用 ${source?.name ?? "来源"} v${node.reference.version}，没有复制内容。` : "无权访问。不能读取来源，也不能再用它生成。"}
        </p>
      ) : null}
      {gate.reason ? <p className="text-[#f3a0c0]">{gate.reason}</p> : null}
      {node.frozen ? <p className="text-white/45">要修改请在节点下方提交，系统会派生新节点。</p> : null}
      {node.job?.status === "running" ? (
        <div className="flex gap-2">
          <Small onClick={() => state.cancel(node.id)}>取消作业</Small>
          <Small onClick={() => state.simulateFail(node.id)}>标记失败</Small>
        </div>
      ) : null}
      {node.job?.status === "stopped" ? (
        <div className="grid gap-2 rounded-lg border border-white/15 p-2">
          <p>{node.job.ask}</p>
          <div className="flex gap-2">
            <Small onClick={() => state.retry(node.id)}>按新版本重试</Small>
            <Small onClick={() => state.dismiss(node.id)}>不重试</Small>
          </div>
        </div>
      ) : null}
      {node.job?.status === "failed" ? <p>{node.job.ask || "生成失败，旧结果还在。"}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Small onClick={() => useCanvasUi.getState().openPreview(node.id)}>查看产物</Small>
        <Small onClick={() => state.lock(node.id)}>开始编辑</Small>
        <Small onClick={() => state.unlock(node.id)}>放开编辑</Small>
        {!node.frozen ? <Small onClick={() => state.simulateBump(node.id)}>再记一版</Small> : null}
        {node.frozen ? <Small onClick={() => state.archive(node.id)}>归档</Small> : null}
        <Small onClick={() => state.compare(node.id)}>加入对比</Small>
        {sourceProject ? (
          <Small
            onClick={() =>
              state.revoked.some((item) => item.roleId === state.activeRole && item.projectId === sourceProject)
                ? state.restore(state.activeRole, sourceProject)
                : state.revoke(state.activeRole, sourceProject)
            }
          >
            {state.revoked.some((item) => item.roleId === state.activeRole && item.projectId === sourceProject) ? "恢复来源访问" : "撤回来源访问"}
          </Small>
        ) : null}
      </div>
      {shown?.checks ? (
        <div className="grid gap-1 rounded-md border border-white/10 p-2">
          <p>
            构建 {shown.checks.build} · 类型 {shown.checks.types} · 格式 {shown.checks.format}
          </p>
          <p>{shown.checks.note}</p>
          <p>视觉验收：{shown.visual === "accepted" ? "通过" : shown.visual === "rejected" ? "退回" : "待人工"}。检查不改变冻结。</p>
          <div className="flex gap-2">
            <Small onClick={() => state.visual(node.id, "accepted")}>视觉通过</Small>
            <Small onClick={() => state.visual(node.id, "rejected")}>视觉退回</Small>
          </div>
        </div>
      ) : null}
      {node.kind === "testcase" && shown ? (
        <div className="grid gap-2">
          <p>
            人工记录 {summary.pass} 通过 / {summary.fail} 失败 / {summary.pending} 未执行，共 {summary.total}。自动执行未接入。
          </p>
          {shown.items.map((item) => {
            const result = state.testResults[node.id]?.[item.id];
            const dead = node.removedItemIds.includes(item.id);
            return (
              <div key={item.id} className="rounded-md border border-white/10 p-2">
                <p>
                  {item.group} · {item.name} {dead ? "· 引用已失效" : ""}
                </p>
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
          <Small onClick={() => state.report(node.id, "人工执行记录见上。自动回归未接入。")}>上传为文档节点</Small>
        </div>
      ) : null}
      {shown && shown.items.length > 0 && node.kind !== "testcase" ? (
        <div className="grid gap-1">
          {shown.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span className={node.removedItemIds.includes(item.id) ? "line-through" : ""}>{item.name}</span>
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
        <p className="mb-1 text-white/45">上游引用</p>
        {incoming.length === 0 ? <p>没有上游。</p> : null}
        {incoming.map((edge) => {
          const from = nodeById(state, edge.source);
          const denied = from?.reference ? !canAccess(state, state.activeRole, from.reference.projectId) : false;
          const real = from?.reference ? nodeById(state, from.reference.nodeId) : from;
          const itemName = edge.itemId && real && !denied ? versionOf(real, edge.sourceVersion)?.items.find((item) => item.id === edge.itemId)?.name : "";
          return (
            <p key={edge.id}>
              {denied ? "无权访问" : `${from?.name ?? edge.source} v${edge.sourceVersion}`}
              {itemName ? ` · ${itemName}` : edge.itemId ? " · 项" : ""}
              <button type="button" className="ml-2 underline" onClick={() => state.unlink(edge.id)}>
                删除
              </button>
            </p>
          );
        })}
      </div>
      <div className="grid gap-1">
        <p className="text-white/45">版本</p>
        {allowed
          ? (node.reference && source ? source.versions : node.versions).map((item) => (
              <p key={item.version}>
                v{item.version} · {item.specVersion} · {item.origin === "mock-ai" ? "模拟" : item.origin === "import" ? "导入" : "手工"} · {item.summary}
              </p>
            ))
          : null}
        {node.derivedFrom ? <p>派生来源保留在节点上，这条记录本身不冻结。</p> : null}
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
        提醒
        <textarea className="min-h-12 rounded-md border border-white/10 bg-black/30 p-2" value={reminder} onChange={(event) => setReminder(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1">
        {ROLES.filter((role) => role.id !== state.activeRole).map((role) => (
          <button
            key={role.id}
            type="button"
            className={`rounded-full border px-2 py-0.5 ${targets.includes(role.id) ? "border-[#dff25a] text-white" : "border-white/10 text-white/50"}`}
            onClick={() => setTargets((current) => (current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id]))}
          >
            {role.name}
          </button>
        ))}
      </div>
      <Small onClick={() => state.sendReminder(node.id, targets, reminder)}>发送提醒</Small>
    </div>
  );
}

function Compare() {
  const state = useDemo();
  if (state.compareIds.length < 2) return null;
  const pair = state.compareIds.map((id) => nodeById(state, id)).filter((node) => node != null);
  return (
    <div className="mt-4 grid gap-2">
      <p className="text-[12px] text-white/50">并排对比 · 不自动替换</p>
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
  const hasCases = state.nodes.some((node) => node.canvasId === state.activeCanvasId && node.kind === "testcase");
  if (!hasCases) return null;
  const rows = coverage(state, state.activeCanvasId);
  return (
    <div className="mt-4 grid gap-1 text-[12px]">
      <p className="text-white/50">覆盖只统计已经连上的文档、用例和页面。自动回归未接入。</p>
      {rows.map((row) => (
        <p key={row.docId}>
          {row.docName} · 用例 {row.cases.join("、") || "未登记"} · 页面 {row.pages.join("、") || "未登记"}
          {row.gap ? " · 有缺口" : ""}
        </p>
      ))}
    </div>
  );
}

function Small({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} className="rounded border border-white/15 px-2 py-1 text-[11px] text-white disabled:opacity-40" onClick={onClick}>
      {children}
    </button>
  );
}
