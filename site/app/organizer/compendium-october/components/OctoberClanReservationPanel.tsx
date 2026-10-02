"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheck, FiClock, FiLock } from "react-icons/fi";
import { fetchSiteRequest } from "@/lib/site-request";
import { OCTOBER_CLANS, type OctoberClanId } from "../model/clans";
import type { OctoberClanReservationState } from "../model/clan-reservation";

export function OctoberClanReservationPanel({
  initialState,
}: {
  initialState: OctoberClanReservationState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function reserve(clanId: OctoberClanId) {
    if (!state.canReserve || isSaving) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetchSiteRequest(
        "/api/compendium/october/clan-reservation",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clanId }),
        },
      );
      const result = await response.json() as {
        error?: string;
        reservation?: OctoberClanReservationState;
      };
      if (!response.ok || !result.reservation) {
        throw new Error(result.error ?? "Не удалось забронировать место");
      }
      setState(result.reservation);
      setMessage("Место забронировано. До 4 октября 23:50 клан можно изменить.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось забронировать место");
    } finally {
      setIsSaving(false);
    }
  }

  if (state.phase === "formation") {
    return (
      <div className="october-clan-reservation is-formation" role="status">
        <FiClock aria-hidden="true" />
        <div><strong>Бронирование закрыто</strong><span>Формируем сбалансированные составы. Они появятся в 00:00 по московскому времени.</span></div>
      </div>
    );
  }
  return (
    <div className="october-clan-reservation">
      <div className="october-clan-reservation-copy">
        <strong>Ранний выбор клана до 4 октября 23:50 МСК</strong>
        <span>
          Забронировать место могут владельцы Рун Регенерации, Ускорения,
          Невидимости, Волшебства, Иллюзий и Усиления урона, а также владельцы
          уровня «Суппортеры». Руна Воды не участвует.
        </span>
        {state.accessRoleName && <small>Ваша подписка: {state.accessRoleName}</small>}
      </div>
      {!state.isAuthenticated ? (
        <Link className="october-clan-reservation-login" href="/login?returnTo=%2Fcompendium">
          Войти и выбрать клан
        </Link>
      ) : state.canReserve ? (
        <div className="october-clan-reservation-actions">
          {OCTOBER_CLANS.map((clan) => {
            const isSelected = state.selectedClanId === clan.id;
            return (
              <button
                key={clan.id}
                type="button"
                disabled={isSaving || isSelected}
                className={isSelected ? "is-selected" : ""}
                onClick={() => void reserve(clan.id)}
              >
                {isSelected && <FiCheck aria-hidden="true" />}
                {isSelected ? `Место в «${clan.name}» забронировано` : `Выбрать «${clan.name}»`}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="october-clan-reservation-unavailable">
          <FiLock aria-hidden="true" /> У вас нет подходящего уровня подписки
        </div>
      )}
      {message && <p className="october-clan-reservation-message" role="status">{message}</p>}
    </div>
  );
}
