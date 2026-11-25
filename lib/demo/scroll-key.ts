import type { KeyboardEvent } from "react";

export function onScrollKey(event: KeyboardEvent<HTMLElement>) {
  if (event.target !== event.currentTarget) return;
  const el = event.currentTarget;
  const page = Math.round(el.clientHeight * 0.85);
  const delta =
    event.key === "ArrowDown" ? 48
    : event.key === "ArrowUp" ? -48
    : event.key === "PageDown" ? page
    : event.key === "PageUp" ? -page
    : event.key === "End" ? el.scrollHeight
    : event.key === "Home" ? -el.scrollHeight
    : 0;
  if (!delta) return;
  event.preventDefault();
  el.scrollBy({ top: delta });
}

export function onChipKey(event: KeyboardEvent<HTMLElement>) {
  if (event.target !== event.currentTarget) return;
  const delta = event.key === "ArrowRight" ? 96 : event.key === "ArrowLeft" ? -96 : 0;
  if (!delta) return;
  event.preventDefault();
  event.currentTarget.scrollBy({ left: delta });
}
