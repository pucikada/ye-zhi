import { ensureHtml, extractReact, looksLikeCode, stripFences } from "@/lib/codefmt";
import { renderPage } from "@/lib/compose";
import type { Format, GenerationContext } from "@/lib/types";

export type GenerationResult = {
  code: string;
  source: "local" | "model";
  warning: string;
  themeCss: string;
};

function localResult(context: GenerationContext, warning = ""): GenerationResult {
  const page = renderPage(context);
  return {
    code: context.format === "react" ? page.react : page.html,
    source: "local",
    warning,
    themeCss: page.themeCss,
  };
}

function finalize(text: string, format: Format, themeCss: string) {
  const stripped = stripFences(text);
  if (format === "html") return ensureHtml(stripped, themeCss);
  return extractReact(stripped);
}

export const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

export async function requestGeneration(options: {
  context: GenerationContext;
  model: string;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
}): Promise<GenerationResult> {
  const fallback = localResult(options.context);
  if (staticExport) {
    options.onChunk?.(fallback.code);
    return fallback;
  }
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: options.context,
        model: options.model,
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return localResult(options.context, "网络中断，已改用本地合成");
  }

  if (!response.ok || !response.body) {
    return localResult(options.context, "模型没有返回结果，已改用本地合成");
  }

  const sourceHeader = response.headers.get("X-Pageweave-Source");
  const warningHeader = response.headers.get("X-Pageweave-Warning");
  const warning = warningHeader ? decodeURIComponent(warningHeader) : "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    options.onChunk?.(acc);
  }
  acc += decoder.decode();

  if (sourceHeader === "local") {
    const code = finalize(acc, options.context.format, fallback.themeCss);
    return {
      code: looksLikeCode(code, options.context.format) ? code : fallback.code,
      source: "local",
      warning,
      themeCss: fallback.themeCss,
    };
  }

  const code = finalize(acc, options.context.format, fallback.themeCss);
  if (!looksLikeCode(code, options.context.format)) {
    return localResult(options.context, "模型输出无法预览，已改用本地合成");
  }
  return { code, source: "model", warning, themeCss: fallback.themeCss };
}
