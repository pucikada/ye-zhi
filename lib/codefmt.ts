import type { Format } from "@/lib/types";
import { utilityCss } from "@/lib/utilities";

export function stripFences(text: string) {
  let value = text.trim();
  value = value.replace(/^```[a-zA-Z]*\s*/m, "");
  value = value.replace(/```\s*$/m, "");
  return value.trim();
}

export function extractHtml(text: string) {
  const stripped = stripFences(text);
  const start = stripped.search(/<!DOCTYPE|<html/i);
  if (start >= 0) {
    const end = stripped.search(/<\/html>/i);
    if (end >= 0) return stripped.slice(start, end + "</html>".length);
    return stripped.slice(start);
  }
  return stripped;
}

export function extractReact(text: string) {
  const stripped = stripFences(text);
  const index = stripped.search(/export\s+default|function\s+[A-Za-z]/);
  if (index > 0) return stripped.slice(index).trim();
  return stripped;
}

export function looksLikeCode(text: string, format: Format) {
  if (format === "html") return /<(main|body|section|div|html)\b/i.test(text);
  return /function\s+\w+|export\s+default|return\s*\(/.test(text);
}

export function ensureHtml(code: string, css: string) {
  let html = extractHtml(code);
  const needsCss = !html.includes(".flex{") && !html.includes("--bg:");
  if (!/<html[\s>]/i.test(html)) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${css}</style>
</head>
<body>${html}</body>
</html>`;
  }
  if (needsCss || !html.includes("--bg:")) {
    const style = `<style>${css}</style>`;
    if (html.includes("</head>")) html = html.replace("</head>", `${style}</head>`);
    else html = html.replace(/<html[^>]*>/i, (match) => `${match}<head>${style}</head>`);
  }
  return html;
}

export function prepareReact(source: string) {
  let name = "GeneratedPage";
  let code = extractReact(source).replace(/^import .*$/gm, "").trim();
  const named = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (named?.[1]) {
    name = named[1];
    code = code.replace(/export\s+default\s+function/, "function");
  } else if (/export\s+default\s+/.test(code)) {
    code = code.replace(/export\s+default\s+/, "const GeneratedPage = ");
    name = "GeneratedPage";
  } else if (!new RegExp(`function\\s+${name}\\b`).test(code)) {
    const anyFn = code.match(/function\s+([A-Za-z0-9_]+)/);
    if (anyFn?.[1]) name = anyFn[1];
  }
  return { code, name };
}

export function toSrcDoc(code: string, format: Format) {
  if (!code.trim()) return "";
  if (format === "html") return code;
  const prepared = prepareReact(code);
  const css = utilityCss();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${css}</style>
  <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root" style="font-family:sans-serif;padding:24px;color:#666">正在编译 React 预览…</div>
  <script type="text/babel">
${prepared.code}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(${prepared.name}));
  </script>
</body>
</html>`;
}

export function fileBase(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "page";
}
