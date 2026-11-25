"use client";

import { useState } from "react";

import { KIND_LABEL, ROLES } from "@/lib/demo/types";
import { currentVersion } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

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
    <div className="h-full overflow-auto">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:px-8">
        <header>
          <p className="text-[12px] text-white/40">项目首页</p>
          <h1 className="mt-1 text-xl font-medium">选择项目，打开或新建画布</h1>
        </header>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="切换项目">
          {projects.map((item) => {
            const count = canvases.filter((canvas) => canvas.projectId === item.id).length;
            const open = readable(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === project?.id}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left ${
                  item.id === project?.id ? "border-[#dff25a] bg-[#dff25a]/10" : "border-white/10"
                } ${open ? "" : "opacity-50"}`}
                onClick={() => setProjectId(item.id)}
              >
                <span className="block text-sm">{item.name}</span>
                <span className="text-[11px] text-white/40">{open ? `${count} 张画布` : "无权访问"}</span>
              </button>
            );
          })}
        </div>
        {project ? (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-medium">{project.name}</h2>
                <p className="text-[12px] text-white/45">
                  {projectCanvases.length} 张画布 · {projectNodes.length} 个资产
                  {allowed ? "" : " · 当前身份只能看，不能新建"}
                </p>
              </div>
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
                  className="h-8 rounded-md border border-white/10 bg-transparent px-2 text-sm"
                  placeholder="新项目"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
                <button type="submit" className="h-8 rounded-md border border-white/15 px-2 text-[12px]">
                  新建项目
                </button>
              </form>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <form
                className="flex min-h-40 flex-col justify-between rounded-2xl border border-dashed border-[#dff25a]/50 bg-[#16181d] p-4"
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
                <div>
                  <h3 className="text-sm font-medium">新建空白画布</h3>
                  <p className="mt-1 text-[12px] text-white/45">命名后创建。空白画布里右键可添加七类节点。</p>
                </div>
                <label className="mt-3 grid gap-1 text-[12px]">
                  画布名称
                  <input
                    aria-label="新画布名称"
                    className="h-8 rounded-md border border-white/10 bg-transparent px-2 text-sm"
                    placeholder="例如：会员日改版"
                    value={canvasName}
                    onChange={(event) => setCanvasName(event.target.value)}
                  />
                </label>
                {nameError ? <p className="mt-1 text-[12px] text-[#f3a0c0]">{nameError}</p> : null}
                <button type="submit" className="mt-3 h-8 rounded-md bg-[#dff25a] text-[12px] font-medium text-[#1a1c08] disabled:opacity-40" disabled={!allowed}>
                  创建空白画布
                </button>
              </form>
              {projectCanvases.map((canvas) => {
                const count = nodes.filter((node) => node.canvasId === canvas.id && !node.archived).length;
                return (
                  <article key={canvas.id} className="flex min-h-40 flex-col rounded-2xl border border-white/10 bg-[#16181d] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium">{canvas.name}</h3>
                      {canvas.sample ? <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">示例</span> : null}
                    </div>
                    <p className="mt-2 flex-1 text-[12px] text-white/45">{count === 0 ? "空白画布" : `${count} 个节点`}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-white/10 px-2 py-1 text-[12px]"
                        onClick={() => {
                          openCanvas(canvas.id);
                          onOpenCanvas();
                        }}
                      >
                        打开
                      </button>
                      {canvas.sample ? null : (
                        <button type="button" className="rounded-md px-2 py-1 text-[12px] text-white/45" onClick={() => deleteCanvas(canvas.id)}>
                          删除
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {projectCanvases.length === 0 ? <p className="text-sm text-white/45">这个项目还没有画布。</p> : null}
            </div>
          </section>
        ) : null}
        <section>
          <h2 className="text-sm font-medium">最近资产</h2>
          {recent.length === 0 ? <p className="mt-2 text-[12px] text-white/45">这个项目还没有资产。</p> : null}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {recent.map((node) => {
              const version = currentVersion(node);
              return (
                <button
                  key={node.id}
                  type="button"
                  className="rounded-xl border border-white/10 px-3 py-2 text-left"
                  onClick={() => {
                    focus(node.id);
                    onOpenCanvas();
                  }}
                >
                  <span className="text-[10px] text-white/40">{KIND_LABEL[node.kind]}</span>
                  <span className="block truncate text-sm">{node.name}</span>
                  <span className="text-[12px] text-white/45">{version ? `v${version.version} · ${version.summary}` : "还没有产物"}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium">提醒</h2>
          <p className="mt-1 text-[12px] text-white/40">当前身份 {ROLES.find((item) => item.id === role)?.name}。未处理 {mine.length} 条。</p>
          <div className="mt-2 grid gap-2">
            {mine.length === 0 ? <p className="text-[12px] text-white/45">没有待处理提醒。</p> : null}
            {mine.map((item) => {
              const node = nodes.find((entry) => entry.id === item.nodeId);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-xl border border-white/10 px-3 py-2 text-left text-[12px]"
                  onClick={() => {
                    if (!node) return;
                    openCanvas(node.canvasId);
                    select(node.id);
                    onOpenCanvas();
                  }}
                >
                  {node?.name ?? "节点"} · {item.text}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
