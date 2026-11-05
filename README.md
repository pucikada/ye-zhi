# 页织

在无限画布上编排页面生成流程。双击添加节点，把简报、风格、布局和组件连到生成节点，运行后在预览和代码里看结果。交互借鉴无限画布加节点工作流，页面和代码都是自己的。

## 两分钟试一次

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>。画布上已经放好「落地页」模板。

1. 点中间的**生成**节点，再点节点上的**运行**（或工具栏的「运行选中」）。
2. 右侧预览会换成一页完整前端，代码节点里是同一份 HTML。
3. 改简报里的产品名或风格里的颜色，再运行一次。
4. 工具栏「模板」里可以换成「SaaS 定价」或「调度台」。撤销能回到上一张画布。

没有 `AI_GATEWAY_API_KEY` 时，运行走**本地合成**：仍然读取连到生成节点上游的简报、风格、布局和组件，写出可预览的页面。配上密钥后，同一次运行会改走 Vercel AI Gateway。

## 环境变量

```bash
cp .env.example .env.local
```

| 变量 | 作用 |
| --- | --- |
| `AI_GATEWAY_API_KEY` | AI Gateway 密钥。不填就只用本地合成。 |
| `AI_GATEWAY_MODEL` | 可选，`provider/model`。模型列表：`curl -s https://ai-gateway.vercel.sh/v1/models` |

部署到 Vercel 时可以用 OIDC（`VERCEL_OIDC_TOKEN`），不必把密钥写进仓库。生成节点里也可以临时改模型：Gemini 3.5 Flash、GPT-5.4 mini、Claude Sonnet 5。

需要 Node.js 22 或更新版本。

## GitHub Pages

公开的 GitHub Pages 站点是静态导出。仓库名用 `ye-zhi` 时，地址是 `https://pucikada.github.io/ye-zhi/`。页面上的「运行」在浏览器里本地合成，不调用模型。

GitHub Pages 不能托管 Next.js 的 Route Handler，所以 `/api/generate` 不在静态站点上。要走 Vercel AI Gateway，把同一个仓库部署到 Vercel，并设置 `AI_GATEWAY_API_KEY`。本地 `pnpm dev` 仍然会请求这个接口：没密钥就本地合成，有密钥就调用模型。

静态包：

```bash
NEXT_PUBLIC_BASE_PATH=/ye-zhi pnpm export:pages
```

产物在 `out/`。不设 `NEXT_PUBLIC_BASE_PATH` 时，导出的站点从域名根路径打开。

## 画布

- 双击空白处，或点「添加」，放出节点。
- 从右侧圆点拖到下一个节点。简报 / 风格 / 布局 / 组件 → 生成 → 代码 → 预览。
- **运行选中**只跑选中的生成节点。**从此运行**顺着选中节点往下游跑；什么都没选就跑全部。
- 代码节点可以直接改，连着的预览会跟着变。再运行会覆盖手改。
- `Ctrl Z` 撤销，`Ctrl Shift Z` 或 `Ctrl Y` 重做，`Ctrl Enter` 运行选中。
- 项目存在这个浏览器的 `localStorage` 里，刷新还在。

组件规格可以用简单的行格式，例如特性写 `标题 — 说明`，定价写 `名称 | 价格 | 说明 | 要点,要点`。占位文字里有例子。

## 脚本

```bash
pnpm dev        # 开发
pnpm build      # 生产构建
pnpm start      # 跑构建结果
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
```
