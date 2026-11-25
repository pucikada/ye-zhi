"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import { useCanvasUi } from "@/components/demo/canvas-ui";
import { useDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";

type FlowData = { hot?: boolean; itemName?: string; lane?: number };

export function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const flow = (data ?? {}) as FlowData;
  const selectedId = useDemo((state) => state.selectedNodeId);
  const hoverId = useCanvasUi((state) => state.hoverNodeId);
  const focus = hoverId || selectedId;
  const related = !focus || source === focus || target === focus;
  const dim = Boolean(focus) && !related;
  const hot = Boolean(flow.hot) && !dim;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
    offset: 16 + (flow.lane ?? 0) * 18,
  });
  const labelLeft = sourceX + (labelX - sourceX) * 0.38;
  const labelTop = sourceY + (labelY - sourceY) * 0.38;

  return (
    <>
      <path d={path} className={cn("flow-edge-glow", hot && "is-hot", (selected || (related && focus)) && "is-selected", dim && "is-dim", flow.itemName && "is-item")} />
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={20}
        className={cn("flow-edge-line", hot && "is-hot", selected && "is-selected", dim && "is-dim", flow.itemName && "is-item")}
      />
      <path d={path} className={cn("flow-edge-dash", hot && "is-hot", dim && "is-dim")} />
      {flow.itemName && !dim ? (
        <EdgeLabelRenderer>
          <div
            className="flow-edge-label nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelLeft}px, ${labelTop}px)` }}
          >
            {flow.itemName}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
