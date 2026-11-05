import { streamText } from "ai";
import type { GatewayModelId } from "ai";
import { connection } from "next/server";

import { renderPage } from "@/lib/compose";
import { gatewayConfigured, resolveModelId } from "@/lib/models";
import { systemPrompt, userPrompt } from "@/lib/prompt";
import type { Format, GenerationContext } from "@/lib/types";

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
    briefs: raw.briefs.slice(0, 6).map((item) => ({
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
    layouts: (raw.layouts ?? []).slice(0, 4).map((item) => ({
      structure: item?.structure ?? "landing",
      sections: Array.isArray(item?.sections)
        ? item.sections.filter((section): section is string => typeof section === "string").slice(0, 24)
        : [],
      notes: clip(item?.notes, 1000),
    })),
    components: (raw.components ?? []).slice(0, 12).map((item) => ({
      kind: clip(item?.kind, 40) || "custom",
      name: clip(item?.name, 80),
      spec: clip(item?.spec, 4000),
    })),
    upstreamCode: (raw.upstreamCode ?? [])
      .filter((item): item is string => typeof item === "string")
      .slice(0, 2)
      .map((item) => item.slice(0, 6000)),
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

export async function GET() {
  await connection();
  return Response.json({
    configured: gatewayConfigured(),
    model: resolveModelId(),
  });
}

export async function POST(request: Request) {
  await connection();
  const body = (await request.json().catch(() => null)) as { context?: unknown; model?: unknown } | null;
  const context = asContext(body?.context);
  if (!context) return Response.json({ error: "缺少画布上下文" }, { status: 400 });

  const page = renderPage(context);
  const localCode = context.format === "react" ? page.react : page.html;
  const requested = typeof body?.model === "string" ? body.model : "";

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
