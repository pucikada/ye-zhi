"use client";

import { useMemo, useState } from "react";
import { Copy, Download, X } from "lucide-react";

import { Segment } from "@/components/canvas/fields";
import { Button } from "@/components/ui/button";
import { fileBase, toSrcDoc } from "@/lib/codefmt";
import { downstreamIds, nearestUpstream } from "@/lib/graph";
import { editTargetFor, useCanvas } from "@/lib/store";
import type { Format } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Dock({
  open,
  mobile,
  onClose,
}: {
  open: boolean;
  mobile: boolean;
  onClose: () => void;
}) {
  const nodes = useCanvas((state) => state.nodes);
  const edges = useCanvas((state) => state.edges);
  const applyCodeEdit = useCanvas((state) => state.applyCodeEdit);
  const projectName = useCanvas((state) => state.projectName);
  const showToast = useCanvas((state) => state.showToast);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const artifact = useMemo(() => {
    const selected = [...nodes].reverse().find(
      (node) => node.selected && (node.type === "preview" || node.type === "code" || node.type === "generate"),
    );
    const focus =
      selected ??
      nodes.find((node) => node.type === "preview") ??
      nodes.find((node) => node.type === "code") ??
      nodes.find((node) => node.type === "generate");
    if (!focus) return null;
    let holder = focus;
    if (focus.type === "preview") {
      holder = nearestUpstream(focus.id, "code", nodes, edges) ?? focus;
    } else if (focus.type === "generate") {
      const down = downstreamIds(focus.id, edges);
      holder = nodes.find((node) => down.includes(node.id) && node.type === "code") ?? focus;
    }
    if (holder.type !== "code" && holder.type !== "preview" && holder.type !== "generate") return null;
    return {
      id: holder.id,
      code: holder.data.code,
      format: holder.data.format as Format,
      device: focus.type === "preview" ? focus.data.device : device,
    };
  }, [nodes, edges, device]);

  const width = artifact?.device === "mobile" ? 390 : artifact?.device === "tablet" ? 768 : undefined;
  const srcDoc = artifact?.code ? toSrcDoc(artifact.code, artifact.format) : "";

  return (
    <aside
      className={cn(
        "z-20 flex-col border-border bg-background",
        open ? "flex" : "hidden",
        mobile
          ? "absolute inset-x-0 bottom-0 h-[54%] border-t"
          : "h-full w-[min(420px,42vw)] shrink-0 border-l",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Segment
          label="面板"
          value={tab}
          onChange={setTab}
          options={[
            { value: "preview", label: "预览" },
            { value: "code", label: "代码" },
          ]}
        />
        <div className="ml-auto flex items-center gap-1">
          {tab === "preview" ? (
            <Segment
              label="设备"
              value={artifact?.device ?? device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: "桌面" },
                { value: "tablet", label: "平板" },
                { value: "mobile", label: "手机" },
              ]}
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="关闭预览"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </div>
      {tab === "preview" ? (
        <div className="min-h-0 flex-1 bg-[#090a0c] p-3">
          <div
            className="mx-auto h-full overflow-hidden rounded-lg border border-white/10 bg-white"
            style={{ width: width ? Math.min(width, 420) : "100%" }}
          >
            {srcDoc ? (
              <iframe title="页面预览" sandbox="allow-scripts" srcDoc={srcDoc} className="h-full w-full" />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-zinc-500">
                还没有页面。选中生成节点，点运行。
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!artifact) return;
                void navigator.clipboard.writeText(artifact.code).then(
                  () => showToast("已复制"),
                  () => showToast("复制失败"),
                );
              }}
            >
              <Copy />
              复制
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!artifact) return;
                const blob = new Blob([artifact.code], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${fileBase(projectName)}.${artifact.format === "react" ? "tsx" : "html"}`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download />
              导出
            </Button>
          </div>
          <textarea
            className="min-h-0 flex-1 resize-none rounded-lg border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring"
            value={artifact?.code ?? ""}
            spellCheck={false}
            aria-label="生成的代码"
            placeholder="生成后的 HTML 或 React 会出现在这里。"
            onChange={(event) => {
              if (!artifact) return;
              applyCodeEdit(editTargetFor(artifact.id), event.target.value);
            }}
          />
        </div>
      )}
    </aside>
  );
}
