"use client";

import { Fragment } from "react";
import { tournamentTimeline } from "@/lib/tournament-timeline";
import { useTournament } from "../hooks/TournamentContext";
import {
  formatMatchCount,
  formatScheduleDate,
  formatTimelineMoment,
} from "../model/formatters";

export function OverviewPanel() {
  const { activeTab, data } = useTournament();
  if (!data || activeTab !== "overview") return null;

  const timeline = tournamentTimeline({
    registrationDeadline: data.tournament.registration_deadline,
    startAt: data.tournament.start_at,
    checkInMinutes: data.tournament.check_in_minutes,
  });

  return (
    <div className="overview-grid tab-panel">
      <article className="content-card about-card">
        <p className="card-kicker">О турнире</p>
        <h3>{data.tournament.headline}</h3>
        {data.tournament.headline_accent && (
          <p className="about-tournament-dates">
            {data.tournament.headline_accent}
          </p>
        )}
        <p>{data.tournament.about}</p>
        <div className="stage-flow">
          {timeline.map((stage, index) => (
            <Fragment key={stage.key}>
              {index > 0 && <i />}
              <div>
                <span>{index + 1}</span>
                <strong>{stage.label}</strong>
                <small>{formatTimelineMoment(stage.at)}</small>
              </div>
            </Fragment>
          ))}
        </div>
      </article>
      <aside className="details-card tournament-schedule-card">
        <div className="tournament-schedule-heading">
          <span>По московскому времени</span>
          <strong>Расписание турнира</strong>
        </div>
        {data.scheduleDays.map((day, dayIndex) => (
          <section className="tournament-schedule-day" key={day.id}>
            <header>
              <strong>{day.title || `День ${dayIndex + 1}`}</strong>
              <span>{formatScheduleDate(day.day_date)}</span>
            </header>
            <div className="tournament-schedule-entries">
              {day.entries.map((entry) => (
                <div key={entry.id}>
                  <time>{entry.start_time}</time>
                  <span>
                    <strong>{entry.stage_name}</strong>
                    <small>
                      {formatMatchCount(entry.match_count)} ·{" "}
                      {entry.series_format}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!data.scheduleDays.length && (
          <p className="tournament-schedule-empty">
            Расписание будет опубликовано организатором.
          </p>
        )}
      </aside>
      {data.prizes.length > 0 && (
        <article className="content-card tournament-prizes">
          <div className="prize-heading">
            <p className="card-kicker">Призовые места</p>
            <h3>Итоги и награды</h3>
          </div>
          <div
            className={
              data.prizes.length === 4
                ? "prize-list prize-list-four"
                : "prize-list"
            }
          >
            {data.prizes.map((prize) => (
              <div key={prize.id}>
                <strong>{prize.placement}</strong>
                <span>
                  {prize.team_name && <b>{prize.team_name}</b>}
                  {prize.prize_text && <small>{prize.prize_text}</small>}
                </span>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
