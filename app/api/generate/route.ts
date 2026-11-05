import { generateText, streamText } from "ai";
import type { GatewayModelId } from "ai";
import { connection } from "next/server";

import { renderPage } from "@/lib/compose";
import { editInstruction, editUserPrompt, localNodeEdit } from "@/lib/node-edit";
import { expandPatch, isNodeKind } from "@/lib/node-fields";
import { gatewayConfigured, resolveModelId } from "@/lib/models";
import { stripFences } from "@/lib/codefmt";
import { systemPrompt, userPrompt } from "@/lib/prompt";
import type { Format, GenerationContext, NodeKind } from "@/lib/types";

export const maxDuration = 60;

function clip(value: unknown, limit = 4000) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function asContext(value: unknown): GenerationContext | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<GenerationContext>;
  if (!Array.isArray(raw.briefs) || !Array.isArray(raw.styles)) return null;
  const format: Format = raw.format === "react" ? "react" : "html";
  return {
    format,
    briefs: raw.briefs.slice(0, 8).map((item) => ({
      title: clip(item?.title, 80),
      audience: clip(item?.audience, 80),
      headline: clip(item?.headline, 120),
      prompt: clip(item?.prompt, 4000),
    })),
    styles: raw.styles.slice(0, 4).map((item) => ({
      preset: item?.preset ?? "ink",
      bg: clip(item?.bg, 16),
      fg: clip(item?.fg, 16),
      accent: clip(item?.accent, 16),
      font: item?.font === "serif" || item?.font === "mono" ? item.font : "sans",
      density:
        item?.density === "compact" || item?.density === "spacious" ? item.density : "comfortable",
      radius: item?.radius === "sharp" || item?.radius === "round" ? item.radius : "soft",
      notes: clip(item?.notes, 1000),
    })),
    frameworks: (raw.frameworks ?? []).slice(0, 4).map((item) => ({
      stack: item?.stack === "react" ? "react" : "html",
      structure: item?.structure ?? "landing",
      sections: Array.isArray(item?.sections)
        ? item.sections.filter((section): section is string => typeof section === "string").slice(0, 24)
        : [],
      components: clip(item?.components, 8000),
      notes: clip(item?.notes, 1000),
    })),
    motions: (raw.motions ?? []).slice(0, 4).map((item) => ({
      level: item?.level === "none" || item?.level === "lively" ? item.level : "subtle",
      hover: Boolean(item?.hover),
      scroll: Boolean(item?.scroll),
      enter: item?.enter !== false,
      notes: clip(item?.notes, 1000),
    })),
    datasets: (raw.datasets ?? []).slice(0, 8).map((item) => ({
      name: clip(item?.name, 80),
      format:
        item?.format === "list" || item?.format === "stats" || item?.format === "json"
          ? item.format
          : "table",
      sample: clip(item?.sample, 8000),
      notes: clip(item?.notes, 1000),
    })),
  };
}

function plain(code: string, source: "local" | "model", warning = "", model = "") {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Pageweave-Source": source,
  });
  if (warning) headers.set("X-Pageweave-Warning", encodeURIComponent(warning).slice(0, 800));
  if (model) headers.set("X-Pageweave-Model", model);
  return new Response(code, { headers });
}

function failureText(error: unknown) {
  const message = error instanceof Error ? error.message : "模型调用失败";
  return message.replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]").slice(0, 180);
}

function parseEdit(text: string) {
  const stripped = stripFences(text);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as {
      reply?: unknown;
      patch?: unknown;
    };
    if (!parsed.patch || typeof parsed.patch !== "object") return null;
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "已按你的说法改了这一节点。",
      patch: parsed.patch as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

function editResponse(
  kind: NodeKind,
  reply: string,
  patch: Record<string, unknown>,
  source: "local" | "model",
) {
  return Response.json({
    reply,
    patch: expandPatch(kind, patch),
    source,
  });
}

async function editNode(body: {
  kind?: unknown;
  data?: unknown;
  message?: unknown;
  history?: unknown;
  model?: unknown;
}) {
  if (!isNodeKind(body.kind)) {
    return Response.json({ error: "未知节点" }, { status: 400 });
  }
  const data =
    body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
  const message = clip(body.message, 2000);
  const history = Array.isArray(body.history)
    ? body.history.slice(-6).flatMap((turn) => {
        if (!turn || typeof turn !== "object") return [];
        const record = turn as { role?: unknown; text?: unknown };
        if ((record.role !== "user" && record.role !== "assistant") || typeof record.text !== "string") {
          return [];
        }
        return [{ role: record.role, text: record.text.slice(0, 500) }];
      })
    : [];
  const local = localNodeEdit(body.kind, data, message);
  if (!gatewayConfigured()) return editResponse(body.kind, local.reply, local.patch, "local");

  const model = resolveModelId(typeof body.model === "string" ? body.model : "") as GatewayModelId;
  try {
    const result = await generateText({
      model,
      instructions: editInstruction(body.kind),
      prompt: editUserPrompt(body.kind, data, message, history),
      maxOutputTokens: 800,
      maxRetries: 0,
    });
    const parsed = parseEdit(result.text);
    if (!parsed) return editResponse(body.kind, local.reply, local.patch, "local");
    const patch = expandPatch(body.kind, parsed.patch);
    if (Object.keys(patch).length === 0 && Object.keys(local.patch).length > 0) {
      return editResponse(body.kind, local.reply, local.patch, "local");
    }
    return editResponse(body.kind, parsed.reply, patch, "model");
  } catch (error) {
    return editResponse(body.kind, `${local.reply}（${failureText(error)}）`, local.patch, "local");
  }
}

export async function GET() {
  await connection();
  return Response.json({
    configured: gatewayConfigured(),
    model: resolveModelId(),
  });
}

export async function POST(request: Request) {
  await connection();
  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
    context?: unknown;
    model?: unknown;
    kind?: unknown;
    data?: unknown;
    message?: unknown;
    history?: unknown;
  } | null;
  if (!body) return Response.json({ error: "缺少内容" }, { status: 400 });
  if (body.mode === "edit") return editNode(body);

  const context = asContext(body.context);
  if (!context) return Response.json({ error: "缺少画布上下文" }, { status: 400 });

  const page = renderPage(context);
  const localCode = context.format === "react" ? page.react : page.html;
  const requested = typeof body.model === "string" ? body.model : "";

  if (!gatewayConfigured()) {
    return plain(localCode, "local");
  }

  const model = resolveModelId(requested) as GatewayModelId;
  try {
    const result = streamText({
      model,
      instructions: systemPrompt(context.format),
      prompt: userPrompt(context),
      maxOutputTokens: 8000,
      maxRetries: 0,
    });
    return result.toTextStreamResponse({
      headers: {
        "X-Pageweave-Source": "model",
        "X-Pageweave-Model": model,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return plain(localCode, "local", failureText(error), model);
  }
}
