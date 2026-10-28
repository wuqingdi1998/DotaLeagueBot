import { fetchSiteRequest } from "@/lib/site-request";
import { CUP_CONSTRUCTOR_ENDPOINT, type CupBoard, type CupSnapshot } from "../model/cup-board";

export class CupSaveError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function fetchCupConstructor(): Promise<CupSnapshot> {
  const response = await fetchSiteRequest(CUP_CONSTRUCTOR_ENDPOINT, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить конструктор");
  return result;
}

export async function persistCupBoard(board: CupBoard, revision: number): Promise<number> {
  const response = await fetchSiteRequest(CUP_CONSTRUCTOR_ENDPOINT, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board, revision }),
  });
  const result = await response.json();
  if (!response.ok) throw new CupSaveError(result.error ?? "Не удалось сохранить расстановку", response.status);
  return result.revision;
}
