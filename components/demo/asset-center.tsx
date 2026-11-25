"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppWindow,
  Boxes,
  Database,
  FileText,
  ImageIcon,
  ListChecks,
  Palette,
  type LucideIcon,
} from "lucide-react";

import { onChipKey, onScrollKey } from "@/lib/demo/scroll-key";
import { KIND_COLOR, KIND_LABEL, ROLES, type NodeKind } from "@/lib/demo/types";
import { currentVersion } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

const GROUPS: Array<{ kind: NodeKind; icon: LucideIcon }> = [
  { kind: "api", icon: Database },
  { kind: "page", icon: AppWindow },
  { kind: "design", icon: Palette },
  { kind: "doc", icon: FileText },
  { kind: "component", icon: Boxes },
  { kind: "image", icon: ImageIcon },
  { kind: "testcase", icon: ListChecks },
];

export function AssetCenter({ onOpenCanvas }: { onOpenCanvas: () => void }) {
  const nodes = useDemo((state) => state.nodes);
  const projects = useDemo((state) => state.projects);
  const role = useDemo((state) => state.activeRole);
  const access = useDemo((state) => state.access);
  const revoked = useDemo((state) => state.revoked);
  const cite = useDemo((state) => state.cite);
  const focus = useDemo((state) => state.focus);
  const [kind, setKind] = useState<NodeKind | "all">("all");
  const [projectId, setProjectId] = useState("all");
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const readable = (project: string) =>
    (access[project] ?? []).includes(role) && !revoked.some((item) => item.roleId === role && item.projectId === project);

  const cards = useMemo(() => {
    const text = query.trim();
    return nodes.filter((node) => {
      if (kind !== "all" && node.kind !== kind) return false;
      if (projectId !== "all" && node.projectId !== projectId) return false;
      if (!text) return true;
      return node.name.includes(text) || (KIND_LABEL[node.kind] ?? "").includes(text);
    });
  }, [nodes, kind, projectId, query]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(GROUPS.map((group) => [group.kind, 0])) as Record<NodeKind, number>;
    for (const node of nodes) {
      if (projectId !== "all" && node.projectId !== projectId) continue;
      map[node.kind] += 1;
    }
    return map;
  }, [nodes, projectId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [kind, projectId, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">资产中心</h2>
          <p className="mt-1 max-w-xl text-[12px] text-white/45">
            一个节点一条资产，按七类分开。历史版本在详情里。引用绑定选定版本，不复制内容。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-8 w-44 rounded-md border border-white/10 bg-transparent px-2 text-sm"
            placeholder="搜索名称"
            value={query}
            aria-label="检索资产"
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="h-8 rounded-md border border-white/10 bg-[#101218] px-2 text-sm"
            aria-label="按项目筛选"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="all">全部项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        tabIndex={0}
        aria-label="资产分类"
        onKeyDown={onChipKey}
        className="yz-scroll mt-3 flex gap-2 overflow-x-auto overflow-y-hidden pb-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#dff25a]/70"
      >
        <FilterChip active={kind === "all"} label={`全部 ${nodes.length}`} onClick={() => setKind("all")} />
        {GROUPS.map((group) => (
          <FilterChip
            key={group.kind}
            active={kind === group.kind}
            label={`${KIND_LABEL[group.kind]} ${counts[group.kind]}`}
            onClick={() => setKind(group.kind)}
          />
        ))}
      </div>
      </div>
      <div
        ref={listRef}
        tabIndex={0}
        aria-label="资产列表"
        onKeyDown={onScrollKey}
        className="yz-scroll yz-scroll-y min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[#dff25a]/50 sm:px-6"
      >
      {cards.length === 0 ? (
        <p className="mt-8 text-sm text-white/45">这一类还没有资产。回到画布生成或导入后会出现在这里。</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.filter((group) => kind === "all" || kind === group.kind).map((group) => {
            const list = cards.filter((node) => node.kind === group.kind);
            if (list.length === 0) return null;
            const Icon = group.icon;
            return (
              <section key={group.kind} className={kind === "all" ? "contents" : "contents"}>
                {kind === "all" ? (
                  <h3 className="col-span-full mt-2 flex items-center gap-2 text-[13px] text-white/70">
                    <Icon size={15} color={KIND_COLOR[group.kind]} />
                    {KIND_LABEL[group.kind]}
                  </h3>
                ) : null}
                {list.map((node) => {
                  const version = currentVersion(node);
                  const allowed = readable(node.projectId);
                  const project = projects.find((item) => item.id === node.projectId);
                  return (
                    <article key={node.id} className="flex min-h-40 flex-col rounded-xl border border-white/10 bg-[#16181d] p-3">
                      <div className="flex items-start gap-2">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-md"
                          style={{ background: `${KIND_COLOR[node.kind]}22`, color: KIND_COLOR[node.kind] }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] text-white/40">{KIND_LABEL[node.kind]}</p>
                          <h3 className="truncate text-sm font-medium">{allowed ? node.name : "无权访问"}</h3>
                        </div>
                      </div>
                      {allowed ? (
                        <p className="mt-2 line-clamp-3 flex-1 text-[12px] text-white/55">
                          {version?.summary || "还没有产物"}
                        </p>
                      ) : (
                        <p className="mt-2 flex-1 text-[12px] text-[#f3a0c0]">无权读取内容，也不能再生成。</p>
                      )}
                      <p className="mt-2 break-words text-[11px] text-white/40">
                        {project?.name}
                        {allowed && version ? ` · v${version.version} · ${version.origin === "mock-ai" ? "模拟" : version.origin === "import" ? "导入" : "手工"}` : ""}
                        {node.frozen ? " · 已冻结" : ""}
                        {node.reference ? " · 引用卡" : ""}
                        {node.derivedFrom ? " · 派生资产" : ""}
                        {allowed && node.versions.length > 1 ? ` · ${node.versions.length} 个版本在详情` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-white/15 px-2 py-1 text-[12px]"
                          onClick={() => {
                            focus(node.id);
                            if (readable(node.projectId)) onOpenCanvas();
                          }}
                        >
                          查看详情
                        </button>
                        {allowed && version
                          ? node.versions.map((item) => (
                              <button
                                key={item.version}
                                type="button"
                                className="rounded-md bg-[#dff25a] px-2 py-1 text-[12px] font-medium text-[#1a1c08]"
                                onClick={() => {
                                  cite(node.id, item.version);
                                  onOpenCanvas();
                                }}
                              >
                                引用 v{item.version}
                              </button>
                            ))
                          : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-4 pb-6 text-[11px] text-white/30">当前角色 {ROLES.find((item) => item.id === role)?.name}。撤权后的资产不能引用。</p>
      </div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dff25a] ${active ? "bg-[#dff25a] text-[#1a1c08]" : "bg-white/5 text-white/70"}`}
    >
      {label}
    </button>
  );
}
