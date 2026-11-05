# 页织

在无限画布上编排页面。节点可以自由相连，像一条视频工作流：页面描述、页面风格、框架&组件、交互动效、数据，汇进「页面」后生成预览。单击节点，用对话改这一节点的文案和参数。

## 两分钟试一次

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>。画布上已经放好「落地页」模板，页面节点里有一页预览。

1. 单击**页面描述**，在对话里说「把产品名改成北窗」。节点文案会改，连着的页面会重新生成。
2. 从任意节点的右侧圆点拖到另一个节点。连进**页面**就会更新预览。
3. 右侧大预览和代码跟的是选中的页面节点。
4. 工具栏「模板」里可以换成「SaaS 定价」或「调度台」。撤销能回到上一张画布。

没有 `AI_GATEWAY_API_KEY` 时，生成和节点对话都走**本地**：读取连到页面节点上游的描述、风格、框架、动效和数据，写出可预览的页面，并按对话改当前节点的字段。配上密钥后，同一次生成和对话会改走 Vercel AI Gateway。静态的 GitHub Pages 站点始终只用本地。

## 环境变量

```bash
cp .env.example .env.local
```

| 变量 | 作用 |
| --- | --- |
| `AI_GATEWAY_API_KEY` | AI Gateway 密钥。不填就只用本地合成。 |
| `AI_GATEWAY_MODEL` | 可选，`provider/model`。模型列表：`curl -s https://ai-gateway.vercel.sh/v1/models` |

部署到 Vercel 时可以用 OIDC（`VERCEL_OIDC_TOKEN`），不必把密钥写进仓库。页面节点的对话里也可以指定模型：Gemini 3.5 Flash、GPT-5.4 mini、Claude Sonnet 5。

需要 Node.js 22 或更新版本。

## GitHub Pages

公开的 GitHub Pages 站点是静态导出。仓库名用 `ye-zhi` 时，地址是 `https://pucikada.github.io/ye-zhi/`。页面上的生成和节点对话都在浏览器里本地完成，不调用模型。

GitHub Pages 不能托管 Next.js 的 Route Handler，所以 `/api/generate` 不在静态站点上。要走 Vercel AI Gateway，把同一个仓库部署到 Vercel，并设置 `AI_GATEWAY_API_KEY`。本地 `pnpm dev` 仍然会请求这个接口：没密钥就本地合成，有密钥就调用模型。

静态包：

```bash
NEXT_PUBLIC_BASE_PATH=/ye-zhi pnpm export:pages
```

产物在 `out/`。不设 `NEXT_PUBLIC_BASE_PATH` 时，导出的站点从域名根路径打开。

## 画布

六种节点：页面描述、页面风格、框架&组件、交互动效、数据、页面。旧的简报 / 布局 / 组件 / 生成 / 代码 / 预览图会在打开时迁成这六种；迁不动的图会换成落地页模板。

- 双击空白处，或点「添加」，放出节点。
- 节点可以自由相连。连到**页面**，或改了已连上的上游，预览会更新。
- 单击节点打开对话。对话只改当前节点的字段，不改连线。
- **生成选中**重跑选中的页面。**生成页面**顺着选中节点往下游找页面；什么都没选就生成全部页面。
- 右侧代码可以直接改。再次生成会覆盖手改。
- `Ctrl Z` 撤销，`Ctrl Shift Z` 或 `Ctrl Y` 重做，`Ctrl Enter` 生成选中。
- 项目存在这个浏览器的 `localStorage`（`yezhi.project.v2`）里，刷新还在。

框架节点里的组件用 `@类型` 起一段，例如：

```
@features 三件事
无限画布 — 节点自由相连
对话改稿 — 点开节点就能改

@quote 评价
终于不用先开一个空的 index.html — 独立开发者
```

数据节点按格式读样本：表格用 `|` 分列，指标写 `数字 | 标签 | 补充`，名称里带「价」的表格会当成定价档。

## 脚本

```bash
pnpm dev        # 开发
pnpm build      # 生产构建
pnpm start      # 跑构建结果
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
```
