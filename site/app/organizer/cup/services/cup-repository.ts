import { one } from "@/lib/db";
import { createCupBoard, cupBoardPlayerIds, parseCupBoard, type CupSnapshot } from "../model/cup-board";
import { loadCupRoster } from "./cup-roster";

export async function loadCupConstructor(): Promise<CupSnapshot> {
  const [roster, saved] = await Promise.all([
    loadCupRoster(),
    one<{ board: unknown; revision: number }>("SELECT board, revision FROM cup_constructor_boards WHERE id = 1"),
  ]);
  const board = saved ? parseCupBoard(saved.board) : createCupBoard(roster.players);
  if (!board) throw new Error("Invalid saved cup constructor board");
  return { ...roster, board, revision: saved?.revision ?? 0 };
}

export async function saveCupConstructor(value: unknown, revision: unknown) {
  const board = parseCupBoard(value);
  if (!board || !Number.isSafeInteger(revision) || Number(revision) < 0 || Number(revision) >= 2147483647) {
    throw new Response("Некорректная расстановка игроков", { status: 400 });
  }
  // Known archived players remain editable in an already saved board.
  const previous = await one<{ board: unknown }>("SELECT board FROM cup_constructor_boards WHERE id = 1");
  const oldBoard = previous ? parseCupBoard(previous.board) : null;
  const roster = await loadCupRoster();
  const knownIds = new Set([...roster.players.map((player) => player.id), ...(oldBoard ? cupBoardPlayerIds(oldBoard) : [])]);
  if (cupBoardPlayerIds(board).some((id) => !knownIds.has(id))) {
    throw new Response("Игрок не найден. Обновите список участников", { status: 400 });
  }
  const saved = revision === 0
    ? await one<{ revision: number }>(
      `INSERT INTO cup_constructor_boards (id, board) VALUES (1, $1::jsonb)
       ON CONFLICT (id) DO NOTHING RETURNING revision`, [JSON.stringify(board)],
    )
    : await one<{ revision: number }>(
      `UPDATE cup_constructor_boards SET board = $1::jsonb, revision = revision + 1, updated_at = NOW()
       WHERE id = 1 AND revision = $2 RETURNING revision`, [JSON.stringify(board), revision],
    );
  if (!saved) throw new Response("Расстановка изменена в другой вкладке. Загрузите сохранённую версию перед продолжением", { status: 409 });
  return saved;
}
