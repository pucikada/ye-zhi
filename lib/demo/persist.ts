import type { DemoState } from "./types";

const SAMPLE_IDS = new Set(["cv-campaign", "cv-restyle", "cv-lib", "cv-member", "cv-qa"]);

export function normalizeWorkspace(input: unknown): DemoState | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<DemoState> & {
    canvases?: Array<DemoState["canvases"][number] & { scenario?: string; sample?: boolean }>;
  };
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.canvases) || !Array.isArray(raw.projects)) return null;
  const canvases = raw.canvases.map((canvas) => ({
    id: String(canvas.id),
    projectId: String(canvas.projectId),
    name: String(canvas.name || "画布"),
    sample:
      typeof canvas.sample === "boolean"
        ? canvas.sample
        : SAMPLE_IDS.has(String(canvas.id)) || typeof canvas.scenario === "string",
  }));
  return { ...(raw as DemoState), canvases };
}
