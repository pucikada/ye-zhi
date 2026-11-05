"use client";

import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { Loader2, Play } from "lucide-react";

import { NodeShell } from "@/components/canvas/node-shell";
import { toSrcDoc } from "@/lib/codefmt";
import { summaryLines } from "@/lib/node-fields";
import { useCanvas } from "@/lib/store";
import type {
  BriefData,
  DataNodeData,
  FrameworkData,
  MotionData,
  PageData,
  StyleData,
} from "@/lib/types";

function Lines({ id, kind, selected, lines, swatches }: {
  id: string;
  kind: "brief" | "style" | "framework" | "motion" | "data";
  selected?: boolean;
  lines: string[];
  swatches?: string[];
}) {
  return (
    <NodeShell id={id} kind={kind} selected={selected}>
      {swatches ? (
        <div className="flex gap-1.5" aria-hidden>
          {swatches.map((color) => (
            <span
              key={color}
              className="size-3.5 rounded-full border border-white/20"
              style={{ background: color }}
            />
          ))}
        </div>
      ) : null}
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="truncate text-[12px] leading-snug text-white/75">
          {line}
        </p>
      ))}
      <p className="text-[10px] text-white/35">点击，用对话修改</p>
    </NodeShell>
  );
}

function BriefView({ id, data, selected }: NodeProps<Node<BriefData, "brief">>) {
  const lines = summaryLines({ id, type: "brief", position: { x: 0, y: 0 }, data });
  return <Lines id={id} kind="brief" selected={selected} lines={lines} />;
}

function StyleView({ id, data, selected }: NodeProps<Node<StyleData, "style">>) {
  const lines = summaryLines({ id, type: "style", position: { x: 0, y: 0 }, data });
  return (
    <Lines
      id={id}
      kind="style"
      selected={selected}
      lines={lines}
      swatches={[data.bg, data.fg, data.accent]}
    />
  );
}

function FrameworkView({ id, data, selected }: NodeProps<Node<FrameworkData, "framework">>) {
  const lines = summaryLines({ id, type: "framework", position: { x: 0, y: 0 }, data });
  return <Lines id={id} kind="framework" selected={selected} lines={lines} />;
}

function MotionView({ id, data, selected }: NodeProps<Node<MotionData, "motion">>) {
  const lines = summaryLines({ id, type: "motion", position: { x: 0, y: 0 }, data });
  return <Lines id={id} kind="motion" selected={selected} lines={lines} />;
}

function DataView({ id, data, selected }: NodeProps<Node<DataNodeData, "data">>) {
  const lines = summaryLines({ id, type: "data", position: { x: 0, y: 0 }, data });
  return <Lines id={id} kind="data" selected={selected} lines={lines} />;
}

function PageView({ id, data, selected }: NodeProps<Node<PageData, "page">>) {
  const runOne = useCanvas((state) => state.runOne);
  const running = useCanvas((state) => state.runningIds.includes(id));
  const lines = summaryLines({ id, type: "page", position: { x: 0, y: 0 }, data });
  const srcDoc = data.code ? toSrcDoc(data.code, data.format) : "";
  return (
    <NodeShell id={id} kind="page" selected={selected}>
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="truncate text-[12px] text-white/70">
          {line}
        </p>
      ))}
      <div className="overflow-hidden rounded-md border border-white/10 bg-white">
        {srcDoc ? (
          <iframe
            title="页面预览"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="pointer-events-none h-40 w-full bg-white"
          />
        ) : (
          <div className="grid h-40 place-items-center px-4 text-center text-[12px] text-zinc-500">
            把上游连到这里，页面会在这里生成
          </div>
        )}
      </div>
      <button
        type="button"
        className="nodrag nopan inline-flex items-center justify-center gap-1.5 rounded-md bg-[#dff25a] px-3 py-1.5 text-[12px] font-medium text-[#1a1c08] disabled:opacity-60"
        disabled={running}
        onClick={() => void runOne(id)}
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {running ? "生成中" : "重新生成"}
      </button>
    </NodeShell>
  );
}

export const nodeTypes = {
  brief: memo(BriefView),
  style: memo(StyleView),
  framework: memo(FrameworkView),
  motion: memo(MotionView),
  data: memo(DataView),
  page: memo(PageView),
};
