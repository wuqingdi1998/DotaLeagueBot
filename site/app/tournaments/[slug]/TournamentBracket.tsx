"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiMove } from "react-icons/fi";
import {
  automaticBracketLayout,
  bracketGridSize,
  resolvedBracketLayout,
  type BracketGridPosition,
} from "@/lib/bracket-layout";
import {
  bracketEliminatedTeamKey,
} from "@/lib/bracket";
import { BracketToolbar } from "./components/bracket/BracketToolbar";
import { BracketBoardDecorations } from "./components/bracket/BracketBoardDecorations";
import {
  bracketBoardHeaderHeight as boardHeaderHeight,
  bracketBoardHorizontalPadding as boardHorizontalPadding,
  bracketBoardSafetyHeight as boardSafetyHeight,
  bracketCardWidth as cardWidth,
  bracketRoundTitle as roundTitle,
  buildBracketEdges,
  clampBracketCoordinate as clampCoordinate,
  matchTeamKeys,
  type BracketDragState as DragState,
  type BracketEdge as Edge,
  type BracketMatch,
  type DrawnBracketEdge as DrawnEdge,
} from "./components/bracket/bracket-model";
export function TournamentBracket({
  matches,
  editable = false,
  tournamentId,
  emptyMessage = "Матчи плей-офф ещё не добавлены в сетку",
}: {
  matches: BracketMatch[];
  editable?: boolean;
  tournamentId: number;
  emptyMessage?: string;
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

  const edges = useMemo(() => buildBracketEdges(matches), [matches]);

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
      const sourceTeam = edge.sourceSlot
        ? source.querySelector<HTMLElement>(
            `[data-bracket-slot="${edge.sourceSlot}"]`,
          )
        : null;
      const targetTeam = target.querySelector<HTMLElement>(
        `[data-bracket-slot="${edge.targetSlot}"]`,
      );
      const sourceTeamRect = sourceTeam?.getBoundingClientRect();
      const targetTeamRect = targetTeam?.getBoundingClientRect();
      const startX = sourceRect.right - boardRect.left;
      const startY = sourceTeamRect
        ? sourceTeamRect.top - boardRect.top + sourceTeamRect.height / 2
        : sourceRect.top -
          boardRect.top +
          sourceRect.height * (edge.outcome === "winner" ? 0.42 : 0.7);
      const endX = targetRect.left - boardRect.left;
      const endY = targetTeamRect
        ? targetTeamRect.top - boardRect.top + targetTeamRect.height / 2
        : targetRect.top -
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
    const animationFrame = window.requestAnimationFrame(updateEdges);
    const transitionTimer = window.setTimeout(updateEdges, 180);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(transitionTimer);
    };
  }, [positions, updateEdges]);

  function edgeIsActive(edge: Edge) {
    return hoveredTeam !== null && edge.teamKey === hoveredTeam;
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
      const response = await fetchSiteRequest("/api/admin/bracket-layout", {
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
      const response = await fetchSiteRequest("/api/admin/bracket-layout", {
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
    return <div className="empty-standings">{emptyMessage}</div>;
  }

  return (
    <>
      {editable && (
        <BracketToolbar
          message={layoutMessage}
          onReset={() => void resetLayout()}
        />
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
          <BracketBoardDecorations
            edges={drawnEdges}
            isActive={edgeIsActive}
            roundLabels={roundLabels}
          />

          {rounds.flatMap(([, roundMatches]) =>
            roundMatches.map((match) => {
              const keys = matchTeamKeys(match);
              const eliminatedTeamKey = bracketEliminatedTeamKey(match);
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
                  onTransitionEnd={updateEdges}
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
                      slot: "a" as const,
                      name: match.team_a,
                      key: keys[0],
                      result:
                        match.team_a_result_label ??
                        match.team_a_score ??
                        "—",
                    },
                    {
                      slot: "b" as const,
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
                      data-bracket-slot={team.slot}
                      className={`${hoveredTeam === team.key ? "team-active" : ""}${
                        team.key === eliminatedTeamKey
                          ? " team-eliminated"
                          : ""
                      }`}
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
