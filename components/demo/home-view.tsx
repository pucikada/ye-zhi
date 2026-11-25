"use client";

import { useState } from "react";

import { onScrollKey } from "@/lib/demo/scroll-key";
import { KIND_LABEL, ROLES } from "@/lib/demo/types";
import { currentVersion } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dff25a]";

export function HomeView({ onOpenCanvas }: { onOpenCanvas: () => void }) {
  const projects = useDemo((state) => state.projects);
  const canvases = useDemo((state) => state.canvases);
  const nodes = useDemo((state) => state.nodes);
  const reminders = useDemo((state) => state.reminders);
  const role = useDemo((state) => state.activeRole);
  const access = useDemo((state) => state.access);
  const revoked = useDemo((state) => state.revoked);
  const activeCanvasId = useDemo((state) => state.activeCanvasId);
  const openCanvas = useDemo((state) => state.openCanvas);
  const createCanvas = useDemo((state) => state.createCanvas);
  const createProject = useDemo((state) => state.createProject);
  const deleteCanvas = useDemo((state) => state.deleteCanvas);
  const focus = useDemo((state) => state.focus);
  const select = useDemo((state) => state.select);
  const initial = canvases.find((item) => item.id === activeCanvasId)?.projectId ?? projects[0]?.id ?? "";
  const [projectId, setProjectId] = useState(initial);
  const [canvasName, setCanvasName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [nameError, setNameError] = useState("");
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const readable = (id: string) => (access[id] ?? []).includes(role) && !revoked.some((item) => item.roleId === role && item.projectId === id);
  const allowed = project ? readable(project.id) : false;
  const projectCanvases = canvases.filter((canvas) => canvas.projectId === project?.id);
  const projectNodes = nodes.filter((node) => node.projectId === project?.id && !node.archived);
  const recent = [...projectNodes]
    .filter((node) => readable(node.projectId))
    .sort((a, b) => (currentVersion(b)?.at ?? "").localeCompare(currentVersion(a)?.at ?? ""))
    .slice(0, 4);
  const mine = reminders.filter((item) => item.to === role && !item.handled).slice(0, 4);

  return (
    <div
      tabIndex={0}
      aria-label="项目首页"
      onKeyDown={onScrollKey}
      className="yz-scroll yz-scroll-y h-full overflow-y-auto overflow-x-hidden focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[#dff25a]/50"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-white/40">当前项目</p>
            <h1 className="truncate text-lg font-medium">{project?.name ?? "页织"}</h1>
          </div>
          <div className="yz-scroll flex max-w-full gap-1.5 overflow-x-auto overflow-y-hidden" role="tablist" aria-label="切换项目">
            {projects.map((item) => {
              const open = readable(item.id);
              const active = item.id === project?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={item.name}
                  className={`h-8 max-w-40 shrink-0 truncate rounded-full px-3 text-[12px] ${focusRing} ${
                    active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"
                  } ${open ? "" : "opacity-45"}`}
                  onClick={() => setProjectId(item.id)}
                >
                  {open ? item.name : `${item.name} · 无权`}
                </button>
              );
            })}
          </div>
        </div>

        {project ? (
          <section className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] text-white/45">画布</h2>
              <p className="text-[12px] text-white/35">
                {projectCanvases.length} 张{allowed ? "" : " · 只能看"}
              </p>
            </div>
            <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              <form
                className="flex min-h-52 flex-col rounded-2xl border border-dashed border-[#dff25a]/45 bg-[#14160f] p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = canvasName.trim();
                  if (!name) {
                    setNameError("先写画布名称");
                    return;
                  }
                  setNameError("");
                  const before = useDemo.getState().canvases.length;
                  createCanvas(project.id, name);
                  if (useDemo.getState().canvases.length > before) {
                    setCanvasName("");
                    onOpenCanvas();
                  }
                }}
              >
                <h3 className="text-base font-medium">新建空白画布</h3>
                <p className="mt-1 text-[12px] leading-5 text-white/45">命名后进入空白画布。右键或双击空白处添加节点。</p>
                <label className="mt-4 grid gap-1 text-[12px] text-white/55">
                  画布名称
                  <input
                    aria-label="新画布名称"
                    className={`h-9 rounded-md border border-white/15 bg-black/20 px-2 text-sm text-white ${focusRing}`}
                    placeholder="例如：会员日改版"
                    value={canvasName}
                    onChange={(event) => setCanvasName(event.target.value)}
                  />
                </label>
                {nameError ? <p className="mt-1 text-[12px] text-[#f3a0c0]">{nameError}</p> : null}
                <button
                  type="submit"
                  className={`mt-auto h-9 rounded-md bg-[#dff25a] text-[13px] font-medium text-[#1a1c08] disabled:opacity-40 ${focusRing}`}
                  disabled={!allowed}
                >
                  创建空白画布
                </button>
              </form>
              {projectCanvases.map((canvas) => {
                const count = nodes.filter((node) => node.canvasId === canvas.id && !node.archived).length;
                return (
                  <article key={canvas.id} className="flex min-h-52 flex-col rounded-2xl border border-white/10 bg-[#16181d] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 truncate text-base font-medium" title={canvas.name}>
                        {canvas.name}
                      </h3>
                      {canvas.sample ? <span className="shrink-0 text-[11px] text-white/35">示例</span> : null}
                    </div>
                    <p className="mt-2 text-[13px] text-white/45">{count === 0 ? "空白画布" : `${count} 个节点`}</p>
                    <div className="mt-auto flex gap-3 pt-6">
                      <button
                        type="button"
                        className={`text-[13px] text-[#dff25a] ${focusRing}`}
                        onClick={() => {
                          openCanvas(canvas.id);
                          onOpenCanvas();
                        }}
                      >
                        打开
                      </button>
                      {canvas.sample ? null : (
                        <button
                          type="button"
                          className={`text-[13px] text-white/40 ${focusRing}`}
                          onClick={() => deleteCanvas(canvas.id)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {projectCanvases.length === 0 ? <p className="text-sm text-white/45">这个项目还没有画布。</p> : null}
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = projectName.trim();
                if (!name) return;
                createProject(name);
                const created = useDemo.getState().projects.at(-1);
                if (created) setProjectId(created.id);
                setProjectName("");
              }}
            >
              <input
                aria-label="新项目名称"
                className={`h-8 w-40 rounded-md border border-white/10 bg-transparent px-2 text-[12px] ${focusRing}`}
                placeholder="新项目名称"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
              <button type="submit" className={`h-8 px-1 text-[12px] text-white/55 ${focusRing}`}>
                新建项目
              </button>
            </form>
          </section>
        ) : null}

        <section className="grid gap-6 border-t border-white/8 pt-6 md:grid-cols-2">
          <div>
            <h2 className="text-[12px] text-white/40">最近资产</h2>
            {recent.length === 0 ? <p className="mt-2 text-[12px] text-white/35">这个项目还没有资产。</p> : null}
            <ul className="mt-2 grid">
              {recent.map((node) => {
                const version = currentVersion(node);
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      className={`flex w-full min-w-0 items-baseline justify-between gap-3 rounded-md px-1 py-1.5 text-left hover:bg-white/5 ${focusRing}`}
                      onClick={() => {
                        focus(node.id);
                        onOpenCanvas();
                      }}
                    >
                      <span className="min-w-0 truncate text-[13px]" title={node.name}>
                        {node.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-white/35">
                        {KIND_LABEL[node.kind]}
                        {version ? ` · v${version.version}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2 className="text-[12px] text-white/40">
              提醒 · {ROLES.find((item) => item.id === role)?.name} · 未处理 {mine.length}
            </h2>
            {mine.length === 0 ? <p className="mt-2 text-[12px] text-white/35">没有待处理提醒。</p> : null}
            <ul className="mt-2 grid">
              {mine.map((item) => {
                const node = nodes.find((entry) => entry.id === item.nodeId);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full min-w-0 truncate rounded-md px-1 py-1.5 text-left text-[13px] hover:bg-white/5 ${focusRing}`}
                      title={item.text}
                      onClick={() => {
                        if (!node) return;
                        openCanvas(node.canvasId);
                        select(node.id);
                        onOpenCanvas();
                      }}
                    >
                      {node?.name ?? "节点"} · {item.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
