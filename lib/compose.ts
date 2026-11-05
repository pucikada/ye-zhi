import type { GenerationContext } from "@/lib/types";
import { themeCss } from "@/lib/theme";
import { utilityCss } from "@/lib/utilities";
import { buildModel, type PageModel } from "@/lib/compose-model";

type El = {
  t: string;
  c?: string;
  a?: Record<string, string>;
  raw?: string;
  kids: Array<El | string>;
};

function h(
  t: string,
  c: string,
  kids: Array<El | string | false | null | undefined> = [],
  a?: Record<string, string>,
): El {
  return {
    t,
    c,
    a,
    kids: kids.filter((kid): kid is El | string => Boolean(kid) || kid === ""),
  };
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHtml(node: El | string, depth: number): string {
  if (typeof node === "string") return esc(node);
  const pad = "  ".repeat(depth);
  if (node.raw != null) return `${pad}<${node.t}>${node.raw}</${node.t}>`;
  const attrs: string[] = [];
  if (node.c) attrs.push(`class="${esc(node.c)}"`);
  for (const [key, value] of Object.entries(node.a ?? {})) {
    attrs.push(`${key}="${esc(value)}"`);
  }
  const open = attrs.length ? `${node.t} ${attrs.join(" ")}` : node.t;
  if (node.kids.length === 0) return `${pad}<${open}></${node.t}>`;
  if (node.kids.length === 1 && typeof node.kids[0] === "string") {
    return `${pad}<${open}>${esc(node.kids[0])}</${node.t}>`;
  }
  const inner = node.kids.map((kid) => toHtml(kid, depth + 1)).join("\n");
  return `${pad}<${open}>\n${inner}\n${pad}</${node.t}>`;
}

function jsxChild(node: El | string, depth: number): string {
  if (typeof node === "string") return `${"  ".repeat(depth)}{${JSON.stringify(node)}}`;
  const pad = "  ".repeat(depth);
  if (node.raw != null && node.t === "style") {
    const css = node.raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return `${pad}<style>{\`${css}\`}</style>`;
  }
  const attrs: string[] = [];
  if (node.c) attrs.push(`className=${JSON.stringify(node.c)}`);
  for (const [key, value] of Object.entries(node.a ?? {})) {
    const prop = key === "class" ? "className" : key;
    attrs.push(`${prop}=${JSON.stringify(value)}`);
  }
  const attr = attrs.length ? " " + attrs.join(" ") : "";
  if (node.kids.length === 0) return `${pad}<${node.t}${attr} />`;
  if (node.kids.length === 1 && typeof node.kids[0] === "string") {
    return `${pad}<${node.t}${attr}>{${JSON.stringify(node.kids[0])}}</${node.t}>`;
  }
  const inner = node.kids.map((kid) => jsxChild(kid, depth + 1)).join("\n");
  return `${pad}<${node.t}${attr}>\n${inner}\n${pad}</${node.t}>`;
}

function btn(label: string, tone: "accent" | "ghost" | "inverse", model: PageModel) {
  const klass =
    tone === "accent"
      ? `${model.ui.btn} bg-accent text-onaccent px-4 py-2 text-sm font-medium`
      : tone === "inverse"
        ? `${model.ui.btn} bg-canvas text-ink px-4 py-2 text-sm font-medium`
        : `${model.ui.btn} border border-line px-4 py-2 text-sm`;
  return h("a", klass, [label], { href: "#start" });
}

function nav(model: PageModel) {
  if (!model.sections.includes("nav")) return null;
  return h("header", "sticky top-0 z-10 border-b border-line bg-bar", [
    h("div", "mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4", [
      h("a", "font-semibold tracking-tight", [model.name], { href: "#top" }),
      h(
        "nav",
        "hidden md:flex items-center gap-5 text-sm text-mute",
        model.nav.map((item) => h("a", "", [item], { href: "#start" })),
      ),
      btn(model.cta.primary, "accent", model),
    ]),
  ]);
}

function footer(model: PageModel) {
  if (!model.sections.includes("footer")) return null;
  return h("footer", "border-t border-line", [
    h("div", "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-mute", [
      h("div", "", [model.name]),
      h("div", "", [model.footerNote || model.audience || "由画布上的节点合成"]),
    ]),
  ]);
}

function hero(model: PageModel) {
  return h("section", `hero-glow ${model.ui.hero}`, [
    h("div", "mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2", [
      h("div", "", [
        model.audience
          ? h("p", "text-sm tracking-wide text-accent", [model.audience])
          : null,
        h("h1", "mt-3 text-4xl font-semibold tracking-tight md:text-5xl", [model.headline]),
        h("p", "mt-4 max-w-xl text-base leading-relaxed text-mute", [model.lede]),
        h("div", "mt-6 flex flex-wrap gap-3", [
          btn(model.cta.primary, "accent", model),
          model.cta.secondary ? btn(model.cta.secondary, "ghost", model) : null,
        ]),
      ]),
      h("div", `${model.ui.card} border border-line bg-card p-4 shadow-sm`, [
        h("div", "mb-3 flex items-center justify-between", [
          h("div", "flex gap-1.5", [
            h("span", "h-2 w-2 rounded-full bg-soft", []),
            h("span", "h-2 w-2 rounded-full bg-soft", []),
            h("span", "h-2 w-2 rounded-full bg-soft", []),
          ]),
          h("span", "text-xs text-mute", [model.name]),
        ]),
        ...(model.structure === "pricing" ? model.tiers : model.features).slice(0, 3).map((item, index) =>
          h("div", "flex items-start gap-3 border-b border-line py-3", [
            h("span", "text-xs font-medium text-accent", [
              String(index + 1).padStart(2, "0"),
            ]),
            h("div", "", [
              h("div", "text-sm font-medium", [
                "price" in item ? `${item.name} · ${item.price}` : item.title,
              ]),
              ("blurb" in item ? item.blurb : item.body)
                ? h("div", "mt-1 text-xs text-mute", [
                    "blurb" in item ? item.blurb : item.body,
                  ])
                : null,
            ]),
          ]),
        ),
      ]),
    ]),
  ]);
}

function logos(model: PageModel) {
  return h("section", "border-b border-line", [
    h("div", "mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-6 text-sm text-mute", [
      h("span", "text-xs uppercase tracking-wide", ["正在使用"]),
      ...model.logos.map((logo) => h("span", "font-medium text-ink", [logo])),
    ]),
  ]);
}

function features(model: PageModel) {
  return h("section", model.ui.section, [
    h("div", "mx-auto max-w-6xl px-6", [
      h("h2", "text-2xl font-semibold tracking-tight", [model.featureTitle]),
      h(
        "div",
        `mt-6 grid grid-cols-1 md:grid-cols-3 ${model.ui.gap}`,
        model.features.map((feature) =>
          h("article", `${model.ui.card} border border-line bg-card ${model.ui.pad}`, [
            h("h3", "text-base font-semibold", [feature.title]),
            feature.body
              ? h("p", "mt-2 text-sm leading-relaxed text-mute", [feature.body])
              : null,
          ]),
        ),
      ),
    ]),
  ]);
}

function quote(model: PageModel) {
  return h("section", model.ui.section, [
    h("div", "mx-auto max-w-3xl px-6", [
      h("blockquote", "text-2xl font-medium leading-snug tracking-tight", [
        `「${model.quote.text}」`,
      ]),
      h("p", "mt-4 text-sm text-mute", [`— ${model.quote.by}`]),
    ]),
  ]);
}

function pricing(model: PageModel) {
  return h("section", model.ui.section, [
    h("div", "mx-auto max-w-6xl px-6", [
      h("h2", "text-2xl font-semibold tracking-tight", ["价格"]),
      h("p", "mt-2 max-w-2xl text-sm text-mute", ["档位写在页面上，不藏在销售后面。"]),
      h(
        "div",
        `mt-6 grid grid-cols-1 md:grid-cols-3 ${model.ui.gap}`,
        model.tiers.map((tier) =>
          h(
            "article",
            `${model.ui.card} border p-5 ${
              tier.featured
                ? "border-transparent bg-accent text-onaccent"
                : "border-line bg-card"
            }`,
            [
              tier.featured ? h("div", "text-xs font-medium", ["推荐"]) : null,
              h("h3", "mt-2 text-lg font-semibold", [tier.name]),
              h("div", "mt-3 text-3xl font-semibold tracking-tight", [tier.price]),
              tier.blurb ? h("p", "mt-2 text-sm", [tier.blurb]) : null,
              h(
                "ul",
                "list-none mt-4 text-sm",
                tier.points.map((point) => h("li", "mt-2", [`· ${point}`])),
              ),
            ],
          ),
        ),
      ),
    ]),
  ]);
}

function faq(model: PageModel) {
  return h("section", model.ui.section, [
    h("div", "mx-auto max-w-3xl px-6", [
      h("h2", "text-2xl font-semibold tracking-tight", ["问答"]),
      h(
        "div",
        "mt-4",
        model.faqs.map((item) =>
          h("details", "", [
            h("summary", "", [item.q]),
            h("p", "mt-2 text-sm leading-relaxed text-mute", [item.a]),
          ]),
        ),
      ),
    ]),
  ]);
}

function cta(model: PageModel) {
  return h("section", model.ui.section, [
    h("div", `${model.ui.card} mx-auto max-w-6xl bg-accent px-6 py-10 text-onaccent md:px-10`, [
      h("h2", "text-3xl font-semibold tracking-tight", [model.cta.title]),
      h("p", "mt-3 max-w-2xl text-sm leading-relaxed", [model.lede]),
      h("div", "mt-6 flex flex-wrap gap-3", [
        btn(model.cta.primary, "inverse", model),
        model.cta.secondary
          ? h(
              "a",
              `${model.ui.btn} border border-line px-4 py-2 text-sm`,
              [model.cta.secondary],
              { href: "#start" },
            )
          : null,
      ]),
    ]),
  ]);
}

function customBlock(model: PageModel, title: string, body: string) {
  return h("section", model.ui.section, [
    h("div", "mx-auto max-w-3xl px-6", [
      h("h2", "text-2xl font-semibold", [title]),
      ...body.split(/\n+/).filter(Boolean).map((paragraph) =>
        h("p", "mt-3 text-sm leading-relaxed text-mute", [paragraph]),
      ),
    ]),
  ]);
}

function marketing(model: PageModel) {
  const blocks: Array<El | null> = [];
  for (const section of model.sections) {
    if (section === "nav") blocks.push(nav(model));
    else if (section === "hero") blocks.push(hero(model));
    else if (section === "logos") blocks.push(logos(model));
    else if (section === "features") blocks.push(features(model));
    else if (section === "quote") blocks.push(quote(model));
    else if (section === "pricing") blocks.push(pricing(model));
    else if (section === "faq") blocks.push(faq(model));
    else if (section === "cta") blocks.push(cta(model));
    else if (section === "footer") blocks.push(footer(model));
  }
  for (const extra of model.extras) {
    blocks.splice(Math.max(blocks.length - 1, 0), 0, customBlock(model, extra.title, extra.body));
  }
  return h("div", "min-h-screen bg-canvas text-ink antialiased", [
    h("div", "", [], { id: "top" }),
    ...blocks,
    h("div", "", [], { id: "start" }),
  ]);
}

function dashboard(model: PageModel) {
  const show = (id: string) => model.sections.includes(id);
  return h("div", "flex min-h-screen bg-canvas text-ink antialiased", [
    show("sidebar")
      ? h("aside", "hidden w-56 shrink-0 flex-col border-r border-line bg-card px-4 py-5 md:flex", [
          h("div", "px-2 text-sm font-semibold", [model.name]),
          h("div", "mt-1 px-2 text-xs text-mute", [model.audience || "工作台"]),
          h(
            "nav",
            "mt-6 grid gap-1 text-sm",
            model.sidebar.map((item, index) =>
              h(
                "a",
                `rounded-md px-2 py-2 ${index === 0 ? "bg-soft text-ink" : "text-mute"}`,
                [item],
                { href: "#start" },
              ),
            ),
          ),
        ])
      : null,
    h("div", "min-w-0 flex-1", [
      show("topbar")
        ? h("header", "flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6", [
            h("div", "", [
              h("div", "text-sm text-mute", ["今日"]),
              h("h1", "text-lg font-semibold tracking-tight", [model.headline]),
            ]),
            h("div", "field max-w-xs text-sm text-mute", ["搜索运单、车辆、班次"]),
          ])
        : null,
      h("main", "grid gap-4 p-4 md:p-6", [
        show("stats")
          ? h(
              "section",
              "grid grid-cols-2 md:grid-cols-4 gap-3",
              model.stats.map((stat) =>
                h("article", `${model.ui.card} border border-line bg-card p-4`, [
                  h("div", "text-xs text-mute", [stat.label]),
                  h("div", "mt-2 text-2xl font-semibold tabular-nums tracking-tight", [stat.value]),
                  stat.hint ? h("div", "mt-1 text-xs text-accent", [stat.hint]) : null,
                ]),
              ),
            )
          : null,
        show("table")
          ? h("section", `${model.ui.card} overflow-hidden border border-line bg-card`, [
              h("div", "border-b border-line px-4 py-3 text-sm font-medium", ["进行中"]),
              h("div", "overflow-auto px-4", [
                h("table", "w-full border-collapse text-sm", [
                  h("thead", "", [
                    h(
                      "tr",
                      "text-left text-mute",
                      model.table.columns.map((column) =>
                        h("th", "border-b border-line py-2 pr-3 font-medium", [column]),
                      ),
                    ),
                  ]),
                  h(
                    "tbody",
                    "",
                    model.table.rows.map((row) =>
                      h(
                        "tr",
                        "",
                        row.map((cell, index) =>
                          h("td", "border-b border-line py-2 pr-3", [
                            index === 2 ? h("span", "rounded-full bg-soft px-2 py-1 text-xs", [cell]) : cell,
                          ]),
                        ),
                      ),
                    ),
                  ),
                ]),
              ]),
            ])
          : null,
        show("activity")
          ? h("section", `${model.ui.card} border border-line bg-card p-4`, [
              h("h2", "text-sm font-medium", ["动态"]),
              h(
                "div",
                "mt-3",
                model.activity.map((item) =>
                  h("div", "border-b border-line py-3", [
                    h("div", "text-sm font-medium", [item.title]),
                    item.body ? h("div", "mt-1 text-xs text-mute", [item.body]) : null,
                  ]),
                ),
              ),
            ])
          : null,
      ]),
    ]),
  ]);
}

function docs(model: PageModel) {
  return h("div", "min-h-screen bg-canvas text-ink antialiased", [
    nav(model),
    h("div", "mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-4", [
      h(
        "aside",
        "text-sm",
        model.sidebar.map((item, index) =>
          h(
            "a",
            `block rounded-md px-2 py-2 ${index === 0 ? "bg-soft" : "text-mute"}`,
            [item],
            { href: "#start" },
          ),
        ),
      ),
      h("article", "md:col-span-3 max-w-3xl", [
        h("p", "text-sm text-accent", [model.audience || "文档"]),
        h("h1", "mt-2 text-4xl font-semibold tracking-tight", [model.headline]),
        ...model.article.map((paragraph) =>
          h("p", "mt-4 text-base leading-relaxed text-mute", [paragraph]),
        ),
      ]),
    ]),
  ]);
}

function auth(model: PageModel) {
  return h("main", "grid min-h-screen place-items-center bg-canvas px-4 py-16 text-ink antialiased", [
    h("form", `${model.ui.card} w-full max-w-md border border-line bg-card p-6`, [
      h("div", "text-sm text-mute", [model.name]),
      h("h1", "mt-2 text-2xl font-semibold tracking-tight", [model.headline]),
      h("p", "mt-2 text-sm leading-relaxed text-mute", [model.lede]),
      ...model.fields.map((field) =>
        h("label", "mt-4 block text-sm", [
          h("span", "mb-2 block text-mute", [field]),
          h("input", "field", [], { placeholder: field, type: field.includes("密码") ? "password" : "text" }),
        ]),
      ),
      h(
        "button",
        `mt-5 w-full ${model.ui.btn} bg-accent px-4 py-2 text-sm font-medium text-onaccent`,
        [model.cta.primary],
        { type: "submit" },
      ),
    ], { onsubmit: "return false" }),
  ]);
}

function pageTree(model: PageModel): El {
  if (model.structure === "dashboard") return dashboard(model);
  if (model.structure === "docs") return docs(model);
  if (model.structure === "auth") return auth(model);
  return marketing(model);
}

function documentHtml(model: PageModel, tree: El, css: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(model.name)}</title>
  <style>
${css}
  </style>
</head>
<body>
${toHtml(tree, 1)}
</body>
</html>
`;
}

function reactSource(model: PageModel, tree: El, css: string) {
  const embedded = css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `export default function GeneratedPage() {
  return (
    <>
      <style>{\`${embedded}\`}</style>
${jsxChild(tree, 3)}
    </>
  );
}
`;
}

export function renderPage(context: GenerationContext) {
  const model = buildModel(context);
  const css = `${themeCss(model.theme)}\n${utilityCss()}`;
  const tree = pageTree(model);
  return {
    html: documentHtml(model, tree, css),
    react: reactSource(model, tree, css),
    themeCss: css,
    title: model.name,
  };
}

export type { PageModel };
