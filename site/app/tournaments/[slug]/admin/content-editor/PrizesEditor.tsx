"use client";

import { Dispatch, SetStateAction } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { Application, PrizeDraft } from "./types";

export function PrizesEditor({
  prizes,
  setPrizes,
  applications,
  newKey,
}: {
  prizes: PrizeDraft[];
  setPrizes: Dispatch<SetStateAction<PrizeDraft[]>>;
  applications: Application[];
  newKey: (prefix: string) => string;
}) {
  const updatePrize = (key: string, patch: Partial<PrizeDraft>) => {
    setPrizes((current) =>
      current.map((prize) =>
        prize.key === key ? { ...prize, ...patch } : prize,
      ),
    );
  };

  return (
    <section className="prize-admin-section">
      <div className="content-editor-subheading">
        <div>
          <span>Призовые места</span>
          <small>{prizes.length} мест</small>
        </div>
        <button
          type="button"
          onClick={() =>
            setPrizes((current) => [
              ...current,
              {
                key: newKey("prize"),
                placement:
                  Math.max(0, ...current.map((prize) => prize.placement)) + 1,
                applicationId: null,
                teamName: "",
                prizeText: "",
              },
            ])
          }
        >
          <FiPlus aria-hidden="true" /> Добавить место
        </button>
      </div>
      <div className="prize-admin-list">
        {prizes.map((prize) => (
          <div className="prize-admin-row" key={prize.key}>
            <label>
              <span>Место</span>
              <input
                type="number"
                min="1"
                max="64"
                value={prize.placement}
                onChange={(event) =>
                  updatePrize(prize.key, {
                    placement: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>Команда</span>
              <select
                value={prize.applicationId ?? ""}
                onChange={(event) => {
                  const applicationId = Number(event.target.value);
                  const team = applications.find(
                    (application) => application.id === applicationId,
                  );
                  updatePrize(prize.key, {
                    applicationId: applicationId || null,
                    teamName: team?.team_name ?? "",
                  });
                }}
              >
                <option value="">Команда пока не определена</option>
                {applications.map((application) => (
                  <option value={application.id} key={application.id}>
                    {application.team_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="prize-reward-field">
              <span>Награда</span>
              <textarea
                rows={2}
                value={prize.prizeText}
                onChange={(event) =>
                  updatePrize(prize.key, { prizeText: event.target.value })
                }
                placeholder="Например: 4 000 ₽ или подробное описание награды"
              />
            </label>
            <button
              className="danger prize-delete-button"
              type="button"
              onClick={() =>
                setPrizes((current) =>
                  current.filter((item) => item.key !== prize.key),
                )
              }
            >
              <FiTrash2 aria-hidden="true" /> Удалить
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
