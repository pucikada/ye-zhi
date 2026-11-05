export type Feature = { title: string; body: string };
export type Tier = {
  name: string;
  price: string;
  blurb: string;
  points: string[];
  featured: boolean;
};
export type Faq = { q: string; a: string };
export type Stat = { value: string; label: string; hint: string };
export type Quote = { text: string; by: string };

export function linesOf(spec: string) {
  return spec
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function splitTitle(line: string) {
  const cleaned = line.replace(/^[-*•]\s*/, "");
  const parts = cleaned.split(/\s*[—–|]\s*|\s+-\s+|：/).map((part) => part.trim());
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { title: parts[0], body: parts.slice(1).join(" ") };
  }
  return { title: cleaned, body: "" };
}

export function parseFeatures(spec: string): Feature[] {
  return linesOf(spec)
    .map(splitTitle)
    .filter((item) => item.title)
    .slice(0, 6);
}

export function parseFaqs(spec: string): Faq[] {
  return linesOf(spec)
    .map(splitTitle)
    .filter((item) => item.title && item.body)
    .map((item) => ({ q: item.title, a: item.body }))
    .slice(0, 8);
}

export function parseQuote(spec: string): Quote | null {
  const first = linesOf(spec)[0];
  if (!first) return null;
  const item = splitTitle(first);
  if (!item.title) return null;
  return { text: item.title, by: item.body || "用户" };
}

export function parseTiers(spec: string): Tier[] {
  const tiers: Tier[] = [];
  for (const line of linesOf(spec)) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 2) continue;
    let name = parts[0] ?? "";
    let featured = false;
    if (name.endsWith("*")) {
      featured = true;
      name = name.slice(0, -1).trim();
    }
    tiers.push({
      name,
      price: parts[1] ?? "",
      blurb: parts[2] ?? "",
      points: (parts[3] ?? "")
        .split(/[,，]/)
        .map((point) => point.trim())
        .filter(Boolean),
      featured,
    });
  }
  if (!tiers.some((tier) => tier.featured) && tiers.length > 0) {
    const index = tiers.length >= 3 ? 1 : tiers.length - 1;
    tiers[index]!.featured = true;
  }
  return tiers.slice(0, 4);
}

export function parseStats(spec: string): Stat[] {
  const stats: Stat[] = [];
  for (const line of linesOf(spec)) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2) {
      stats.push({
        value: parts[0] ?? "",
        label: parts[1] ?? "",
        hint: parts[2] ?? "",
      });
    }
  }
  return stats.slice(0, 4);
}

export function parseTable(spec: string): { columns: string[]; rows: string[][] } {
  const rows = linesOf(spec).map((line) =>
    line.split("|").map((cell) => cell.trim()),
  );
  if (rows.length < 2) return { columns: [], rows: [] };
  return {
    columns: rows[0] ?? [],
    rows: rows.slice(1, 8),
  };
}

export function parseLinks(spec: string) {
  return linesOf(spec)
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

export function parseCta(spec: string) {
  const first = linesOf(spec)[0];
  if (!first) return { primary: "", secondary: "" };
  const parts = first.split("|").map((part) => part.trim());
  return { primary: parts[0] ?? "", secondary: parts[1] ?? "" };
}

export function parseHero(spec: string) {
  const rows = linesOf(spec);
  return { headline: rows[0] ?? "", lede: rows[1] ?? "" };
}

export function firstComponent(
  components: Array<{ kind: string; name: string; spec: string }>,
  kind: string,
) {
  return components.find((item) => item.kind === kind);
}
