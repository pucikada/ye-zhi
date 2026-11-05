"use client";

import { useMemo, useState } from "react";
import { Copy, Download, X } from "lucide-react";

import { Segment } from "@/components/canvas/fields";
import { Button } from "@/components/ui/button";
import { fileBase, toSrcDoc } from "@/lib/codefmt";
import { useCanvas } from "@/lib/store";
import type { Device } from "@/lib/types";
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
  const updateData = useCanvas((state) => state.updateData);
  const applyCodeEdit = useCanvas((state) => state.applyCodeEdit);
  const projectName = useCanvas((state) => state.projectName);
  const showToast = useCanvas((state) => state.showToast);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [fallbackDevice, setFallbackDevice] = useState<Device>("desktop");

  const artifact = useMemo(() => {
    const selected = [...nodes].reverse().find((node) => node.selected && node.type === "page");
    const focus = selected ?? nodes.find((node) => node.type === "page");
    if (!focus || focus.type !== "page") return null;
    return focus;
  }, [nodes]);

  const device = artifact?.data.device ?? fallbackDevice;
  const width = device === "mobile" ? 390 : device === "tablet" ? 768 : undefined;
  const srcDoc = artifact?.data.code ? toSrcDoc(artifact.data.code, artifact.data.format) : "";

  function setDevice(next: string) {
    const value = next as Device;
    setFallbackDevice(value);
    if (artifact) updateData(artifact.id, { device: value });
  }

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
              value={device}
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
                还没有页面。把节点连到「页面」，预览会在这里更新。
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {artifact?.data.edited ? "已手改，再次生成会覆盖" : "页面节点里的代码"}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!artifact) return;
                  void navigator.clipboard.writeText(artifact.data.code).then(
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
                  const blob = new Blob([artifact.data.code], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${fileBase(projectName)}.${artifact.data.format === "react" ? "tsx" : "html"}`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download />
                导出
              </Button>
            </div>
          </div>
          <textarea
            className="min-h-0 flex-1 resize-none rounded-lg border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring"
            value={artifact?.data.code ?? ""}
            spellCheck={false}
            aria-label="生成的代码"
            placeholder="连到页面节点后，HTML 或 React 会出现在这里。"
            onChange={(event) => {
              if (!artifact) return;
              applyCodeEdit(artifact.id, event.target.value);
            }}
          />
        </div>
      )}
    </aside>
  );
}
