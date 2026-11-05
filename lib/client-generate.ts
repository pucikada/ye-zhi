import { ensureHtml, extractReact, looksLikeCode, stripFences } from "@/lib/codefmt";
import { renderPage } from "@/lib/compose";
import { localNodeEdit } from "@/lib/node-edit";
import { expandPatch } from "@/lib/node-fields";
import type { ChatTurn, Format, GenerationContext, NodeEditResult, NodeKind } from "@/lib/types";

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

function asEdit(body: unknown, kind: NodeKind): NodeEditResult | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { reply?: unknown; patch?: unknown; source?: unknown };
  if (typeof record.reply !== "string" || !record.patch || typeof record.patch !== "object") {
    return null;
  }
  return {
    reply: record.reply,
    patch: expandPatch(kind, record.patch as Record<string, unknown>),
    source: record.source === "model" ? "model" : "local",
  };
}

export async function requestNodeEdit(options: {
  kind: NodeKind;
  data: Record<string, unknown>;
  message: string;
  history?: ChatTurn[];
  signal?: AbortSignal;
}): Promise<NodeEditResult> {
  const local = localNodeEdit(options.kind, options.data, options.message);
  if (staticExport) return local;
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "edit",
        kind: options.kind,
        data: options.data,
        message: options.message,
        history: options.history ?? [],
      }),
      signal: options.signal,
    });
    if (!response.ok) return local;
    const parsed = asEdit(await response.json().catch(() => null), options.kind);
    if (!parsed) return local;
    if (Object.keys(parsed.patch).length === 0 && Object.keys(local.patch).length > 0) return local;
    return parsed;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return local;
  }
}
