"use client";

import { bracketGridSize } from "@/lib/bracket-layout";
import type {
  BracketEdge,
  DrawnBracketEdge,
} from "./bracket-model";

export function BracketBoardDecorations({
  edges,
  isActive,
  roundLabels,
}: {
  edges: DrawnBracketEdge[];
  isActive: (edge: BracketEdge) => boolean;
  roundLabels: Array<{
    round: number;
    column: number;
    title: string;
  }>;
}) {
  return (
    <>
      <svg className="bracket-connectors" aria-hidden="true">
        <defs>
          <marker
            id="bracket-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" />
          </marker>
        </defs>
        {edges.map((edge) => (
          <path
            className={`${edge.outcome}${isActive(edge) ? " active" : ""}`}
            d={edge.path}
            key={edge.key}
            markerEnd="url(#bracket-arrow)"
          />
        ))}
      </svg>

      {roundLabels.map((round) => (
        <h4
          className="bracket-round-label"
          key={round.round}
          style={{ left: round.column * bracketGridSize }}
        >
          {round.title}
        </h4>
      ))}
    </>
  );
}
