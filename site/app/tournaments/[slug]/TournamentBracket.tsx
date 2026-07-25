"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  bracketOutcomeKeys,
  bracketTeamKey,
} from "@/lib/bracket";

export type BracketMatch = {
  id: number;
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  team_a_result_label: string | null;
  team_b_result_label: string | null;
  decision_note: string | null;
  best_of: number;
  status: string;
  bracket_round: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_slot: number | null;
  winner_to_match_id: number | null;
  winner_to_slot: "a" | "b" | null;
  loser_to_match_id: number | null;
  loser_to_slot: "a" | "b" | null;
};

type Edge = {
  key: string;
  sourceId: number;
  targetId: number;
  targetSlot: "a" | "b";
  outcome: "winner" | "loser";
};

type DrawnEdge = Edge & {
  path: string;
};

function matchTeamKeys(match: BracketMatch) {
  return [
    bracketTeamKey(match.team_a_application_id, match.team_a),
    bracketTeamKey(match.team_b_application_id, match.team_b),
  ];
}

function roundTitle(round: number, matches: BracketMatch[]) {
  if (matches.some((match) => match.bracket_side === "grand_final")) {
    return "Гранд-финал";
  }
  return `Раунд ${round}`;
}

export function TournamentBracket({ matches }: { matches: BracketMatch[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const [drawnEdges, setDrawnEdges] = useState<DrawnEdge[]>([]);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  const rounds = useMemo(() => {
    const result = new Map<number, BracketMatch[]>();
    for (const match of matches) {
      if (!match.bracket_side || match.bracket_side === "group") continue;
      const round = match.bracket_round ?? 1;
      const rows = result.get(round) ?? [];
      rows.push(match);
      result.set(round, rows);
    }
    return Array.from(result.entries())
      .sort(([left], [right]) => left - right)
      .map(([round, rows]) => [
        round,
        rows.sort(
          (left, right) =>
            (left.bracket_slot ?? 0) - (right.bracket_slot ?? 0),
        ),
      ] as const);
  }, [matches]);

  const edges = useMemo(() => {
    const result: Edge[] = [];
    for (const match of matches) {
      if (match.winner_to_match_id && match.winner_to_slot) {
        result.push({
          key: `${match.id}-winner-${match.winner_to_match_id}`,
          sourceId: match.id,
          targetId: match.winner_to_match_id,
          targetSlot: match.winner_to_slot,
          outcome: "winner",
        });
      }
      if (match.loser_to_match_id && match.loser_to_slot) {
        result.push({
          key: `${match.id}-loser-${match.loser_to_match_id}`,
          sourceId: match.id,
          targetId: match.loser_to_match_id,
          targetSlot: match.loser_to_slot,
          outcome: "loser",
        });
      }
    }
    return result;
  }, [matches]);

  const updateEdges = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const next: DrawnEdge[] = [];

    for (const edge of edges) {
      const source = cardRefs.current.get(edge.sourceId);
      const target = cardRefs.current.get(edge.targetId);
      if (!source || !target) continue;
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const startX = sourceRect.right - boardRect.left;
      const startY =
        sourceRect.top -
        boardRect.top +
        sourceRect.height * (edge.outcome === "winner" ? 0.42 : 0.7);
      const endX = targetRect.left - boardRect.left;
      const endY =
        targetRect.top -
        boardRect.top +
        targetRect.height * (edge.targetSlot === "a" ? 0.42 : 0.7);
      const bend = Math.max(42, (endX - startX) * 0.48);
      next.push({
        ...edge,
        path: `M ${startX} ${startY} C ${startX + bend} ${startY}, ${
          endX - bend
        } ${endY}, ${endX} ${endY}`,
      });
    }
    setDrawnEdges(next);
  }, [edges]);

  useLayoutEffect(() => {
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    if (boardRef.current) observer.observe(boardRef.current);
    for (const card of cardRefs.current.values()) observer.observe(card);
    window.addEventListener("resize", updateEdges);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const matchById = useMemo(
    () => new Map(matches.map((match) => [match.id, match])),
    [matches],
  );

  function edgeIsActive(edge: Edge) {
    if (!hoveredTeam) return false;
    const source = matchById.get(edge.sourceId);
    if (!source) return false;
    return bracketOutcomeKeys(source)[edge.outcome] === hoveredTeam;
  }

  if (!rounds.length) {
    return (
      <div className="empty-standings">
        Матчи плей-офф ещё не добавлены в сетку
      </div>
    );
  }

  return (
    <div className="bracket-scroll">
      <div
        className={`playoff-bracket-board${hoveredTeam ? " has-hover" : ""}`}
        ref={boardRef}
        onMouseLeave={() => setHoveredTeam(null)}
      >
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
          {drawnEdges.map((edge) => (
            <path
              className={`${edge.outcome}${edgeIsActive(edge) ? " active" : ""}`}
              d={edge.path}
              key={edge.key}
              markerEnd="url(#bracket-arrow)"
            />
          ))}
        </svg>

        {rounds.map(([round, roundMatches]) => (
          <section className="bracket-column" key={round}>
            <h4>{roundTitle(round, roundMatches)}</h4>
            <div>
              {roundMatches.map((match) => {
                const keys = matchTeamKeys(match);
                const highlighted =
                  hoveredTeam !== null && keys.includes(hoveredTeam);
                return (
                  <article
                    className={`bracket-match-card${
                      highlighted ? " highlighted" : ""
                    }`}
                    key={match.id}
                    ref={(element) => {
                      if (element) cardRefs.current.set(match.id, element);
                      else cardRefs.current.delete(match.id);
                    }}
                  >
                    <small>
                      {{
                        upper: "Верхняя сетка",
                        lower: "Нижняя сетка",
                        grand_final: "Гранд-финал",
                        group: "Групповой этап",
                      }[match.bracket_side ?? "upper"]}{" "}
                      · BO{match.best_of}
                    </small>
                    {[
                      {
                        name: match.team_a,
                        key: keys[0],
                        result:
                          match.team_a_result_label ??
                          match.team_a_score ??
                          "—",
                      },
                      {
                        name: match.team_b,
                        key: keys[1],
                        result:
                          match.team_b_result_label ??
                          match.team_b_score ??
                          "—",
                      },
                    ].map((team) => (
                      <button
                        type="button"
                        className={
                          hoveredTeam === team.key ? "team-active" : ""
                        }
                        key={team.key}
                        onMouseEnter={() => setHoveredTeam(team.key)}
                        onFocus={() => setHoveredTeam(team.key)}
                        onBlur={() => setHoveredTeam(null)}
                      >
                        <strong>{team.name}</strong>
                        <b>{team.result}</b>
                      </button>
                    ))}
                    {match.decision_note && <p>{match.decision_note}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
