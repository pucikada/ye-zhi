import { buildModel } from "@/lib/compose-model";
import { themeCss } from "@/lib/theme";
import type { GenerationContext } from "@/lib/types";

export function systemPrompt(format: GenerationContext["format"]) {
  if (format === "react") {
    return [
      "你是前端页面生成器。只输出一个 React 组件，不要解释，不要 Markdown 围栏。",
      "组件必须是 `export default function GeneratedPage()`。",
      "不要 import。使用 className，类名只使用调用方样式表里已有的工具类和主题类。",
      "主题类：bg-canvas text-ink text-mute bg-accent text-accent text-onaccent bg-card border-line bg-soft bg-bar。",
      "布局类使用常见 Tailwind 写法：flex grid gap px py text-* font-* max-w-* rounded-* border。",
      "文案使用简体中文，贴合简报，不要 lorem，不要「欢迎来到」。",
      "页面要能在桌面和窄屏下阅读。按钮用 <a> 或 <button>，不要外链脚本。",
    ].join("\n");
  }
  return [
    "你是前端页面生成器。只输出一份完整 HTML 文档，不要解释，不要 Markdown 围栏。",
    "文档含 doctype、head、body。把调用方给出的 <style> 原样放进 head，不要删掉 CSS 变量。",
    "用主题类上色：bg-canvas text-ink text-mute bg-accent text-accent text-onaccent bg-card border-line bg-soft bg-bar。",
    "布局用 Tailwind 工具类：flex grid gap px py text-* font-* max-w-* rounded-* border。不要使用 bg-zinc、bg-white 这类调色板类。",
    "文案使用简体中文，贴合简报，不要 lorem，不要「欢迎来到」。",
    "页面要能在桌面和窄屏下阅读。链接使用 href=\"#\"，不要外链图片。",
  ].join("\n");
}

export function userPrompt(context: GenerationContext) {
  const model = buildModel(context);
  const css = themeCss(model.theme);
  const componentLines = context.components
    .map((item) => `- ${item.kind} / ${item.name || "未命名"}\n${item.spec || "（无规格）"}`)
    .join("\n\n");
  const upstream = context.upstreamCode
    .slice(0, 1)
    .map((code) => code.slice(0, 2500))
    .join("\n");
  return [
    `产品名：${model.name}`,
    `受众：${model.audience || "未写"}`,
    `主标题：${model.headline}`,
    `说明：${model.lede}`,
    `结构：${model.structure}`,
    `区块顺序：${model.sections.join("、")}`,
    model.notes ? `风格/布局备注：${model.notes}` : "",
    context.styles[0]
      ? `风格：背景 ${context.styles[0].bg}，文字 ${context.styles[0].fg}，强调 ${context.styles[0].accent}，字体 ${context.styles[0].font}，密度 ${context.styles[0].density}，圆角 ${context.styles[0].radius}`
      : "风格：使用默认墨白",
    componentLines ? `组件规格：\n${componentLines}` : "没有单独的组件规格，按区块做完整页面。",
    upstream ? `上游已有代码，可参考信息架构，但按本次节点重写：\n${upstream}` : "",
    "下面是必须保留的样式。HTML 模式请把它放进 <style>：",
    css,
  ]
    .filter(Boolean)
    .join("\n\n");
}
