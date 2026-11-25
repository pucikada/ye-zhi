"use client";

import { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from "@xyflow/react";

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
    </article>
  );
}

export const demoNodeTypes = { card: memo(DemoNodeView) };
