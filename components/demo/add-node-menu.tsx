"use client";

import { useEffect, useRef } from "react";
import { AppWindow, Boxes, Database, FileText, ImageIcon, ListChecks, Palette, type LucideIcon } from "lucide-react";

import { KIND_COLOR, KIND_LABEL, type NodeKind } from "@/lib/demo/types";
import { canAccess } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

const KINDS: Array<{ kind: NodeKind; icon: LucideIcon; hint: string }> = [
  { kind: "api", icon: Database, hint: "接口契约，可以按单项连出去" },
  { kind: "page", icon: AppWindow, hint: "页面代码和预览" },
  { kind: "design", icon: Palette, hint: "视觉方案" },
  { kind: "doc", icon: FileText, hint: "需求、接口设计和测试点" },
  { kind: "component", icon: Boxes, hint: "组件清单，可以按单项连出去" },
  { kind: "image", icon: ImageIcon, hint: "图片素材" },
  { kind: "testcase", icon: ListChecks, hint: "人工用例，可以按单项连出去" },
];

const MENU_WIDTH = 268;
const MENU_HEIGHT = 392;

export function AddNodeMenu({
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
  const canvas = useDemo((state) => state.canvases.find((item) => item.id === state.activeCanvasId));
  const role = useDemo((state) => state.activeRole);
  const allowed = useDemo((state) => (canvas ? canAccess(state, role, canvas.projectId) : false));

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as globalThis.Node)) onClose();
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

  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 64));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="添加节点"
      className="fixed z-50 w-[268px] rounded-xl border border-white/10 bg-[#1a1d24] p-2 text-zinc-100 shadow-2xl"
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="px-2 py-1 text-[11px] text-white/45">在这里添加节点</p>
      {allowed ? null : <p className="px-2 pb-1 text-[11px] text-[#f3a0c0]">你不能编辑这个项目，当前只能看。</p>}
      <div className="grid">
        {KINDS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.kind}
              type="button"
              role="menuitem"
              disabled={!allowed}
              className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onPick(item.kind)}
            >
              <span
                className="mt-0.5 grid size-8 place-items-center rounded-md"
                style={{ background: `${KIND_COLOR[item.kind]}22`, color: KIND_COLOR[item.kind] }}
              >
                <Icon size={16} />
              </span>
              <span>
                <span className="block text-sm">{KIND_LABEL[item.kind]}</span>
                <span className="block text-[11px] text-white/45">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
