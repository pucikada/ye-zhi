"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { KIND_COLOR, KIND_LABEL, type NodeKind } from "@/lib/demo/types";
import { currentVersion, versionOf } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";

const handleClass = "!size-2.5 !border-2 !bg-[#0e0f12]";

export function DemoNodeView({ id, selected }: NodeProps<Node<{ id: string }>>) {
  const node = useDemo((state) => state.nodes.find((item) => item.id === id));
  const nodes = useDemo((state) => state.nodes);
  const role = useDemo((state) => state.activeRole);
  const access = useDemo((state) => state.access);
  const revoked = useDemo((state) => state.revoked);
  const remove = useDemo((state) => state.remove);
  if (!node) return null;
  const version = currentVersion(node);
  const source = node.reference ? nodes.find((item) => item.id === node.reference?.nodeId) : undefined;
  const readable = node.reference
    ? (access[node.reference.projectId] ?? []).includes(role) &&
      !revoked.some((item) => item.roleId === role && item.projectId === node.reference?.projectId)
    : true;
  const sourceVersion = source && node.reference ? versionOf(source, node.reference.version) : undefined;
  const shown = node.reference ? sourceVersion : version;
  const items = (shown?.items ?? []).filter((item) => !node.removedItemIds.includes(item.id)).slice(0, 4);
  const color = KIND_COLOR[node.kind];
  const lockedByOther = node.lock && node.lock.roleId !== role;

  return (
    <article
      className={cn(
        "w-[280px] rounded-xl border bg-[#16181d]/95 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
        selected ? "border-[#dff25a]" : "border-white/10",
      )}
    >
      <Handle type="target" position={Position.Left} className={handleClass} style={{ borderColor: color }} />
      <Handle type="source" id="out" position={Position.Right} className={handleClass} style={{ borderColor: color }} />
      {items.map((item, index) => (
        <Handle
          key={item.id}
          type="source"
          id={`item:${item.id}`}
          position={Position.Right}
          className={handleClass}
          style={{ borderColor: color, top: 92 + index * 22 }}
          title={item.name}
        />
      ))}
      <header className="flex items-start gap-2 border-b border-white/8 px-3 py-2">
        <span className="mt-1 h-8 w-0.5 rounded-full" style={{ background: color }} />
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-white/40">{KIND_LABEL[node.kind as NodeKind]}</p>
          <h3 className="truncate text-[13px] font-medium">{node.name}</h3>
        </div>
        <button
          type="button"
          className="nodrag nopan ml-auto rounded p-1 text-white/35 hover:bg-white/8 hover:text-white"
          aria-label={`删除${node.name}`}
          onClick={(event) => {
            event.stopPropagation();
            remove(node.id);
          }}
        >
          ×
        </button>
      </header>
      <div className="grid gap-1 px-3 py-2 text-[11px] text-white/70">
        <div className="flex flex-wrap gap-1">
          {node.frozen ? <Badge text="已冻结" /> : null}
          {node.archived ? <Badge text="已归档" /> : null}
          {node.online ? <Badge text="已上线" /> : null}
          {node.reference ? <Badge text={`引用 v${node.reference.version}`} /> : null}
          {node.job?.status === "running" ? <Badge text="演示生成中" /> : null}
          {node.job?.status === "stopped" ? <Badge text="已停止" /> : null}
          {node.job?.status === "failed" ? <Badge text="演示失败" /> : null}
          {lockedByOther ? <Badge text="他人编辑中" /> : null}
          {shown ? <Badge text={`v${shown.version} · ${shown.origin === "mock-ai" ? "Mock" : shown.origin === "import" ? "导入" : "手工"}`} /> : <Badge text="未生成" />}
        </div>
        {node.reference && !readable ? (
          <p className="text-[#f0a0b0]">无权访问来源。已有产物仍留在下游，这里不能读取。</p>
        ) : (
          <p className="line-clamp-3 whitespace-pre-wrap">{shown?.summary || node.freezeNote || "还没有产物"}</p>
        )}
        {items.map((item) => (
          <p key={item.id} className="truncate text-white/45">
            {item.name}
          </p>
        ))}
      </div>
    </article>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{text}</span>;
}

export const demoNodeTypes = { card: DemoNodeView };
