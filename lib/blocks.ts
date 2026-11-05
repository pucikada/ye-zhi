import type { ComponentSpec } from "@/lib/types";

const KINDS = new Set([
  "nav",
  "hero",
  "logos",
  "features",
  "quote",
  "pricing",
  "faq",
  "cta",
  "footer",
  "sidebar",
  "topbar",
  "stats",
  "table",
  "activity",
  "article",
  "auth",
  "form",
  "custom",
]);

export function parseBlocks(text: string): ComponentSpec[] {
  const blocks: ComponentSpec[] = [];
  let current: ComponentSpec | null = null;
  const flush = () => {
    if (!current) return;
    if (current.spec.trim() || current.name.trim()) blocks.push(current);
    current = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const match = /^@([a-z]+)\s*(.*)$/i.exec(line);
    if (match) {
      flush();
      const kind = match[1]?.toLowerCase() ?? "custom";
      current = {
        kind: KINDS.has(kind) ? kind : "custom",
        name: match[2]?.trim() ?? "",
        spec: "",
      };
      continue;
    }
    if (!line && !current) continue;
    if (!current) current = { kind: "custom", name: "", spec: "" };
    current.spec = current.spec ? `${current.spec}\n${line}` : line;
  }
  flush();
  return blocks;
}

export function serializeBlocks(blocks: ComponentSpec[]) {
  return blocks
    .map((block) => {
      const head = `@${block.kind}${block.name.trim() ? ` ${block.name.trim()}` : ""}`;
      const spec = block.spec.trim();
      return spec ? `${head}\n${spec}` : head;
    })
    .join("\n\n");
}

export function upsertBlock(text: string, block: ComponentSpec) {
  const blocks = parseBlocks(text);
  const index = blocks.findIndex((item) => item.kind === block.kind);
  if (index >= 0) {
    const previous = blocks[index];
    blocks[index] = {
      kind: block.kind,
      name: block.name.trim() || previous?.name || "",
      spec: block.spec,
    };
  } else {
    blocks.push(block);
  }
  return serializeBlocks(blocks);
}
