"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { DemoCanvas } from "@/components/demo/demo-canvas";
import { DemoSide } from "@/components/demo/demo-side";
import { KIND_LABEL, ROLES, type NodeKind, type RoleId } from "@/lib/demo/types";
import { currentVersion } from "@/lib/demo/rules";
import { SCENARIOS, useDemo } from "@/lib/demo/store";

const KINDS = Object.keys(KIND_LABEL) as NodeKind[];

export function DemoApp() {
  const hydrated = useDemo((state) => state.hydrated);
  const hydrate = useDemo((state) => state.hydrate);
  const [panel, setPanel] = useState<"canvas" | "assets" | "inbox">("canvas");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center bg-[#0c0d10] text-sm text-white">正在打开演示</div>;
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-dvh flex-col bg-[#0c0d10] text-[#eceae4]">
        <div className="border-b border-[#dff25a]/30 bg-[#1a1c08] px-3 py-1.5 text-[12px] text-[#dff25a]">
          演示模式 · 生成、作业、成员、提醒、权限、检查和测试统计都是 Mock。不调用真实 AI，不代表真实鉴权，也不会自动回归。
        </div>
        <Toolbar panel={panel} setPanel={setPanel} />
        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            {panel === "canvas" ? <DemoCanvas /> : null}
            {panel === "assets" ? <Assets onOpenCanvas={() => setPanel("canvas")} /> : null}
            {panel === "inbox" ? <Inbox onOpen={() => setPanel("canvas")} /> : null}
          </div>
          <DemoSide />
        </div>
        <Toast />
        <IntentAsk />
      </div>
    </ReactFlowProvider>
  );
}

function Toolbar({
  panel,
  setPanel,
}: {
  panel: "canvas" | "assets" | "inbox";
  setPanel: (panel: "canvas" | "assets" | "inbox") => void;
}) {
  const role = useDemo((state) => state.activeRole);
  const chooseRole = useDemo((state) => state.chooseRole);
  const openScenario = useDemo((state) => state.openScenario);
  const canvasId = useDemo((state) => state.activeCanvasId);
  const reset = useDemo((state) => state.reset);
  const add = useDemo((state) => state.add);
  const specVersion = useDemo((state) => state.specVersion);
  const spec = useDemo((state) => state.spec);
  const reminders = useDemo((state) => state.reminders.filter((item) => item.to === role && !item.handled).length);

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
      <span className="text-sm font-semibold">页织</span>
      {SCENARIOS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rounded-full px-2 py-1 text-[12px] ${canvasId === item.canvasId ? "bg-[#dff25a] text-[#1a1c08]" : "bg-white/5 text-white/70"}`}
          onClick={() => {
            openScenario(item.canvasId, item.role);
            setPanel("canvas");
          }}
        >
          {item.name}
        </button>
      ))}
      <label className="ml-auto text-[12px] text-white/60">
        角色
        <select
          className="ml-1 rounded border border-white/10 bg-transparent px-1 py-0.5"
          value={role}
          aria-label="切换演示角色"
          onChange={(event) => chooseRole(event.target.value as RoleId)}
        >
          {ROLES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.title}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="text-[12px] text-white/70" onClick={() => setPanel(panel === "assets" ? "canvas" : "assets")}>
        资产中心
      </button>
      <button type="button" className="text-[12px] text-white/70" onClick={() => setPanel(panel === "inbox" ? "canvas" : "inbox")}>
        提醒 {reminders}
      </button>
      <button
        type="button"
        className="text-[12px] text-white/70"
        onClick={() => spec(specVersion === "规范 v1" ? "规范 v2" : "规范 v1", "更新后的演示规范，只作用于之后的生成。")}
      >
        {specVersion}
      </button>
      <details className="text-[12px]">
        <summary className="cursor-pointer text-white/70">添加节点</summary>
        <div className="absolute z-20 mt-1 grid rounded-lg border border-white/10 bg-[#16181d] p-2">
          {KINDS.map((kind) => (
            <button key={kind} type="button" className="px-2 py-1 text-left hover:bg-white/5" onClick={() => add(kind, { x: 120, y: 120 })}>
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      </details>
      <button type="button" className="text-[12px] text-white/50" onClick={reset}>
        重置演示
      </button>
    </header>
  );
}

function Assets({ onOpenCanvas }: { onOpenCanvas: () => void }) {
  const nodes = useDemo((state) => state.nodes);
  const role = useDemo((state) => state.activeRole);
  const cite = useDemo((state) => state.cite);
  const [query, setQuery] = useState("");
  const visible = nodes.filter((node) => node.name.includes(query.trim()) || node.kind.includes(query.trim()));
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-sm font-medium">资产中心</h2>
      <p className="mt-1 text-[12px] text-white/45">一个节点一条资产。引用绑定选定版本，不复制内容。</p>
      <input
        className="mt-3 w-full max-w-sm rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm"
        placeholder="按名称检索"
        value={query}
        aria-label="检索资产"
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="mt-3 grid gap-2">
        {visible.map((node) => {
          const version = currentVersion(node);
          const allowed = (useDemo.getState().access[node.projectId] ?? []).includes(role) &&
            !useDemo.getState().revoked.some((item) => item.roleId === role && item.projectId === node.projectId);
          return (
            <article key={node.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <p>
                {node.name} · {KIND_LABEL[node.kind]} · {version ? `v${version.version}` : "无版本"}
                {node.frozen ? " · 已冻结" : ""}
              </p>
              {allowed ? (
                <p className="text-[12px] text-white/50">{version?.summary || "空资产"}</p>
              ) : (
                <p className="text-[12px] text-[#f3a0c0]">无权访问</p>
              )}
              {allowed && version ? (
                <button
                  type="button"
                  className="mt-2 text-[12px] text-[#dff25a]"
                  onClick={() => {
                    cite(node.id, version.version);
                    onOpenCanvas();
                  }}
                >
                  引用 v{version.version} 到当前画布
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Inbox({ onOpen }: { onOpen: () => void }) {
  const role = useDemo((state) => state.activeRole);
  const reminders = useDemo((state) => state.reminders);
  const nodes = useDemo((state) => state.nodes);
  const canvases = useDemo((state) => state.canvases);
  const openScenario = useDemo((state) => state.openScenario);
  const select = useDemo((state) => state.select);
  const settle = useDemo((state) => state.settleReminder);
  const mine = reminders.filter((item) => item.to === role);
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-sm font-medium">我的提醒</h2>
      <p className="mt-1 text-[12px] text-white/45">只显示当前角色的提醒。处理不会改别人的状态。</p>
      <div className="mt-3 grid gap-2">
        {mine.length === 0 ? <p className="text-sm text-white/50">没有提醒。</p> : null}
        {mine.map((item) => {
          const node = nodes.find((entry) => entry.id === item.nodeId);
          const canvas = canvases.find((entry) => entry.id === node?.canvasId);
          return (
            <article key={item.id} className="rounded-lg border border-white/10 p-3 text-sm">
              <p>
                {ROLES.find((roleItem) => roleItem.id === item.from)?.name} · {node?.name} · {item.handled ? "已处理" : "待处理"}
              </p>
              <p className="text-[12px] text-white/60">{item.text}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-[12px] text-[#dff25a]"
                  onClick={() => {
                    if (!canvas || !node) return;
                    const scenario = SCENARIOS.find((entry) => entry.canvasId === canvas.id);
                    openScenario(canvas.id, scenario?.role ?? role);
                    select(node.id);
                    onOpen();
                  }}
                >
                  定位节点
                </button>
                {item.handled ? null : (
                  <button type="button" className="text-[12px]" onClick={() => settle(item.id, "已确认")}>
                    已处理
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Toast() {
  const toast = useDemo((state) => state.toast);
  if (!toast) return null;
  return <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#eceae4] px-3 py-1.5 text-xs text-[#16180d]">{toast}</div>;
}

function IntentAsk() {
  const ask = useDemo((state) => state.intentAsk);
  const choose = useDemo((state) => state.chooseIntent);
  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#16181d] p-4">
        <p className="text-sm font-medium">演示意图识别 · 先确认</p>
        <p className="mt-2 text-[13px] text-white/70">「{ask.text}」没有明确是微调当前节点，还是派生新节点。不会猜测执行。</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-md bg-[#dff25a] px-3 py-1.5 text-sm text-[#1a1c08]" onClick={() => choose("version")}>
            作为新版本
          </button>
          <button type="button" className="rounded-md border border-white/15 px-3 py-1.5 text-sm" onClick={() => choose("derive")}>
            派生新节点
          </button>
        </div>
      </div>
    </div>
  );
}
