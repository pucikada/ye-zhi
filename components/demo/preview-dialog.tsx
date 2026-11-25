"use client";

import { useEffect, useRef } from "react";

import { useCanvasUi } from "@/components/demo/canvas-ui";
import { KIND_LABEL, type NodeVersion } from "@/lib/demo/types";
import { canAccess, currentVersion, versionOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

export function PreviewDialog() {
  const previewId = useCanvasUi((state) => state.previewNodeId);
  const close = useCanvasUi((state) => state.closePreview);
  const node = useDemo((state) => state.nodes.find((item) => item.id === previewId));
  const role = useDemo((state) => state.activeRole);
  const source = useDemo((state) =>
    node?.reference ? state.nodes.find((item) => item.id === node.reference?.nodeId) : undefined,
  );
  const allowed = useDemo((state) => {
    if (!node) return false;
    if (node.reference) return canAccess(state, role, node.reference.projectId);
    return canAccess(state, role, node.projectId);
  });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!previewId) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [previewId, close]);

  if (!previewId || !node) return null;
  const version = node.reference && source ? versionOf(source, node.reference.version) : currentVersion(node);
  const origin = version?.origin === "mock-ai" ? "模拟" : version?.origin === "import" ? "导入" : version ? "手工" : "";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="关闭预览" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className="relative z-10 flex max-h-[min(720px,86vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14171c] text-zinc-100 shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] text-white/40">{KIND_LABEL[node.kind]}</p>
            <h2 id="preview-title" className="truncate text-base font-medium">
              {allowed ? node.name : "无权访问"}
            </h2>
            <p className="text-[12px] text-white/45">
              {version ? `v${version.version} · ${origin}` : "还没有产物"}
              {node.frozen ? " · 已冻结" : ""}
              {node.reference ? " · 引用卡，不复制内容" : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="ml-auto rounded-md border border-white/15 px-2 py-1 text-[12px]"
            onClick={close}
          >
            关闭
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {allowed ? <PreviewBody kind={node.kind} version={version} /> : <p className="text-sm text-[#f3a0c0]">权限已撤回。不能读取来源，也不能再生成。</p>}
        </div>
      </div>
    </div>
  );
}

function PreviewBody({
  kind,
  version,
}: {
  kind: string;
  version: NodeVersion | undefined;
}) {
  if (!version) return <p className="text-sm text-white/50">还没有产物。在节点下方写一句指令后再看。</p>;
  if (kind === "page") {
    return (
      <div className="grid gap-3">
        <p className="text-[12px] text-white/45">页面在隔离框里预览，脚本和外部页面都不能跑。这不是正式构建。</p>
        {version.html ? (
          <iframe title="页面预览" sandbox="" srcDoc={version.html} className="h-80 w-full rounded-lg bg-white" />
        ) : (
          <p className="text-sm text-white/50">这一版没有页面代码。</p>
        )}
        {version.checks ? (
          <p className="text-[12px] text-white/60">
            构建 {version.checks.build} · 类型 {version.checks.types} · 格式 {version.checks.format}。{version.checks.note}
          </p>
        ) : null}
        <pre className="whitespace-pre-wrap text-[12px] text-white/70">{version.body}</pre>
      </div>
    );
  }
  if (kind === "image") {
    return (
      <figure className="grid gap-3">
        <div className="grid h-48 place-items-center rounded-xl bg-[linear-gradient(135deg,#3a2418,#ffb08a)] text-sm text-[#2a140c]">
          图片素材 · Mock
        </div>
        <figcaption className="whitespace-pre-wrap text-[13px] text-white/70">{version.body || version.summary}</figcaption>
      </figure>
    );
  }
  if (kind === "api" || kind === "component" || kind === "testcase") {
    const groups = new Map<string, typeof version.items>();
    for (const item of version.items) {
      const key = item.group || "未分组";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return (
      <div className="grid gap-3">
        <p className="text-[13px] text-white/70">{version.summary}</p>
        {kind === "api" ? <p className="text-[12px] text-white/40">接口定义不等于服务已上线。单项可以单独连到下游。</p> : null}
        {kind === "component" ? <p className="text-[12px] text-white/40">这是组件清单，不是可运行组件包。单项可以单独连到下游。</p> : null}
        {[...groups.entries()].map(([group, items]) => (
          <section key={group}>
            <h3 className="text-[12px] text-white/45">{group}</h3>
            <ul className="mt-1 grid gap-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-[12px] text-white/50">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <pre className="whitespace-pre-wrap text-[12px] text-white/55">{version.body}</pre>
      </div>
    );
  }
  return <pre className="whitespace-pre-wrap text-[13px] text-white/75">{version.body || version.summary}</pre>;
}
