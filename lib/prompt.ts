import { buildModel } from "@/lib/compose-model";
import { SECTION_LABELS, STRUCTURES } from "@/lib/catalog";
import { themeCss } from "@/lib/theme";
import type { GenerationContext } from "@/lib/types";

export function systemPrompt(format: GenerationContext["format"]) {
  const motionLine =
    "若调用方给出了动效，用轻微过渡和位移表现，并包在 prefers-reduced-motion 里。不要大面积闪烁。";
  if (format === "react") {
    return [
      "你是前端页面生成器。只输出一个 React 组件，不要解释，不要 Markdown 围栏。",
      "组件必须是 `export default function GeneratedPage()`。",
      "不要 import。使用 className，类名只使用调用方样式表里已有的工具类和主题类。",
      "主题类：bg-canvas text-ink text-mute bg-accent text-accent text-onaccent bg-card border-line bg-soft bg-bar。",
      "布局类使用常见 Tailwind 写法：flex grid gap px py text-* font-* max-w-* rounded-* border。",
      "文案使用简体中文，贴合页面描述，不要 lorem，不要「欢迎来到」。",
      "页面要能在桌面和窄屏下阅读。按钮用 <a> 或 <button>，不要外链脚本。",
      motionLine,
    ].join("\n");
  }
  return [
    "你是前端页面生成器。只输出一份完整 HTML 文档，不要解释，不要 Markdown 围栏。",
    "文档含 doctype、head、body。把调用方给出的 <style> 原样放进 head，不要删掉 CSS 变量。",
    "用主题类上色：bg-canvas text-ink text-mute bg-accent text-accent text-onaccent bg-card border-line bg-soft bg-bar。",
    "布局用 Tailwind 工具类：flex grid gap px py text-* font-* max-w-* rounded-* border。不要使用 bg-zinc、bg-white 这类调色板类。",
    "文案使用简体中文，贴合页面描述，不要 lorem，不要「欢迎来到」。",
    "页面要能在桌面和窄屏下阅读。链接使用 href=\"#\"，不要外链图片。",
    motionLine,
  ].join("\n");
}

export function userPrompt(context: GenerationContext) {
  const model = buildModel(context);
  const css = themeCss(model.theme);
  const briefs = context.briefs
    .map(
      (item, index) =>
        `描述 ${index + 1}：${item.title || "未命名"} / ${item.audience || "受众未写"}\n主标题：${item.headline || "未写"}\n${item.prompt || "（无说明）"}`,
    )
    .join("\n\n");
  const frameworks = context.frameworks
    .map((item, index) => {
      const sections = (item.sections.length ? item.sections : STRUCTURES[item.structure].sections)
        .map((id) => SECTION_LABELS[id] ?? id)
        .join("、");
      return [
        `框架 ${index + 1}：${STRUCTURES[item.structure].label}，输出 ${item.stack === "react" ? "React" : "HTML"}`,
        `区块：${sections}`,
        item.components.trim() ? `组件规格：\n${item.components.trim()}` : "",
        item.notes.trim() ? `备注：${item.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  const motions = context.motions
    .map((item, index) => {
      const flags = [
        item.hover ? "悬停" : "",
        item.scroll ? "平滑滚动" : "",
        item.enter ? "入场" : "",
      ].filter(Boolean);
      return `动效 ${index + 1}：${item.level}，${flags.join("、") || "无"}${item.notes.trim() ? `。${item.notes.trim()}` : ""}`;
    })
    .join("\n");
  const datasets = context.datasets
    .map(
      (item, index) =>
        `数据 ${index + 1}：${item.name || "未命名"}（${item.format}）\n${item.sample.trim() || "（无样本）"}`,
    )
    .join("\n\n");
  const style = context.styles[0];
  return [
    briefs || "没有页面描述，按未命名产品做一页。",
    `主标题：${model.headline}`,
    `说明：${model.lede}`,
    frameworks || "没有框架节点，按落地页的常见区块来。",
    style
      ? `风格：背景 ${style.bg}，文字 ${style.fg}，强调 ${style.accent}，字体 ${style.font}，密度 ${style.density}，圆角 ${style.radius}${style.notes.trim() ? `。${style.notes.trim()}` : ""}`
      : "风格：使用默认墨白",
    motions || "没有动效节点，保持静止。",
    datasets || "没有单独的数据节点。",
    model.notes ? `汇总备注：${model.notes}` : "",
    "下面是必须保留的样式。HTML 模式请把它放进 <style>：",
    css,
  ]
    .filter(Boolean)
    .join("\n\n");
}
