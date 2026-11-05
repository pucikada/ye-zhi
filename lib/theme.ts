import type { FontChoice, PresetId, Radius, StyleData } from "@/lib/types";

export type Palette = {
  id: PresetId;
  label: string;
  bg: string;
  fg: string;
  accent: string;
};

export const PRESETS: Palette[] = [
  { id: "ink", label: "墨白", bg: "#0c0d0f", fg: "#f3f0e8", accent: "#e4f25a" },
  { id: "paper", label: "纸本", bg: "#f4f0e6", fg: "#1f1a14", accent: "#c2410c" },
  { id: "midnight", label: "夜航", bg: "#0b1020", fg: "#e7eefc", accent: "#7dd3fc" },
  { id: "grove", label: "森绿", bg: "#0e1512", fg: "#e7f5ee", accent: "#86efac" },
  { id: "dawn", label: "曙光", bg: "#fff5f2", fg: "#3f1d2e", accent: "#e11d48" },
];

const SANS = `"Segoe UI","PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei","WenQuanYi Micro Hei","Droid Sans Fallback",sans-serif`;
const SERIF = `"Iowan Old Style",Palatino,"Palatino Linotype","Songti SC","Noto Serif SC","Source Han Serif SC",serif`;
const MONO = `ui-monospace,"SFMono-Regular","Cascadia Code","WenQuanYi Micro Hei Mono","Droid Sans Fallback",monospace`;

export type ResolvedTheme = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentInk: string;
  card: string;
  line: string;
  font: string;
  display: string;
  radius: string;
};

const RADIUS: Record<Radius, string> = {
  sharp: "6px",
  soft: "16px",
  round: "28px",
};

export function presetById(id: PresetId) {
  return PRESETS.find((item) => item.id === id) ?? PRESETS[0];
}

export function safeHex(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = safeHex(hex, "#000000").slice(1);
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function mixHex(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

export function inkFor(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.64 ? "#16180d" : "#f8fafc";
}

function stacks(font: FontChoice) {
  if (font === "serif") return { font: SANS, display: SERIF };
  if (font === "mono") return { font: MONO, display: MONO };
  return { font: SANS, display: SANS };
}

export function resolveTheme(style?: StyleData): ResolvedTheme {
  const preset = presetById(style?.preset ?? "ink");
  const bg = safeHex(style?.bg ?? "", preset.bg);
  const fg = safeHex(style?.fg ?? "", preset.fg);
  const accent = safeHex(style?.accent ?? "", preset.accent);
  const { font, display } = stacks(style?.font ?? "sans");
  return {
    bg,
    fg,
    muted: mixHex(fg, bg, 0.42),
    accent,
    accentInk: inkFor(accent),
    card: mixHex(bg, fg, 0.06),
    line: mixHex(bg, fg, 0.16),
    font,
    display,
    radius: RADIUS[style?.radius ?? "soft"],
  };
}

export function themeCss(theme: ResolvedTheme) {
  return `:root{--bg:${theme.bg};--fg:${theme.fg};--muted:${theme.muted};--accent:${theme.accent};--onaccent:${theme.accentInk};--card:${theme.card};--line:${theme.line};--font:${theme.font};--display:${theme.display};--radius:${theme.radius}}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.55;font-size:16px}
h1,h2,h3{font-family:var(--display);margin:0}
p,ul,ol,figure{margin:0}
a{color:inherit;text-decoration:none}
button,input,textarea,select{font:inherit;color:inherit}
button{cursor:pointer;border:0;background:transparent}
img{max-width:100%}
::selection{background:var(--accent);color:var(--onaccent)}
.bg-canvas{background:var(--bg)}
.text-ink{color:var(--fg)}
.text-mute{color:var(--muted)}
.bg-accent{background:var(--accent)}
.text-accent{color:var(--accent)}
.text-onaccent{color:var(--onaccent)}
.bg-card{background:var(--card)}
.border-line{border-color:var(--line)}
.bg-soft{background:color-mix(in srgb,var(--accent) 16%,var(--card))}
.bg-bar{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px)}
.hero-glow{background:radial-gradient(540px 220px at 12% -10%,color-mix(in srgb,var(--accent) 32%,transparent),transparent 70%),var(--bg)}
.field{width:100%;background:transparent;border:1px solid var(--line);border-radius:var(--radius);padding:.7rem .8rem}
summary{cursor:pointer;font-weight:600}
details{border-bottom:1px solid var(--line);padding:.9rem 0}
.list-none{list-style:none;padding-left:0;margin:0}
`;
}
