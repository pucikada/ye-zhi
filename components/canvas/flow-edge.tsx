"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
  });
  const hot = Boolean(data && typeof data === "object" && "hot" in data && data.hot);

  return (
    <>
      <path d={path} className={cn("flow-edge-glow", hot && "is-hot", selected && "is-selected")} />
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={22}
        className={cn("flow-edge-line", hot && "is-hot", selected && "is-selected")}
      />
      <path d={path} className={cn("flow-edge-dash", hot && "is-hot")} />
      <circle r={hot ? 3.4 : 2.8} className={cn("flow-edge-particle", hot && "is-hot")}>
        <animateMotion dur={hot ? "0.9s" : "2.2s"} repeatCount="indefinite" path={path} />
      </circle>
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };
