"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";

import { KIND_COLOR, KIND_LABEL, type NodeKind } from "@/lib/demo/types";
import { currentVersion, instructionGate } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

const EXAMPLES: Record<NodeKind, string[]> = {
  doc: ["微调：把需求写得更短", "微调：补一句测试点"],
  api: ["微调：补充一个查询接口", "另做：拆出另一组接口"],
  design: ["微调：把主色再亮一点", "另做：换一套配色"],
  component: ["微调：补一个按钮", "另做：另做一套组件"],
  page: ["微调：标题改得更具体", "另做：另做一版页面"],
  image: ["微调：换成更暖的画面", "另做：另出一张图"],
  testcase: ["微调：补一条边界用例", "另做：另写一组用例"],
};

type Turn = { role: "user" | "assistant"; text: string };

export function NodeChat() {
  const selectedId = useDemo((state) => state.selectedNodeId);
  const node = useDemo((state) => state.nodes.find((item) => item.id === selectedId));
  const select = useDemo((state) => state.select);
  const instruct = useDemo((state) => state.instruct);
  const histories = useRef(new Map<string, Turn[]>());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gate = node ? instructionGate(useDemo.getState(), node.id) : null;
  const running = node?.job?.status === "running";

  useEffect(() => {
    if (!selectedId) return;
    setTurns(histories.current.get(selectedId) ?? []);
    setDraft("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    histories.current.set(selectedId, turns);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [selectedId, turns]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector("[role='menu']")) return;
      select(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  if (!node || !gate) return null;
  const version = currentVersion(node);
  const hint = !gate.enabled
    ? gate.reason
    : gate.mode === "derive"
      ? node.frozen
        ? "已永久冻结。发送会派生新节点，不会改这一张。"
        : "引用不复制内容。发送会派生新资产。"
      : "微调或补充出新版本，派生或另做会新建。没写明会先问。本地模拟，未接入模型。";

  function send(text: string) {
    const message = text.trim();
    if (!message || !gate?.enabled || !node) return;
    const next = [...turns, { role: "user" as const, text: message }];
    setTurns(next);
    setDraft("");
    instruct(node.id, message);
    const reply = useDemo.getState().toast || "已记下。";
    const stored = [...next, { role: "assistant" as const, text: reply }];
    histories.current.set(node.id, stored);
    if (useDemo.getState().selectedNodeId === node.id) setTurns(stored);
  }

  return (
    <aside
      role="dialog"
      aria-label={`${KIND_LABEL[node.kind]}对话`}
      className="absolute top-3 bottom-3 left-3 z-30 flex w-[min(380px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14171c]/95 text-zinc-100 shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-start gap-3 border-b border-white/8 px-4 py-3">
        <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[node.kind] }} />
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{node.name}</h2>
          <p className="text-[11px] text-white/45">
            {KIND_LABEL[node.kind]} · {version ? `v${version.version}` : "还没有产物"} · 单击空白或 Esc 关闭
          </p>
        </div>
        <button
          type="button"
          className="ml-auto rounded p-1 text-white/45 hover:bg-white/8 hover:text-white"
          aria-label="关闭对话"
          onClick={() => select(null)}
        >
          <X size={16} />
        </button>
      </header>
      <div className="max-h-28 overflow-auto border-b border-white/8 px-4 py-3 text-[12px] text-white/70">
        <p>{hint}</p>
        {version?.summary ? <p className="mt-1 text-white/45">{version.summary}</p> : null}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-3">
        {turns.length === 0 ? (
          <div className="grid gap-2">
            <p className="text-[12px] text-white/45">用一句话改这个节点。回车发送，Shift+回车换行。</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES[node.kind].map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={!gate.enabled}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-left text-[11px] text-white/70 hover:border-[#dff25a]/60 hover:text-white disabled:opacity-40"
                  onClick={() => send(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, index) => (
            <p
              key={`${turn.role}-${index}`}
              className={
                turn.role === "user"
                  ? "ml-8 rounded-2xl rounded-br-md bg-[#dff25a] px-3 py-2 text-[13px] text-[#1a1c08]"
                  : "mr-6 rounded-2xl rounded-bl-md bg-white/6 px-3 py-2 text-[13px] text-white/85"
              }
            >
              {turn.text}
            </p>
          ))
        )}
        {running ? (
          <p className="flex items-center gap-1.5 text-[12px] text-white/45">
            <Loader2 size={13} className="animate-spin" />
            正在改…
          </p>
        ) : null}
      </div>
      <form
        className="flex items-end gap-2 border-t border-white/8 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={2}
          disabled={!gate.enabled}
          aria-label="告诉这一节点要改什么"
          placeholder={gate.enabled ? "例如：微调：把主标题改得更具体" : gate.reason}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] outline-none placeholder:text-white/30 focus:border-[#dff25a] disabled:opacity-50"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              select(null);
              return;
            }
            event.stopPropagation();
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          onContextMenu={(event) => event.stopPropagation()}
        />
        <button
          type="submit"
          className="grid size-10 place-items-center rounded-xl bg-[#dff25a] text-[#1a1c08] disabled:opacity-50"
          aria-label="发送"
          disabled={!gate.enabled || draft.trim().length === 0}
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
