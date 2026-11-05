"use client";

import { useEffect, useRef } from "react";
import { AppWindow, Database, Palette, ScrollText, Sparkles, Boxes } from "lucide-react";

import { KIND_META, NODE_KINDS } from "@/lib/catalog";
import type { NodeKind } from "@/lib/types";

const ICONS = {
  brief: ScrollText,
  style: Palette,
  framework: Boxes,
  motion: Sparkles,
  data: Database,
  page: AppWindow,
} satisfies Record<NodeKind, typeof ScrollText>;

export function NodePicker({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (kind: NodeKind) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const width = 280;
  const left = Math.min(x, window.innerWidth - width - 12);
  const top = Math.min(y, window.innerHeight - 380);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="添加节点"
      className="fixed z-40 w-[280px] rounded-xl border border-white/10 bg-[#1a1d24] p-2 text-zinc-100 shadow-2xl"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <p className="px-2 py-1 text-[11px] text-white/45">添加节点</p>
      <div className="grid">
        {NODE_KINDS.map((kind) => {
          const meta = KIND_META[kind];
          const Icon = ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              className="flex items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/6"
              onClick={() => onPick(kind)}
            >
              <span
                className="mt-0.5 grid size-8 place-items-center rounded-md"
                style={{ background: `${meta.color}22`, color: meta.color }}
              >
                <Icon size={16} />
              </span>
              <span>
                <span className="block text-sm">{meta.label}</span>
                <span className="block text-[11px] text-white/45">{meta.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
