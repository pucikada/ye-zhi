export function removalIds(changes: Array<{ type: string; id?: string }>) {
  return changes.flatMap((change) => (change.type === "remove" && change.id ? [change.id] : []));
}

export function settleSelection(
  current: string | null,
  reported: string[],
  source: "click" | "clear" | "echo",
): string | null {
  if (source === "echo") return current;
  if (source === "clear" || reported.length === 0) return null;
  return reported[reported.length - 1] ?? current;
}
