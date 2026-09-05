"use client";

import { logoutAndReload } from "@/lib/logout-action";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FaDiscord } from "react-icons/fa";
import { FiArrowRight, FiUploadCloud } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerAutocomplete } from "./PlayerAutocomplete";
import { RoleIcon, RoleSelect } from "./RoleField";
import { useTournament } from "../hooks/TournamentContext";

export function TournamentModals() {
  const {
    captainChoices,
    data,
    loginOpen,
    registration,
    registrationOpen,
    registrationReady,
    saving,
    setActiveTab,
    setCaptainChoices,
    setLoginOpen,
    setRegistration,
    setRegistrationOpen,
    setTeamEmblem,
    setToast,
    startDiscordLogin,
    submitRegistration,
    teamEmblem,
    teamNameError,
    toast,
    transferCaptain,
  } = useTournament();
  const [memberTiers, setMemberTiers] = useState<
    Partial<Record<"player_2" | "player_3" | "player_4" | "player_5", number | null>>
  >({});

  const registrationTierTotal = useMemo(() => {
    const tiers = [
      data?.registrationCaptainTier ?? null,
      registration.player_2.trim() ? memberTiers.player_2 ?? null : null,
      registration.player_3.trim() ? memberTiers.player_3 ?? null : null,
      registration.player_4.trim() ? memberTiers.player_4 ?? null : null,
      registration.player_5.trim() ? memberTiers.player_5 ?? null : null,
    ];
    return tiers.every((tier): tier is number => tier !== null)
      ? tiers.reduce((sum, tier) => sum + tier, 0)
      : null;
  }, [data?.registrationCaptainTier, memberTiers, registration]);

  if (!data) return null;
  const isRegistrationTierExceeded =
    data.tournament.max_team_tier !== null &&
    registrationTierTotal !== null &&
    registrationTierTotal > data.tournament.max_team_tier;

  return (
    <>
      {registrationOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setRegistrationOpen(false)}
        >
          <section
            className="modal registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Закрыть"
              onClick={() => setRegistrationOpen(false)}
            >
              ×
            </button>
            <Image
              className="modal-logo"
              src="/linkens-sphere-logo.png"
              alt=""
              width={58}
              height={58}
              unoptimized
            />
            <p className="card-kicker">{data.tournament.name}</p>
            <h2 id="registration-title">Регистрация команды</h2>
            <p className="modal-intro">
              Заполните состав. Заявка сохранится в базе, а организатор увидит
              её в своей панели.
            </p>
            {data.tournament.max_team_tier !== null && (
              <div
                className={`registration-tier-limit ${
                  isRegistrationTierExceeded ? "exceeded" : ""
                }`}
              >
                <span>Максимальный тир команды</span>
                <strong>{data.tournament.max_team_tier}</strong>
                <small>
                  {registrationTierTotal === null
                    ? "Выберите всех игроков, чтобы увидеть сумму тиров"
                    : `Сумма выбранного состава: ${registrationTierTotal} из ${data.tournament.max_team_tier}`}
                </small>
              </div>
            )}
            <form onSubmit={submitRegistration}>
              <div className="form-grid two">
                <label>
                  <span>Название команды</span>
                  <input
                    required
                    maxLength={20}
                    aria-invalid={Boolean(
                      registration.team_name && teamNameError,
                    )}
                    value={registration.team_name}
                    onChange={(event) =>
                      setRegistration({
                        ...registration,
                        team_name: event.target.value,
                      })
                    }
                    placeholder="Например, Radiant Five"
                  />
                  <small
                    className={
                      teamNameError && registration.team_name
                        ? "field-error"
                        : "field-hint"
                    }
                  >
                    {registration.team_name && teamNameError
                      ? teamNameError
                      : `${registration.team_name.length}/20 · не более 2 спецсимволов`}
                  </small>
                </label>
                <label>
                  <span>Тег</span>
                  <input
                    required
                    maxLength={5}
                    value={registration.tag}
                    onChange={(event) =>
                      setRegistration({
                        ...registration,
                        tag: event.target.value,
                      })
                    }
                    placeholder="R5"
                  />
                </label>
              </div>
              <label
                className={`emblem-upload ${teamEmblem ? "has-file" : ""}`}
              >
                <span className="emblem-upload-icon">
                  <FiUploadCloud aria-hidden="true" />
                </span>
                <span className="emblem-upload-copy">
                  <strong>Эмблема команды</strong>
                  <small>
                    {teamEmblem
                      ? teamEmblem.name
                      : "Обязательный файл · PNG, JPG или WebP · до 2 МБ"}
                  </small>
                </span>
                <input
                  required
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (
                      file &&
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setToast(
                        "Эмблема должна быть в формате PNG, JPG или WebP",
                      );
                      event.target.value = "";
                      setTeamEmblem(null);
                      return;
                    }
                    if (file && file.size > 2 * 1024 * 1024) {
                      setToast("Размер эмблемы не должен превышать 2 МБ");
                      event.target.value = "";
                      setTeamEmblem(null);
                      return;
                    }
                    setTeamEmblem(file);
                  }}
                />
                <span className="emblem-upload-action">
                  {teamEmblem ? "Заменить" : "Выбрать файл"}
                </span>
              </label>
              <div className="form-grid two">
                <label>
                  <span>Капитан</span>
                  <input
                    required
                    readOnly
                    value={registration.captain}
                    placeholder="Игровой ник из профиля"
                  />
                  <small className="player-autocomplete-tier">
                    {data.registrationCaptainTier !== null
                      ? `Тир на момент регистрации: ${data.registrationCaptainTier}`
                      : "Актуальный тир не подтверждён"}
                  </small>
                </label>
                <RoleSelect
                  value={registration.captain_role}
                  onChange={(value) =>
                    setRegistration({
                      ...registration,
                      captain_role: value,
                    })
                  }
                  label="Роль капитана"
                />
              </div>
              <label className="captain-contact">
                <span>Связь с капитаном</span>
                <input
                  required
                  value={registration.contact}
                  onChange={(event) =>
                    setRegistration({
                      ...registration,
                      contact: event.target.value,
                    })
                  }
                  placeholder="@username в Discord"
                />
              </label>
              <fieldset>
                <legend>Остальные игроки</legend>
                <p className="roles-hint">
                  Укажите по одному игроку на каждую роль. Капитан может занимать
                  любую позицию.
                </p>
                <div className="players-grid">
                  {(
                    [
                      ["player_2", "player_2_role"],
                      ["player_3", "player_3_role"],
                      ["player_4", "player_4_role"],
                      ["player_5", "player_5_role"],
                    ] as const
                  ).map(([playerField, roleField], index) => (
                    <div
                      className="player-registration-row"
                      key={playerField}
                    >
                      <RoleIcon role={registration[roleField]} />
                      <PlayerAutocomplete
                        label={`Игрок ${index + 2}`}
                        value={registration[playerField]}
                        onChange={(value) =>
                          setRegistration({
                            ...registration,
                            [playerField]: value,
                          })
                        }
                        onTierResolved={(tier) =>
                          setMemberTiers((current) =>
                            current[playerField] === tier
                              ? current
                              : { ...current, [playerField]: tier },
                          )
                        }
                      />
                      <RoleSelect
                        value={registration[roleField]}
                        onChange={(value) =>
                          setRegistration({
                            ...registration,
                            [roleField]: value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={registration.rulesAccepted}
                  onChange={(event) =>
                    setRegistration({
                      ...registration,
                      rulesAccepted: event.target.checked,
                    })
                  }
                />
                <span>Я подтверждаю состав и принимаю правила турнира</span>
              </label>
              <button
                className="primary-button submit-button"
                type="submit"
                disabled={
                  saving || !registrationReady || isRegistrationTierExceeded
                }
              >
                {saving ? "Отправляем…" : "Отправить заявку"} <FiArrowRight />
              </button>
            </form>
          </section>
        </div>
      )}

      {loginOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setLoginOpen(false)}
        >
          <section
            className="modal login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Закрыть"
              onClick={() => setLoginOpen(false)}
            >
              ×
            </button>
            <AvatarImage
              source={data.user?.avatarUrl}
              className="profile-modal-avatar"
              alt=""
              width={76}
              height={76}
              unoptimized
              fallback={
                <div className="discord-modal-icon">
                  <FaDiscord />
                </div>
              }
            />
            <h2 id="login-title">
              {data.user ? "Профиль участника" : "Вход через Discord"}
            </h2>
            <p className="modal-intro">
              {data.user
                ? "Данные профиля синхронизированы с регистрацией в боте."
                : "Сайт проверит ваш Discord-аккаунт и найдёт регистрацию в общей базе бота."}
            </p>
            {data.user ? (
              <div className="account-actions">
                <strong>{data.user.serverName}</strong>
                <span>Discord: {data.user.username}</span>
                <Link
                  className="primary-button"
                  href={`/players/${data.user.dotaId}`}
                >
                  Открыть страницу игрока <FiArrowRight />
                </Link>
                {data.user.isAdmin && (
                  <button
                    className="primary-button"
                    onClick={() => {
                      setLoginOpen(false);
                      setActiveTab("admin");
                    }}
                  >
                    Открыть панель организатора
                  </button>
                )}
                {data.applications
                  .filter((application) =>
                    application.members.some(
                      (member) =>
                        member.discord_id === data.user?.discordId &&
                        member.is_captain,
                    ),
                  )
                  .map((application) => (
                    <div className="captain-transfer" key={application.id}>
                      <span>
                        Капитан команды{" "}
                        <strong>{application.team_name}</strong>
                      </span>
                      <select
                        value={captainChoices[application.id] ?? ""}
                        onChange={(event) =>
                          setCaptainChoices({
                            ...captainChoices,
                            [application.id]: event.target.value,
                          })
                        }
                      >
                        <option value="">Выберите нового капитана</option>
                        {application.members
                          .filter(
                            (member) =>
                              !member.is_captain &&
                              member.discord_id !== null &&
                              member.invitation_status === "accepted",
                          )
                          .map((member) => (
                            <option
                              value={member.discord_id!}
                              key={member.discord_id!}
                            >
                              {member.name}
                            </option>
                          ))}
                      </select>
                      <button
                        className="secondary-button"
                        disabled={!captainChoices[application.id]}
                        onClick={() => void transferCaptain(application.id)}
                      >
                        Передать капитанство
                      </button>
                    </div>
                  ))}
                <button
                  className="secondary-button"
                  onClick={logoutAndReload}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                className="discord-login modal-discord-button"
                type="button"
                onClick={() => startDiscordLogin()}
              >
                <FaDiscord />
                Войти через Discord
              </button>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </>
  );
}
