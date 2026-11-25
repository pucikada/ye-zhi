"use client";

import { create } from "zustand";

type CanvasUi = {
  hoverNodeId: string | null;
  previewNodeId: string | null;
  setHover: (id: string | null) => void;
  openPreview: (id: string) => void;
  closePreview: () => void;
};

export const useCanvasUi = create<CanvasUi>((set, get) => ({
  hoverNodeId: null,
  previewNodeId: null,
  setHover: (id) => {
    if (get().hoverNodeId === id) return;
    set({ hoverNodeId: id });
  },
  openPreview: (id) => set({ previewNodeId: id }),
  closePreview: () => set({ previewNodeId: null }),
}));
