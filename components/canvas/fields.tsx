"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "nodrag nopan nowheel w-full rounded-md border border-white/10 bg-black/35 px-2 py-1.5 text-[12px] leading-snug text-zinc-100 outline-none placeholder:text-white/28 focus:border-[#dff25a]";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium tracking-wide text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md bg-black/35 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "nodrag nopan flex-1 rounded px-1.5 py-1 text-[11px]",
            value === option.value ? "bg-white/12 text-white" : "text-white/45 hover:text-white/75",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function stopKeys(event: KeyboardEvent) {
  event.stopPropagation();
}
