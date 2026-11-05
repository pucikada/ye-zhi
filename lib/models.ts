export const DEFAULT_MODEL = "google/gemini-3.5-flash";

export const MODEL_CHOICES: Array<{ id: string; label: string }> = [
  { id: "", label: "环境默认" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini" },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
];

export function resolveModelId(requested?: string) {
  const fromRequest = requested?.trim();
  if (fromRequest) return fromRequest;
  return process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;
}

export function gatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}
