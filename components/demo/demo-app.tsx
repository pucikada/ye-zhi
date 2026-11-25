"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";

import { AssetCenter } from "@/components/demo/asset-center";
import { DemoCanvas } from "@/components/demo/demo-canvas";
import { DemoSide } from "@/components/demo/demo-side";
import { HomeView } from "@/components/demo/home-view";
import { ROLES, type RoleId } from "@/lib/demo/types";
import { useDemo } from "@/lib/demo/store";

export function DemoApp() {
  const hydrated = useDemo((state) => state.hydrated);
  const hydrate = useDemo((state) => state.hydrate);
  const [panel, setPanel] = useState<"home" | "canvas" | "assets" | "inbox">("home");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="grid h-dvh place-items-center bg-[#0c0d10] text-sm text-white">正在打开页织</div>;
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-dvh flex-col bg-[#0c0d10] text-[#eceae4]">
        <Toolbar panel={panel} setPanel={setPanel} />
        <div className="flex min-h-0 flex-1">
          {panel === "canvas" ? <Sidebar onOpenCanvas={() => setPanel("canvas")} /> : null}
          <div className="relative min-w-0 flex-1">
            {panel === "home" ? <HomeView onOpenCanvas={() => setPanel("canvas")} /> : null}
            {panel === "canvas" ? <DemoCanvas /> : null}
            {panel === "assets" ? <AssetCenter onOpenCanvas={() => setPanel("canvas")} /> : null}
            {panel === "inbox" ? <Inbox onOpen={() => setPanel("canvas")} /> : null}
          </div>
          {panel === "canvas" ? <DemoSide /> : null}
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
  panel: "home" | "canvas" | "assets" | "inbox";
  setPanel: (panel: "home" | "canvas" | "assets" | "inbox") => void;
}) {
  const role = useDemo((state) => state.activeRole);
  const reminders = useDemo((state) => state.reminders.filter((item) => item.to === role && !item.handled).length);
  const canvasName = useDemo((state) => state.canvases.find((item) => item.id === state.activeCanvasId)?.name ?? "画布");
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
      <span className="text-sm font-semibold">页织</span>
      {panel === "home" ? null : (
        <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-[12px]" onClick={() => setPanel("home")}>
          返回首页
        </button>
      )}
      {panel === "canvas" ? <span className="text-[12px] text-white/50">{canvasName}</span> : null}
      <nav className="ml-auto flex items-center gap-1 text-[12px]">
        {(
          [
            ["home", "首页"],
            ["assets", "资产"],
            ["inbox", `提醒${reminders ? ` ${reminders}` : ""}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-2 py-1 ${panel === id ? "bg-[#dff25a] text-[#1a1c08]" : "text-white/70"}`}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
        <Tools />
      </nav>
    </header>
  );
}

function Tools() {
  const role = useDemo((state) => state.activeRole);
  const chooseRole = useDemo((state) => state.chooseRole);
  const specVersion = useDemo((state) => state.specVersion);
  const specText = useDemo((state) => state.specText);
  const publish = useDemo((state) => state.spec);
  const resetExamples = useDemo((state) => state.resetExamples);
  const [version, setVersion] = useState(specVersion);
  const [text, setText] = useState(specText);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full px-2 py-1 text-white/60">辅助</summary>
      <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-white/10 bg-[#16181d] p-3 text-[12px] shadow-xl">
        <p className="text-white/40">生成、检查、作业和身份都在这台浏览器里模拟，未接入模型、构建或账号系统。</p>
        <label className="mt-2 grid gap-1">
          当前身份
          <select
            className="rounded border border-white/10 bg-transparent px-1 py-1"
            aria-label="切换身份"
            value={role}
            onChange={(event) => chooseRole(event.target.value as RoleId)}
          >
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-2 grid gap-1">
          规范版本
          <input className="rounded border border-white/10 bg-transparent px-2 py-1" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <textarea className="mt-2 min-h-16 w-full rounded border border-white/10 bg-transparent p-2" value={text} onChange={(event) => setText(event.target.value)} />
        <button type="button" className="mt-2 rounded border border-white/15 px-2 py-1" onClick={() => publish(version, text)}>
          发布规范
        </button>
        <p className="mt-1 text-white/35">只影响之后的生成，不改已经记下的版本。</p>
        <button
          type="button"
          className="mt-3 text-white/50"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            resetExamples();
            setConfirmReset(false);
          }}
        >
          {confirmReset ? "再点一次，只恢复示例画布" : "重置示例画布"}
        </button>
      </div>
    </details>
  );
}

function Sidebar({ onOpenCanvas }: { onOpenCanvas: () => void }) {
  const projects = useDemo((state) => state.projects);
  const canvases = useDemo((state) => state.canvases);
  const activeId = useDemo((state) => state.activeCanvasId);
  const openCanvas = useDemo((state) => state.openCanvas);
  const createCanvas = useDemo((state) => state.createCanvas);
  const createProject = useDemo((state) => state.createProject);
  const renameCanvas = useDemo((state) => state.renameCanvas);
  const deleteCanvas = useDemo((state) => state.deleteCanvas);
  const [projectName, setProjectName] = useState("");
  const active = canvases.find((item) => item.id === activeId);

  return (
    <aside className="flex w-44 shrink-0 flex-col overflow-auto border-r border-white/10 md:w-56">
      <div className="px-3 py-3">
        <p className="text-[11px] text-white/40">项目和画布</p>
        {active ? <CanvasName key={active.id} name={active.name} onRename={(name) => renameCanvas(active.id, name)} /> : null}
      </div>
      <div className="grid gap-3 px-2 pb-3">
        {projects.map((project) => {
          const list = canvases.filter((canvas) => canvas.projectId === project.id);
          return (
            <section key={project.id}>
              <div className="flex items-center justify-between px-1">
                <h2 className="truncate text-[12px] text-white/70">{project.name}</h2>
                <button
                  type="button"
                  className="text-[11px] text-white/40"
                  aria-label={`在${project.name}新建画布`}
                  onClick={() => {
                    createCanvas(project.id, "未命名画布");
                    onOpenCanvas();
                  }}
                >
                  新建
                </button>
              </div>
              <div className="mt-1 grid">
                {list.map((canvas) => (
                  <div key={canvas.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-[12px] ${
                        canvas.id === activeId ? "bg-white/10 text-white" : "text-white/60"
                      }`}
                      onClick={() => {
                        openCanvas(canvas.id);
                        onOpenCanvas();
                      }}
                    >
                      {canvas.name}
                      {canvas.sample ? <span className="ml-1 text-[10px] text-white/30">示例</span> : null}
                    </button>
                    {canvas.sample ? null : (
                      <button type="button" className="px-1 text-[11px] text-white/30" aria-label={`删除${canvas.name}`} onClick={() => deleteCanvas(canvas.id)}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <form
        className="mt-auto grid gap-1 border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!projectName.trim()) return;
          createProject(projectName);
          setProjectName("");
        }}
      >
        <input
          aria-label="新项目名称"
          className="rounded border border-white/10 bg-transparent px-2 py-1 text-[12px]"
          placeholder="新项目"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
        />
        <button type="submit" className="text-left text-[12px] text-white/60">
          新建项目
        </button>
      </form>
    </aside>
  );
}

function CanvasName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  return (
    <input
      aria-label="画布名称"
      className="mt-2 w-full rounded border border-white/10 bg-transparent px-2 py-1 text-[12px]"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== name) onRename(draft);
      }}
    />
  );
}

function Inbox({ onOpen }: { onOpen: () => void }) {
  const role = useDemo((state) => state.activeRole);
  const reminders = useDemo((state) => state.reminders);
  const nodes = useDemo((state) => state.nodes);
  const openCanvas = useDemo((state) => state.openCanvas);
  const select = useDemo((state) => state.select);
  const settle = useDemo((state) => state.settleReminder);
  const mine = reminders.filter((item) => item.to === role);
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-sm font-medium">提醒</h2>
      <p className="mt-1 text-[12px] text-white/45">只显示当前身份收到的提醒。处理不会改别人的状态。</p>
      <div className="mt-3 grid gap-2">
        {mine.length === 0 ? <p className="text-sm text-white/50">没有提醒。</p> : null}
        {mine.map((item) => {
          const node = nodes.find((entry) => entry.id === item.nodeId);
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
                    if (!node) return;
                    openCanvas(node.canvasId);
                    select(node.id);
                    onOpen();
                  }}
                >
                  打开画布
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
  return <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#eceae4] px-3 py-1.5 text-xs text-[#16180d]">{toast}</div>;
}

function IntentAsk() {
  const ask = useDemo((state) => state.intentAsk);
  const choose = useDemo((state) => state.chooseIntent);
  if (!ask) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="intent-title" className="w-full max-w-md rounded-xl border border-white/10 bg-[#16181d] p-4">
        <p id="intent-title" className="text-sm font-medium">先确认怎么改</p>
        <p className="mt-2 text-[13px] text-white/70">「{ask.text}」没有写明是微调当前节点，还是派生新节点。</p>
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
