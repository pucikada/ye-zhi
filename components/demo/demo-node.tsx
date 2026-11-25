"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, NodeToolbar, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";

import { useCanvasUi } from "@/components/demo/canvas-ui";
import { KIND_LABEL, type NodeKind } from "@/lib/demo/types";
import { useDemo } from "@/lib/demo/store";

const nodeHandle = "!size-3 !rounded-full !border-2 !bg-[#0e0f12]";
const itemHandle = "!size-2.5 !rounded-sm !border-2 !bg-[#0e0f12]";

export type CardItem = { id: string; name: string; group: string; detail: string };

export type CardModel = {
  id: string;
  kind: NodeKind;
  name: string;
  color: string;
  summary: string;
  badges: string[];
  items: CardItem[];
  denied: boolean;
  frozen: boolean;
  job: string;
  compose: { enabled: boolean; reason: string; mode: "job" | "derive" };
};

function DemoNodeView({ data, selected }: NodeProps<Node<CardModel, "card">>) {
  const remove = useDemo((state) => state.remove);
  const updateInternals = useUpdateNodeInternals();
  const itemKey = data.items.map((item) => item.id).join(",");
  useEffect(() => {
    updateInternals(data.id);
  }, [updateInternals, data.id, itemKey]);

  const groups: Array<{ group: string; items: CardItem[] }> = [];
  for (const item of data.items) {
    const name = item.group || "未分组";
    const found = groups.find((group) => group.group === name);
    if (found) found.items.push(item);
    else groups.push({ group: name, items: [item] });
  }
  const showPorts = data.kind === "api" || data.kind === "component";

  return (
    <article
      className={`w-[280px] rounded-xl border bg-[#16181d]/95 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ${
        selected ? "border-[#dff25a]" : "border-white/10"
      }`}
      onMouseEnter={() => useCanvasUi.getState().setHover(data.id)}
      onMouseLeave={() => {
        if (useCanvasUi.getState().hoverNodeId === data.id) useCanvasUi.getState().setHover(null);
      }}
    >
      <header className="relative border-b border-white/8 px-3 py-2">
        <Handle
          type="target"
          position={Position.Left}
          className={nodeHandle}
          style={{ borderColor: data.color }}
          title="节点输入"
          aria-label="节点输入"
        />
        <Handle
          type="source"
          id="out"
          position={Position.Right}
          className={nodeHandle}
          style={{ borderColor: data.color }}
          title="节点输出，不绑定某一项"
          aria-label="节点输出"
        />
        <div className="flex items-start gap-2">
          <span className="mt-1 h-8 w-0.5 rounded-full" style={{ background: data.color }} />
          <div className="min-w-0">
            <p className="text-[10px] tracking-wide text-white/40">{KIND_LABEL[data.kind]}</p>
            <h3 className="truncate text-[13px] font-medium">{data.denied ? "无权访问" : data.name}</h3>
          </div>
          <button
            type="button"
            className="nodrag nopan ml-auto rounded p-1 text-white/35 hover:bg-white/8 hover:text-white"
            aria-label={`删除${data.name}`}
            onClick={(event) => {
              event.stopPropagation();
              remove(data.id);
            }}
          >
            ×
          </button>
        </div>
      </header>
      <button
        type="button"
        className="nodrag nopan block w-full px-3 py-2 text-left"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          useCanvasUi.getState().openPreview(data.id);
        }}
      >
        <span className="flex flex-wrap gap-1">
          {data.badges.map((badge) => (
            <span key={badge} className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
              {badge}
            </span>
          ))}
        </span>
        <span className="mt-1 line-clamp-3 block whitespace-pre-wrap text-[11px] text-white/70">
          {data.denied ? "无权读取内容。" : data.summary || "还没有产物"}
        </span>
        <span className="mt-1 block text-[10px] text-[#dff25a]">查看产物</span>
      </button>
      {showPorts ? <p className="px-3 pb-1 text-[10px] text-white/35">圆点连接整个节点，方点只连接这一项。</p> : null}
      {data.denied
        ? null
        : groups.map((group) => (
            <section key={group.group} className="border-t border-white/8 px-3 py-1.5">
              <p className="text-[10px] text-white/35">{group.group}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id} className="relative flex items-center py-1 pr-4">
                    <span className="truncate text-[12px] text-white/75" title={item.detail || item.name}>
                      {item.name}
                    </span>
                    <Handle
                      type="source"
                      id={`item:${item.id}`}
                      position={Position.Right}
                      className={itemHandle}
                      style={{ borderColor: data.color }}
                      title={`${item.name} · 项级输出`}
                      aria-label={`${item.name} 项级输出`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      <Composer data={data} selected={selected} />
    </article>
  );
}

function Composer({ data, selected }: { data: CardModel; selected: boolean }) {
  const instruct = useDemo((state) => state.instruct);
  const cancel = useDemo((state) => state.cancel);
  const fail = useDemo((state) => state.simulateFail);
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!selected || !data.compose.enabled) return;
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
    const timer = window.setTimeout(() => field.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [selected, data.id, data.compose.enabled]);

  const hint = !data.compose.enabled
    ? data.compose.reason
    : data.compose.mode === "derive"
      ? data.frozen
        ? "已永久冻结。提交会派生新节点，不会改这一张。"
        : "引用不复制内容。提交会派生新资产。"
      : "微调或补充出新版本；派生或另做会新建。含糊时会先问。本地模拟，未接入模型。";

  return (
    <NodeToolbar isVisible={selected} position={Position.Bottom} offset={8} align="center">
      <form
        className="nodrag nopan nowheel w-[280px] rounded-xl border border-white/10 bg-[#14171c] p-2 text-zinc-100 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text || !data.compose.enabled) return;
          instruct(data.id, text);
          setDraft("");
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <p className={`text-[10px] ${data.compose.enabled ? "text-white/45" : "text-[#f3a0c0]"}`}>{hint}</p>
        <textarea
          ref={field}
          aria-label="给这个节点的指令"
          className="mt-1 min-h-14 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 text-[12px] outline-none disabled:opacity-50"
          placeholder={data.compose.enabled ? "写下要生成或修改的内容" : data.compose.reason}
          disabled={!data.compose.enabled}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="mt-1 flex gap-2">
          <button
            type="submit"
            disabled={!data.compose.enabled}
            className="rounded-md bg-[#dff25a] px-2 py-1 text-[12px] font-medium text-[#1a1c08] disabled:opacity-40"
          >
            {data.compose.mode === "derive" ? "派生新节点" : "提交"}
          </button>
          {data.job === "running" ? (
            <>
              <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-[12px]" onClick={() => cancel(data.id)}>
                取消
              </button>
              <button type="button" className="rounded-md border border-white/15 px-2 py-1 text-[12px]" onClick={() => fail(data.id)}>
                标记失败
              </button>
            </>
          ) : null}
        </div>
      </form>
    </NodeToolbar>
  );
}

export const demoNodeTypes = { card: memo(DemoNodeView) };
