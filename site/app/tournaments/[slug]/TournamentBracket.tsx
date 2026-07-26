"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiMove, FiRefreshCw } from "react-icons/fi";
import {
  automaticBracketLayout,
  bracketGridSize,
  resolvedBracketLayout,
  type BracketGridPosition,
} from "@/lib/bracket-layout";
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
  bracket_grid_column: number | null;
  bracket_grid_row: number | null;
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

type DragState = {
  matchId: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: BracketGridPosition;
};

const cardWidth = 280;
const boardHeaderHeight = 62;
const boardSafetyHeight = 260;
const boardHorizontalPadding = 64;

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(100, value));
}

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

export function TournamentBracket({
  matches,
  editable = false,
  tournamentId,
}: {
  matches: BracketMatch[];
  editable?: boolean;
  tournamentId: number;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const dragRef = useRef<DragState | null>(null);
  const [positions, setPositions] = useState(() =>
    resolvedBracketLayout(matches),
  );
  const [drawnEdges, setDrawnEdges] = useState<DrawnEdge[]>([]);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [draggingMatchId, setDraggingMatchId] = useState<number | null>(null);
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);
  const [layoutMessage, setLayoutMessage] = useState("");

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

  const automaticPositions = useMemo(
    () => automaticBracketLayout(matches),
    [matches],
  );

  const roundLabels = useMemo(
    () =>
      rounds.map(([round, roundMatches]) => ({
        round,
        title: roundTitle(round, roundMatches),
        column: automaticPositions[roundMatches[0].id]?.column ?? 0,
      })),
    [automaticPositions, rounds],
  );

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

  const boardDimensions = useMemo(() => {
    const placed = Object.values(positions);
    const lastColumn = Math.max(0, ...placed.map((position) => position.column));
    const lastRow = Math.max(0, ...placed.map((position) => position.row));
    return {
      width: Math.max(
        920,
        lastColumn * bracketGridSize + cardWidth + boardHorizontalPadding,
      ),
      height: Math.max(
        500,
        boardHeaderHeight +
          lastRow * bracketGridSize +
          boardSafetyHeight,
      ),
    };
  }, [positions]);

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
      const bend = Math.max(42, Math.abs(endX - startX) * 0.48);
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

  useLayoutEffect(() => {
    updateEdges();
  }, [positions, updateEdges]);

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

  function positionFromPointer(
    drag: DragState,
    clientX: number,
    clientY: number,
  ) {
    return {
      column: clampCoordinate(
        drag.origin.column +
          Math.round((clientX - drag.startClientX) / bracketGridSize),
      ),
      row: clampCoordinate(
        drag.origin.row +
          Math.round((clientY - drag.startClientY) / bracketGridSize),
      ),
    };
  }

  async function persistPosition(
    matchId: number,
    position: BracketGridPosition,
  ) {
    setSavingMatchId(matchId);
    setLayoutMessage("");
    try {
      const response = await fetch("/api/admin/bracket-layout", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId,
          gridColumn: position.column,
          gridRow: position.row,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLayoutMessage(result.error ?? "Не удалось сохранить позицию");
        return false;
      }
      setLayoutMessage("Позиция сохранена");
      return true;
    } catch {
      setLayoutMessage("Не удалось связаться с сервером");
      return false;
    } finally {
      setSavingMatchId(null);
    }
  }

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    matchId: number,
  ) {
    if (!editable) return;
    const origin = positions[matchId];
    if (!origin) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      matchId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin,
    };
    setDraggingMatchId(matchId);
    setLayoutMessage("Перемещаем по клеткам…");
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = positionFromPointer(drag, event.clientX, event.clientY);
    setPositions((current) => ({ ...current, [drag.matchId]: next }));
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = positionFromPointer(drag, event.clientX, event.clientY);
    dragRef.current = null;
    setDraggingMatchId(null);
    setPositions((current) => ({ ...current, [drag.matchId]: next }));
    if (
      next.column === drag.origin.column &&
      next.row === drag.origin.row
    ) {
      setLayoutMessage("");
      return;
    }
    void persistPosition(drag.matchId, next).then((saved) => {
      if (!saved) {
        setPositions((current) => ({
          ...current,
          [drag.matchId]: drag.origin,
        }));
      }
    });
  }

  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDraggingMatchId(null);
    setPositions((current) => ({
      ...current,
      [drag.matchId]: drag.origin,
    }));
    setLayoutMessage("");
  }

  function moveWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    matchId: number,
  ) {
    const delta = {
      ArrowLeft: { column: -1, row: 0 },
      ArrowRight: { column: 1, row: 0 },
      ArrowUp: { column: 0, row: -1 },
      ArrowDown: { column: 0, row: 1 },
    }[event.key];
    if (!delta) return;
    const origin = positions[matchId];
    if (!origin) return;
    event.preventDefault();
    const next = {
      column: clampCoordinate(origin.column + delta.column),
      row: clampCoordinate(origin.row + delta.row),
    };
    setPositions((current) => ({ ...current, [matchId]: next }));
    void persistPosition(matchId, next).then((saved) => {
      if (!saved) {
        setPositions((current) => ({ ...current, [matchId]: origin }));
      }
    });
  }

  async function resetLayout() {
    if (
      !window.confirm(
        "Вернуть всем матчам автоматическую расстановку по раундам?",
      )
    ) {
      return;
    }
    setLayoutMessage("Возвращаем автоматическую расстановку…");
    try {
      const response = await fetch("/api/admin/bracket-layout", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournamentId, reset: true }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setLayoutMessage(result.error ?? "Не удалось сбросить расстановку");
        return;
      }
      setPositions(automaticBracketLayout(matches));
      setLayoutMessage("Автоматическая расстановка восстановлена");
    } catch {
      setLayoutMessage("Не удалось связаться с сервером");
    }
  }

  if (!rounds.length) {
    return (
      <div className="empty-standings">
        Матчи плей-офф ещё не добавлены в сетку
      </div>
    );
  }

  return (
    <>
      {editable && (
        <div className="bracket-layout-toolbar">
          <div>
            <strong>Ручная расстановка</strong>
            <span>
              Тяните карточку за значок перемещения. Она прилипнет к ближайшей
              клетке, а новая позиция сохранится автоматически.
            </span>
          </div>
          <button type="button" onClick={() => void resetLayout()}>
            <FiRefreshCw aria-hidden="true" />
            Вернуть авторасстановку
          </button>
          {layoutMessage && (
            <small aria-live="polite">{layoutMessage}</small>
          )}
        </div>
      )}

      <div className="bracket-scroll">
        <div
          className={`playoff-bracket-board${
            hoveredTeam ? " has-hover" : ""
          }${editable ? " editable" : ""}`}
          ref={boardRef}
          onMouseLeave={() => setHoveredTeam(null)}
          style={{
            width: boardDimensions.width,
            height: boardDimensions.height,
          }}
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
                className={`${edge.outcome}${
                  edgeIsActive(edge) ? " active" : ""
                }`}
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

          {rounds.flatMap(([, roundMatches]) =>
            roundMatches.map((match) => {
              const keys = matchTeamKeys(match);
              const highlighted =
                hoveredTeam !== null && keys.includes(hoveredTeam);
              const position = positions[match.id] ?? { column: 0, row: 0 };
              const dragging = draggingMatchId === match.id;
              return (
                <article
                  className={`bracket-match-card${
                    highlighted ? " highlighted" : ""
                  }${dragging ? " dragging" : ""}${
                    savingMatchId === match.id ? " saving" : ""
                  }`}
                  key={match.id}
                  ref={(element) => {
                    if (element) cardRefs.current.set(match.id, element);
                    else cardRefs.current.delete(match.id);
                  }}
                  style={{
                    left: position.column * bracketGridSize,
                    top:
                      boardHeaderHeight + position.row * bracketGridSize,
                  }}
                >
                  <div className="bracket-card-header">
                    <small>
                      {{
                        upper: "Верхняя сетка",
                        lower: "Нижняя сетка",
                        grand_final: "Гранд-финал",
                        group: "Групповой этап",
                      }[match.bracket_side ?? "upper"]}{" "}
                      · BO{match.best_of}
                    </small>
                    {editable && (
                      <button
                        className="bracket-drag-handle"
                        type="button"
                        aria-label={`Переместить матч ${match.team_a} — ${match.team_b}`}
                        title="Перетащить по сетке"
                        onPointerDown={(event) =>
                          beginDrag(event, match.id)
                        }
                        onPointerMove={moveDrag}
                        onPointerUp={finishDrag}
                        onPointerCancel={cancelDrag}
                        onKeyDown={(event) =>
                          moveWithKeyboard(event, match.id)
                        }
                      >
                        <FiMove aria-hidden="true" />
                      </button>
                    )}
                  </div>
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
            }),
          )}
        </div>
      </div>
    </>
  );
}
