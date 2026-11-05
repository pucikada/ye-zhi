const SPACING: Record<string, string> = {
  "0": "0px",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "1.5": "0.375rem",
  "2": "0.5rem",
  "2.5": "0.625rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "14": "3.5rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
};

const TEXT: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
};

const MAX_W: Record<string, string> = {
  sm: "24rem",
  md: "28rem",
  lg: "32rem",
  xl: "36rem",
  "2xl": "42rem",
  "3xl": "48rem",
  "5xl": "64rem",
  "6xl": "72rem",
};

const ROUNDED: Record<string, string> = {
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};

function escClass(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function rule(name: string, body: string) {
  return `.${escClass(name)}{${body}}`;
}

function buildUtilities() {
  const base: string[] = [];
  const md: string[] = [];
  const spaceKeys = Object.keys(SPACING);

  base.push(
    rule("block", "display:block"),
    rule("flex", "display:flex"),
    rule("inline-flex", "display:inline-flex"),
    rule("grid", "display:grid"),
    rule("hidden", "display:none"),
    rule("flex-col", "flex-direction:column"),
    rule("flex-row", "flex-direction:row"),
    rule("flex-wrap", "flex-wrap:wrap"),
    rule("flex-1", "flex:1 1 0%"),
    rule("shrink-0", "flex-shrink:0"),
    rule("grow", "flex-grow:1"),
    rule("items-center", "align-items:center"),
    rule("items-start", "align-items:flex-start"),
    rule("items-end", "align-items:flex-end"),
    rule("items-stretch", "align-items:stretch"),
    rule("justify-between", "justify-content:space-between"),
    rule("justify-center", "justify-content:center"),
    rule("justify-end", "justify-content:flex-end"),
    rule("justify-start", "justify-content:flex-start"),
    rule("place-items-center", "place-items:center"),
    rule("grid-cols-1", "grid-template-columns:repeat(1,minmax(0,1fr))"),
    rule("grid-cols-2", "grid-template-columns:repeat(2,minmax(0,1fr))"),
    rule("grid-cols-3", "grid-template-columns:repeat(3,minmax(0,1fr))"),
    rule("grid-cols-4", "grid-template-columns:repeat(4,minmax(0,1fr))"),
    rule("col-span-1", "grid-column:span 1 / span 1"),
    rule("col-span-2", "grid-column:span 2 / span 2"),
    rule("col-span-3", "grid-column:span 3 / span 3"),
    rule("col-span-4", "grid-column:span 4 / span 4"),
    rule("w-full", "width:100%"),
    rule("h-full", "height:100%"),
    rule("min-h-screen", "min-height:100vh"),
    rule("min-w-0", "min-width:0"),
    rule("w-2", "width:0.5rem"),
    rule("h-2", "height:0.5rem"),
    rule("w-56", "width:14rem"),
    rule("w-64", "width:16rem"),
    rule("mx-auto", "margin-left:auto;margin-right:auto"),
    rule("text-center", "text-align:center"),
    rule("text-left", "text-align:left"),
    rule("font-normal", "font-weight:400"),
    rule("font-medium", "font-weight:500"),
    rule("font-semibold", "font-weight:600"),
    rule("tracking-tight", "letter-spacing:-0.03em"),
    rule("tracking-wide", "letter-spacing:0.06em"),
    rule("leading-none", "line-height:1"),
    rule("leading-snug", "line-height:1.35"),
    rule("leading-relaxed", "line-height:1.7"),
    rule("uppercase", "text-transform:uppercase"),
    rule("tabular-nums", "font-variant-numeric:tabular-nums"),
    rule("antialiased", "-webkit-font-smoothing:antialiased"),
    rule("whitespace-nowrap", "white-space:nowrap"),
    rule("overflow-hidden", "overflow:hidden"),
    rule("overflow-auto", "overflow:auto"),
    rule("overflow-y-auto", "overflow-y:auto"),
    rule("relative", "position:relative"),
    rule("sticky", "position:sticky"),
    rule("top-0", "top:0"),
    rule("z-10", "z-index:10"),
    rule("border", "border-width:1px;border-style:solid"),
    rule("border-b", "border-bottom-width:1px;border-bottom-style:solid"),
    rule("border-t", "border-top-width:1px;border-top-style:solid"),
    rule("border-r", "border-right-width:1px;border-right-style:solid"),
    rule("border-collapse", "border-collapse:collapse"),
    rule("shadow-sm", "box-shadow:0 10px 30px rgba(0,0,0,.08)"),
  );

  for (const [name, size] of Object.entries(TEXT)) {
    base.push(
      rule(`text-${name}`, `font-size:${size}`),
    );
    if (name === "4xl" || name === "5xl" || name === "3xl" || name === "2xl") {
      md.push(rule(`md:text-${name}`, `font-size:${size}`));
    }
  }

  for (const [name, size] of Object.entries(MAX_W)) {
    base.push(rule(`max-w-${name}`, `max-width:${size}`));
  }

  for (const [name, size] of Object.entries(ROUNDED)) {
    base.push(rule(`rounded-${name}`, `border-radius:${size}`));
  }

  for (const key of spaceKeys) {
    const v = SPACING[key];
    base.push(
      rule(`p-${key}`, `padding:${v}`),
      rule(`px-${key}`, `padding-left:${v};padding-right:${v}`),
      rule(`py-${key}`, `padding-top:${v};padding-bottom:${v}`),
      rule(`pt-${key}`, `padding-top:${v}`),
      rule(`pb-${key}`, `padding-bottom:${v}`),
      rule(`mt-${key}`, `margin-top:${v}`),
      rule(`mb-${key}`, `margin-bottom:${v}`),
      rule(`gap-${key}`, `gap:${v}`),
    );
    md.push(
      rule(`md:p-${key}`, `padding:${v}`),
      rule(`md:px-${key}`, `padding-left:${v};padding-right:${v}`),
      rule(`md:py-${key}`, `padding-top:${v};padding-bottom:${v}`),
      rule(`md:gap-${key}`, `gap:${v}`),
      rule(`md:mt-${key}`, `margin-top:${v}`),
    );
  }

  md.push(
    rule("md:flex", "display:flex"),
    rule("md:grid", "display:grid"),
    rule("md:block", "display:block"),
    rule("md:hidden", "display:none"),
    rule("md:flex-row", "flex-direction:row"),
    rule("md:items-center", "align-items:center"),
    rule("md:justify-between", "justify-content:space-between"),
    rule("md:grid-cols-2", "grid-template-columns:repeat(2,minmax(0,1fr))"),
    rule("md:grid-cols-3", "grid-template-columns:repeat(3,minmax(0,1fr))"),
    rule("md:grid-cols-4", "grid-template-columns:repeat(4,minmax(0,1fr))"),
    rule("md:col-span-3", "grid-column:span 3 / span 3"),
    rule("md:w-56", "width:14rem"),
  );

  return `${base.join("")}@media (min-width:768px){${md.join("")}}`;
}

let cached = "";

export function utilityCss() {
  if (!cached) cached = buildUtilities();
  return cached;
}
