"use client";

import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { X } from "lucide-react";

import { KIND_META } from "@/lib/catalog";
import { OUTGOING } from "@/lib/graph";
import { useCanvas } from "@/lib/store";
import type { NodeKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const handleClass = "!size-2.5 !border-2 !bg-[#0e0f12]";

export function NodeShell({
  id,
  kind,
  selected,
  children,
}: {
  id: string;
  kind: NodeKind;
  selected?: boolean;
  children: ReactNode;
}) {
  const meta = KIND_META[kind];
  const removeNode = useCanvas((state) => state.removeNode);
  const hasSource = OUTGOING[kind].length > 0;
  const hasTarget = (Object.keys(OUTGOING) as NodeKind[]).some((key) =>
    OUTGOING[key].includes(kind),
  );

  return (
    <article
      className={cn(
        "relative rounded-xl border bg-[#16181d]/95 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
        selected ? "border-[#dff25a]" : "border-white/10",
      )}
      style={{ boxShadow: selected ? `0 0 0 1px ${meta.color}` : undefined }}
    >
      <span
        className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full"
        style={{ background: meta.color }}
        aria-hidden
      />
      {hasTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className={handleClass}
          style={{ borderColor: meta.color }}
          title="连到这里"
        />
      ) : null}
      {hasSource ? (
        <Handle
          type="source"
          position={Position.Right}
          className={handleClass}
          style={{ borderColor: meta.color }}
          title="从这里拖出去"
        />
      ) : null}
      <header className="flex items-start gap-2 border-b border-white/8 px-3 py-2 pl-3.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[13px] font-medium">{meta.label}</h3>
            <span className="text-[10px] tracking-wide text-white/35 uppercase">
              {meta.en}
            </span>
          </div>
          <p className="text-[11px] text-white/40">{meta.hint}</p>
        </div>
        <button
          type="button"
          className="nodrag nopan ml-auto rounded p-1 text-white/35 hover:bg-white/8 hover:text-white"
          aria-label={`删除${meta.label}节点`}
          onClick={() => removeNode(id)}
        >
          <X size={14} />
        </button>
      </header>
      <div className="grid gap-2 p-3 pl-3.5">{children}</div>
    </article>
  );
}
