"use client";

import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { Copy, Download, Loader2, Play } from "lucide-react";

import { Field, Segment, controlClass, stopKeys } from "@/components/canvas/fields";
import { NodeShell } from "@/components/canvas/node-shell";
import {
  ALL_SECTIONS,
  COMPONENT_KINDS,
  SECTION_LABELS,
  STRUCTURES,
  specPlaceholder,
} from "@/lib/catalog";
import { toSrcDoc, fileBase } from "@/lib/codefmt";
import { MODEL_CHOICES } from "@/lib/models";
import { useCanvas } from "@/lib/store";
import { PRESETS } from "@/lib/theme";
import type {
  BriefData,
  CodeData,
  ComponentData,
  Density,
  FontChoice,
  Format,
  GenerateData,
  LayoutData,
  PreviewData,
  Radius,
  StructureId,
  StyleData,
} from "@/lib/types";

function BriefView({ id, data, selected }: NodeProps<Node<BriefData, "brief">>) {
  const updateData = useCanvas((state) => state.updateData);
  const set = (partial: Partial<BriefData>) => updateData(id, partial);
  return (
    <NodeShell id={id} kind="brief" selected={selected}>
      <Field label="产品名">
        <input
          className={controlClass}
          value={data.title}
          placeholder="例如 页织"
          aria-label="产品名"
          onKeyDown={stopKeys}
          onChange={(event) => set({ title: event.target.value })}
        />
      </Field>
      <Field label="受众">
        <input
          className={controlClass}
          value={data.audience}
          placeholder="给谁用"
          aria-label="受众"
          onKeyDown={stopKeys}
          onChange={(event) => set({ audience: event.target.value })}
        />
      </Field>
      <Field label="主标题">
        <input
          className={controlClass}
          value={data.headline}
          placeholder="留空则从说明里取"
          aria-label="主标题"
          onKeyDown={stopKeys}
          onChange={(event) => set({ headline: event.target.value })}
        />
      </Field>
      <Field label="说明">
        <textarea
          className={`${controlClass} min-h-24 resize-y`}
          value={data.prompt}
          placeholder="这页要让人理解什么、做什么？"
          aria-label="说明"
          rows={4}
          onKeyDown={stopKeys}
          onChange={(event) => set({ prompt: event.target.value })}
        />
      </Field>
    </NodeShell>
  );
}

function StyleView({ id, data, selected }: NodeProps<Node<StyleData, "style">>) {
  const updateData = useCanvas((state) => state.updateData);
  return (
    <NodeShell id={id} kind="style" selected={selected}>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`nodrag rounded-full border px-2 py-0.5 text-[11px] ${
              data.preset === preset.id
                ? "border-[#dff25a] text-white"
                : "border-white/10 text-white/55"
            }`}
            onClick={() =>
              updateData(id, {
                preset: preset.id,
                bg: preset.bg,
                fg: preset.fg,
                accent: preset.accent,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["bg", "背景"],
            ["fg", "文字"],
            ["accent", "强调"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              type="color"
              className="nodrag nopan h-8 w-full cursor-pointer rounded border border-white/10 bg-transparent"
              value={data[key]}
              aria-label={label}
              onChange={(event) =>
                updateData(id, { [key]: event.target.value, preset: "custom" })
              }
            />
          </Field>
        ))}
      </div>
      <Field label="字体">
        <select
          className={controlClass}
          value={data.font}
          aria-label="字体"
          onChange={(event) => updateData(id, { font: event.target.value as FontChoice })}
        >
          <option value="sans">无衬线</option>
          <option value="serif">标题衬线</option>
          <option value="mono">等宽</option>
        </select>
      </Field>
      <Segment
        label="密度"
        value={data.density}
        onChange={(density) => updateData(id, { density: density as Density })}
        options={[
          { value: "compact", label: "紧" },
          { value: "comfortable", label: "适中" },
          { value: "spacious", label: "松" },
        ]}
      />
      <Segment
        label="圆角"
        value={data.radius}
        onChange={(radius) => updateData(id, { radius: radius as Radius })}
        options={[
          { value: "sharp", label: "方" },
          { value: "soft", label: "柔" },
          { value: "round", label: "圆" },
        ]}
      />
      <Field label="备注">
        <textarea
          className={`${controlClass} min-h-16 resize-y`}
          value={data.notes}
          placeholder="语气、禁用色、想靠近的感觉"
          aria-label="风格备注"
          rows={2}
          onKeyDown={stopKeys}
          onChange={(event) => updateData(id, { notes: event.target.value })}
        />
      </Field>
    </NodeShell>
  );
}

function LayoutView({ id, data, selected }: NodeProps<Node<LayoutData, "layout">>) {
  const updateData = useCanvas((state) => state.updateData);
  return (
    <NodeShell id={id} kind="layout" selected={selected}>
      <Field label="结构">
        <select
          className={controlClass}
          value={data.structure}
          aria-label="页面结构"
          onChange={(event) => {
            const structure = event.target.value as StructureId;
            updateData(id, { structure, sections: [...STRUCTURES[structure].sections] });
          }}
        >
          {Object.entries(STRUCTURES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <span className="mb-1 block text-[10px] font-medium tracking-wide text-white/45">
          区块
        </span>
        <div className="flex flex-wrap gap-1">
          {ALL_SECTIONS.filter((section) => section !== "custom").map((section) => {
            const on = data.sections.includes(section);
            return (
              <button
                key={section}
                type="button"
                className={`nodrag rounded-full border px-2 py-0.5 text-[11px] ${
                  on ? "border-[#8fd0ff] bg-[#8fd0ff]/10 text-white" : "border-white/10 text-white/40"
                }`}
                onClick={() =>
                  updateData(id, {
                    sections: on
                      ? data.sections.filter((item) => item !== section)
                      : [...data.sections, section],
                  })
                }
              >
                {SECTION_LABELS[section]}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="备注">
        <textarea
          className={`${controlClass} min-h-16 resize-y`}
          value={data.notes}
          placeholder="结构上还想强调什么"
          aria-label="布局备注"
          rows={2}
          onKeyDown={stopKeys}
          onChange={(event) => updateData(id, { notes: event.target.value })}
        />
      </Field>
    </NodeShell>
  );
}

function ComponentView({
  id,
  data,
  selected,
}: NodeProps<Node<ComponentData, "component">>) {
  const updateData = useCanvas((state) => state.updateData);
  return (
    <NodeShell id={id} kind="component" selected={selected}>
      <Field label="类型">
        <select
          className={controlClass}
          value={data.kind}
          aria-label="组件类型"
          onChange={(event) => updateData(id, { kind: event.target.value })}
        >
          {COMPONENT_KINDS.map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="名称">
        <input
          className={controlClass}
          value={data.name}
          placeholder="这块叫什么"
          aria-label="组件名称"
          onKeyDown={stopKeys}
          onChange={(event) => updateData(id, { name: event.target.value })}
        />
      </Field>
      <Field label="规格">
        <textarea
          className={`${controlClass} min-h-28 resize-y`}
          value={data.spec}
          placeholder={specPlaceholder(data.kind)}
          aria-label="组件规格"
          rows={5}
          onKeyDown={stopKeys}
          onChange={(event) => updateData(id, { spec: event.target.value })}
        />
      </Field>
    </NodeShell>
  );
}

function GenerateView({
  id,
  data,
  selected,
}: NodeProps<Node<GenerateData, "generate">>) {
  const updateData = useCanvas((state) => state.updateData);
  const runOne = useCanvas((state) => state.runOne);
  const running = useCanvas((state) => state.runningIds.includes(id));
  const sourceLabel =
    data.source === "model" ? "模型" : data.source === "local" ? "本地合成" : "尚未运行";
  return (
    <NodeShell id={id} kind="generate" selected={selected}>
      <Segment
        label="输出格式"
        value={data.format}
        onChange={(format) => updateData(id, { format: format as Format })}
        options={[
          { value: "html", label: "HTML" },
          { value: "react", label: "React" },
        ]}
      />
      <Field label="模型">
        <select
          className={controlClass}
          value={data.model}
          aria-label="模型"
          onChange={(event) => updateData(id, { model: event.target.value })}
        >
          {MODEL_CHOICES.map((choice) => (
            <option key={choice.id || "default"} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        className="nodrag nopan inline-flex items-center justify-center gap-1.5 rounded-md bg-[#dff25a] px-3 py-1.5 text-[12px] font-medium text-[#1a1c08] disabled:opacity-60"
        disabled={running}
        onClick={() => void runOne(id)}
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {running ? "生成中" : "运行"}
      </button>
      <p className="text-[11px] text-white/45">
        {data.status === "error" ? "失败" : sourceLabel}
        {data.warning ? ` · ${data.warning}` : ""}
      </p>
    </NodeShell>
  );
}

function PreviewView({
  id,
  data,
  selected,
}: NodeProps<Node<PreviewData, "preview">>) {
  const updateData = useCanvas((state) => state.updateData);
  const srcDoc = data.code ? toSrcDoc(data.code, data.format) : "";
  return (
    <NodeShell id={id} kind="preview" selected={selected}>
      <Segment
        label="预览宽度"
        value={data.device}
        onChange={(device) =>
          updateData(id, { device: device as PreviewData["device"] })
        }
        options={[
          { value: "desktop", label: "桌面" },
          { value: "tablet", label: "平板" },
          { value: "mobile", label: "手机" },
        ]}
      />
      <div className="overflow-hidden rounded-md border border-white/10 bg-white">
        {srcDoc ? (
          <iframe
            title="节点预览"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            className="pointer-events-none h-48 w-full bg-white"
          />
        ) : (
          <div className="grid h-48 place-items-center px-4 text-center text-[12px] text-zinc-500">
            运行生成后，页面会出现在这里
          </div>
        )}
      </div>
    </NodeShell>
  );
}

function CodeView({ id, data, selected }: NodeProps<Node<CodeData, "code">>) {
  const applyCodeEdit = useCanvas((state) => state.applyCodeEdit);
  const projectName = useCanvas((state) => state.projectName);
  const showToast = useCanvas((state) => state.showToast);
  const ext = data.format === "react" ? "tsx" : "html";
  return (
    <NodeShell id={id} kind="code" selected={selected}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/45">
        <span>
          {ext.toUpperCase()}
          {data.edited ? " · 已手改" : ""}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="nodrag nopan rounded p-1 hover:bg-white/8 hover:text-white"
            aria-label="复制代码"
            onClick={() => {
              void navigator.clipboard.writeText(data.code).then(
                () => showToast("已复制"),
                () => showToast("复制失败"),
              );
            }}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="nodrag nopan rounded p-1 hover:bg-white/8 hover:text-white"
            aria-label="下载代码"
            onClick={() => {
              const blob = new Blob([data.code], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${fileBase(projectName)}.${ext}`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={13} />
          </button>
        </div>
      </div>
      <textarea
        className={`${controlClass} h-44 resize-none font-mono text-[11px] leading-relaxed`}
        value={data.code}
        placeholder="生成结果会写到这里，也可以直接改。"
        aria-label="代码"
        spellCheck={false}
        onKeyDown={stopKeys}
        onChange={(event) => applyCodeEdit(id, event.target.value)}
      />
      <p className="text-[10px] text-white/35">再次运行会覆盖手改。</p>
    </NodeShell>
  );
}

export const nodeTypes = {
  brief: memo(BriefView),
  style: memo(StyleView),
  layout: memo(LayoutView),
  component: memo(ComponentView),
  generate: memo(GenerateView),
  preview: memo(PreviewView),
  code: memo(CodeView),
};
