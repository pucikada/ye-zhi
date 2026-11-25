"use client";

import { create } from "zustand";

type CanvasUi = {
  hoverNodeId: string | null;
  previewNodeId: string | null;
  selectedIds: string[];
  setHover: (id: string | null) => void;
  openPreview: (id: string) => void;
  closePreview: () => void;
  setSelection: (ids: string[]) => void;
};

export const useCanvasUi = create<CanvasUi>((set, get) => ({
  hoverNodeId: null,
  previewNodeId: null,
  selectedIds: [],
  setHover: (id) => {
    if (get().hoverNodeId === id) return;
    set({ hoverNodeId: id });
  },
  openPreview: (id) => set({ previewNodeId: id }),
  closePreview: () => set({ previewNodeId: null }),
  setSelection: (ids) => {
    const current = get().selectedIds;
    if (current.length === ids.length && current.every((id, index) => id === ids[index])) return;
    set({ selectedIds: ids });
  },
}));
