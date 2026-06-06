// ────────────────────────────────────────────────────────────────────────────
// src/canvas/edges/TypedEdge.tsx
// Edge with color based on data type, animated style, and a delete button
// that appears when the edge is selected.
// ────────────────────────────────────────────────────────────────────────────

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { NODE_HANDLES, HANDLE_COLORS } from "../types";

/** Build a handleId → hex color lookup from the shared registry. */
function buildHandleColorMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const handles of Object.values(NODE_HANDLES)) {
    for (const h of handles) {
      if (h.direction === "source") {
        map[h.id] = HANDLE_COLORS[h.dataType]?.hex ?? "#64748b";
      }
    }
  }
  return map;
}

const SOURCE_HANDLE_COLORS = buildHandleColorMap();

function TypedEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  selected,
  style,
  markerEnd,
}: EdgeProps) {


  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const color = SOURCE_HANDLE_COLORS[sourceHandleId ?? ""] ?? "#64748b";

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: color,
        strokeWidth: selected ? 2.5 : 1.5,
      }}
    />
  );
}

export const TypedEdge = memo(TypedEdgeInner);