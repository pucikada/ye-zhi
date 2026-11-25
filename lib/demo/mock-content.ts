import type { Checks, Item, NodeKind, NodeVersion, Origin } from "./types";

const MARK = "【本地模拟 · 未接入模型】";

export function classifyIntent(text: string): "version" | "derive" | "ask" {
  const derive = /派生|另做|新方案|换一版|另外做/.test(text);
  const version = /微调|补充|原地|改这一版|加一句|订正/.test(text);
  if (derive === version) return "ask";
  return derive ? "derive" : "version";
}

function items(list: Array<[string, string, string, string]>): Item[] {
  return list.map(([id, name, detail, group]) => ({ id, name, detail, group }));
}

export function mockVersion(input: {
  kind: NodeKind;
  instruction: string;
  upstream: string;
  specVersion: string;
  version: number;
  at: string;
  by: NodeVersion["by"];
  origin?: Origin;
  consumed: NodeVersion["consumed"];
}): Omit<NodeVersion, "checks" | "visual" | "associations"> & {
  checks: Checks | null;
  visual: NodeVersion["visual"];
  associations: NodeVersion["associations"];
} {
  const instruction = input.instruction.trim() || "按上游上下文生成一版";
  const base = {
    version: input.version,
    at: input.at,
    by: input.by,
    instruction,
    origin: input.origin ?? "mock-ai",
    specVersion: input.specVersion,
    consumed: input.consumed,
    associations: [],
    html: "",
    checks: null,
    visual: null,
  } satisfies Partial<NodeVersion>;

  if (input.kind === "doc") {
    const body = [
      MARK,
      `规范 ${input.specVersion}`,
      "",
      "需求描述",
      instruction,
      "",
      "接口设计",
      "需要活动详情、报名和倒计时三个契约。报名接口为 POST /join。",
      "",
      "代码设计",
      "页面由活动头图、倒计时、报名按钮组成，文案使用简体中文。",
      "",
      "测试点",
      "正常报名、重复报名、活动已结束。",
      input.upstream ? `\n上游摘要\n${input.upstream}` : "",
    ].join("\n");
    return { ...base, summary: "活动需求文档", body, items: [] };
  }

  if (input.kind === "api") {
    const list = items([
      ["item-get-campaign", "GET /campaign", "返回活动名称、结束时间和名额", "查询"],
      ["item-post-join", "POST /join", "报名。重复报名返回 409，结束后返回 410", "写入"],
      ["item-get-countdown", "GET /countdown", "返回剩余秒数，供倒计时组件使用", "查询"],
    ]);
    return {
      ...base,
      summary: "3 个接口",
      body: `${MARK}\n按文档整理的接口列表。接口定义不等于服务已上线。\n${input.upstream}`,
      items: list,
    };
  }

  if (input.kind === "design") {
    const night = /夜航|深蓝|暗色/.test(instruction);
    const summary = night ? "方案 · 夜航" : "方案 · 春日";
    const body = [
      MARK,
      summary,
      night ? "背景 #0b1020，强调 #7dd3fc，标题衬线。" : "背景 #10210f，强调 #dff25a，大标题。",
      "包含头图、倒计时、报名按钮和三枚图标。",
      instruction,
    ].join("\n");
    return { ...base, summary, body, items: [] };
  }

  if (input.kind === "component") {
    const list = items([
      ["item-carousel", "头图轮播", "活动主视觉轮播", "展示"],
      ["item-icons", "利益点图标", "三枚线性图标", "展示"],
      ["item-cta", "报名按钮", "主按钮，品牌强调色", "操作"],
    ]);
    return {
      ...base,
      summary: "识别出 3 个组件",
      body: `${MARK}\n这是组件清单，不是可运行组件包。\n${input.upstream}`,
      items: list,
    };
  }

  if (input.kind === "page") {
    const night = /夜航|深蓝/.test(`${instruction}\n${input.upstream}`);
    const html = pageHtml(night, input.specVersion);
    return {
      ...base,
      summary: "页面代码已产出",
      body: `${MARK}\n已写入页面代码。生成成功不等于检查通过，也不等于可交付。`,
      html,
      items: [],
      checks: {
        build: "pass",
        types: "pass",
        format: "fail",
        note: "模拟检查，未接入真实构建：构建通过，类型通过，格式有 1 条警告。检查失败不会解除冻结。",
      },
      visual: "pending",
    };
  }

  if (input.kind === "testcase") {
    const list = items([
      ["item-happy", "正常报名成功", "名额未满时返回报名编号", "功能"],
      ["item-dup", "重复报名", "同一用户再次 POST /join 得到 409", "接口"],
      ["item-ended", "活动已结束", "结束后报名被拒绝", "接口"],
      ["item-cta", "按钮在倒计时结束后不可点", "页面上主按钮禁用", "页面"],
    ]);
    return {
      ...base,
      summary: "4 条用例",
      body: `${MARK}\n用例文本已生成。自动执行未接入。\n${input.upstream}`,
      items: list,
    };
  }

  return {
    ...base,
    summary: "图片素材",
    body: `${MARK}\n${instruction || "一张活动主视觉占位图"}`,
    items: [],
  };
}

function pageHtml(night: boolean, specVersion: string) {
  const bg = night ? "#0b1020" : "#10210f";
  const accent = night ? "#7dd3fc" : "#dff25a";
  const ink = night ? "#e7eefc" : "#f3f0e8";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>春日报名</title>
<style>
  body{margin:0;background:${bg};color:${ink};font-family:"PingFang SC","Noto Sans SC",sans-serif}
  main{max-width:720px;margin:0 auto;padding:32px 20px}
  .mark{font-size:12px;opacity:.7}
  h1{font-size:40px;margin:12px 0}
  .time{font-size:28px;letter-spacing:.08em}
  button{background:${accent};color:#16180d;border:0;border-radius:999px;padding:12px 18px;font-weight:650}
  ul{padding:0;list-style:none;display:flex;gap:12px}
  li{border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:10px 12px}
</style>
</head>
<body>
<main>
  <p class="mark">模拟预览 · 规范 ${specVersion} · 未接入构建</p>
  <p>春日活动</p>
  <h1>北窗</h1>
  <p class="time">02:14:08</p>
  <ul><li>包邮</li><li>名额 128</li><li>当天发货</li></ul>
  <p><button>立即报名</button></p>
</main>
</body>
</html>`;
}
