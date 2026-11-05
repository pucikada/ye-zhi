"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";

import { KIND_META } from "@/lib/catalog";
import { requestNodeEdit } from "@/lib/client-generate";
import { CHAT_EXAMPLES } from "@/lib/node-edit";
import { fieldRows } from "@/lib/node-fields";
import { useCanvas } from "@/lib/store";
import type { ChatTurn } from "@/lib/types";

export function NodeChat() {
  const inspectorId = useCanvas((state) => state.inspectorId);
  const node = useCanvas((state) => state.nodes.find((item) => item.id === inspectorId));
  const setInspector = useCanvas((state) => state.setInspector);
  const updateData = useCanvas((state) => state.updateData);
  const histories = useRef(new Map<string, ChatTurn[]>());
  const requestId = useRef(0);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!inspectorId) return;
    setTurns(histories.current.get(inspectorId) ?? []);
    setDraft("");
    setBusy(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [inspectorId]);

  useEffect(() => {
    if (!inspectorId) return;
    histories.current.set(inspectorId, turns);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [inspectorId, turns]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setInspector(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setInspector]);

  if (!inspectorId || !node) return null;
  const meta = KIND_META[node.type];
  const rows = fieldRows(node);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy || !node) return;
    const target = node;
    const request = ++requestId.current;
    const history = turns.slice(-8);
    const next = [...turns, { role: "user" as const, text: message }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    const finish = (reply: string) => {
      const stored = [...next, { role: "assistant" as const, text: reply }];
      histories.current.set(target.id, stored);
      if (requestId.current === request && useCanvas.getState().inspectorId === target.id) {
        setTurns(stored);
        setBusy(false);
      }
    };
    try {
      const result = await requestNodeEdit({
        kind: target.type,
        data: { ...target.data },
        message,
        history,
      });
      if (Object.keys(result.patch).length > 0) updateData(target.id, result.patch);
      finish(result.reply);
    } catch {
      finish("这次没改成，换种说法再试一次。");
    }
  }

  return (
    <aside
      role="dialog"
      aria-label={`${meta.label}对话`}
      className="absolute top-3 left-3 bottom-3 z-30 flex w-[min(380px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14171c]/95 text-zinc-100 shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-start gap-3 border-b border-white/8 px-4 py-3">
        <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{meta.label}</h2>
          <p className="text-[11px] text-white/45">只改这个节点的文案和参数，不改连线。</p>
        </div>
        <button
          type="button"
          className="ml-auto rounded p-1 text-white/45 hover:bg-white/8 hover:text-white"
          aria-label="关闭对话"
          onClick={() => setInspector(null)}
        >
          <X size={16} />
        </button>
      </header>
      <div className="max-h-40 overflow-auto border-b border-white/8 px-4 py-3">
        <dl className="grid gap-1.5">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[4.5rem_1fr] gap-2 text-[12px]">
              <dt className="text-white/40">{row.label}</dt>
              <dd className="break-words text-white/80">{row.value || "空"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-3">
        {turns.length === 0 ? (
          <div className="grid gap-2">
            <p className="text-[12px] text-white/45">用一句话改这一节点。</p>
            <div className="flex flex-wrap gap-1.5">
              {CHAT_EXAMPLES[node.type].map((example) => (
                <button
                  key={example}
                  type="button"
                  className="rounded-full border border-white/10 px-2.5 py-1 text-left text-[11px] text-white/70 hover:border-[#dff25a]/60 hover:text-white"
                  onClick={() => void send(example)}
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
        {busy ? (
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
          void send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={2}
          aria-label="告诉这一节点要改什么"
          placeholder="例如：把主标题改得更具体"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] outline-none placeholder:text-white/30 focus:border-[#dff25a]"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
        />
        <button
          type="submit"
          className="grid size-10 place-items-center rounded-xl bg-[#dff25a] text-[#1a1c08] disabled:opacity-50"
          aria-label="发送"
          disabled={busy || draft.trim().length === 0}
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
