"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";

import { Dock } from "@/components/canvas/dock";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { NodeChat } from "@/components/canvas/node-chat";
import { Toolbar } from "@/components/canvas/toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { staticExport } from "@/lib/client-generate";
import { DEFAULT_MODEL } from "@/lib/models";
import { useCanvas } from "@/lib/store";

function Shell() {
  const hydrated = useCanvas((state) => state.hydrated);
  const hydrate = useCanvas((state) => state.hydrate);
  const undo = useCanvas((state) => state.undo);
  const redo = useCanvas((state) => state.redo);
  const runSelected = useCanvas((state) => state.runSelected);
  const runFromHere = useCanvas((state) => state.runFromHere);
  const nodes = useCanvas((state) => state.nodes.length);
  const edges = useCanvas((state) => state.edges.length);
  const saveState = useCanvas((state) => state.saveState);
  const toast = useCanvas((state) => state.toast);
  const [dock, setDock] = useState(true);
  const [mobileDock, setMobileDock] = useState(false);
  const [gateway, setGateway] = useState<{
    configured: boolean;
    model: string;
    staticSite?: boolean;
  } | null>(staticExport ? { configured: false, model: "", staticSite: true } : null);
  const { fitView } = useReactFlow();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        Boolean(target?.isContentEditable);
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z" && !typing) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && event.key.toLowerCase() === "y" && !typing) {
        event.preventDefault();
        redo();
      } else if (mod && event.key === "Enter" && !typing) {
        event.preventDefault();
        if (event.shiftKey) void runFromHere();
        else void runSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, runFromHere, runSelected, undo]);

  useEffect(() => {
    if (staticExport) return;
    let cancelled = false;
    void fetch("/api/generate")
      .then((response) => response.json())
      .then((body: { configured?: boolean; model?: string }) => {
        if (!cancelled) {
          setGateway({
            configured: Boolean(body.configured),
            model: body.model || DEFAULT_MODEL,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setGateway({ configured: false, model: DEFAULT_MODEL });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0c0d10] text-[#eceae4]">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#dff25a] text-[#1a1c08]">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
              <path d="M2 11c2.2-4 3.2-4 6-4s3.8 0 6 4" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 7.5c2.2-4 3.2-4 6-4s3.8 0 6 4" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
            </svg>
          </span>
          <div>
            <div className="text-sm font-medium">页织</div>
            <div className="text-xs text-white/45">正在展开画布</div>
          </div>
        </div>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving" ? "保存中" : saveState === "error" ? "本地存不下了" : "已存本地";
  const modelLabel = gateway?.staticSite
    ? "Pages · 本地合成（模型需 Vercel）"
    : gateway
      ? gateway.configured
        ? `模型就绪 · ${gateway.model}`
        : "未配置密钥 · 运行使用本地合成"
      : "正在检查模型";

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <Toolbar
        dockOpen={dock}
        onToggleDock={() => {
          if (window.matchMedia("(min-width: 768px)").matches) setDock((value) => !value);
          else setMobileDock((value) => !value);
        }}
        onFit={() => fitView({ padding: 0.18, duration: 250 })}
        onOpenPicker={() => {
          const pane = document.querySelector(".react-flow");
          const rect = pane?.getBoundingClientRect();
          const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
          const y = rect ? rect.top + Math.min(180, rect.height / 3) : 160;
          const event = new MouseEvent("dblclick", { clientX: x, clientY: y, bubbles: true });
          pane?.querySelector(".react-flow__pane")?.dispatchEvent(event);
        }}
      />
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0">
            <FlowCanvas />
          </div>
          <NodeChat />
        </div>
        <div className="hidden md:contents">
          <Dock open={dock} mobile={false} onClose={() => setDock(false)} />
        </div>
        {mobileDock ? <Dock open mobile onClose={() => setMobileDock(false)} /> : null}
      </div>
      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted-foreground">
        <span>
          {nodes} 个节点 · {edges} 条连线
        </span>
        <span className="hidden sm:inline">单击节点对话，连到页面即生成</span>
        <span className="ml-auto">{saveLabel}</span>
        <span className="hidden max-w-[40%] truncate md:inline">{modelLabel}</span>
      </footer>
      {toast ? (
        <div className="pointer-events-none fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs text-background">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export function CanvasApp() {
  return (
    <ReactFlowProvider>
      <TooltipProvider delay={280}>
        <Shell />
      </TooltipProvider>
    </ReactFlowProvider>
  );
}
