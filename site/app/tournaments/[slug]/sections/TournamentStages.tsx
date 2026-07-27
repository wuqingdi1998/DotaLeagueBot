"use client";

import { groupOutcome, groupOutcomeLabel } from "@/lib/group-advancement";
import { tournamentCompetitionStages } from "@/lib/tournament-stages";
import { GroupShuffleToolbar } from "../admin/GroupShuffleToolbar";
import { GroupSettingsEditor } from "../admin/GroupSettingsEditor";
import { useTournament } from "../hooks/TournamentContext";
import { initials } from "../model/formatters";
import { TournamentBracket } from "../TournamentBracket";

export function GroupsPanel() {
  const {
    activeTab,
    adminMode,
    data,
    loadData,
    setToast,
    standingGroups,
  } = useTournament();
  if (!data || activeTab !== "groups") return null;

  return (
    <div className="tab-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Групповой этап</p>
          <h3>Турнирное положение</h3>
        </div>
        <span className="timezone">
          Место определяется по выигранным картам
        </span>
      </div>
      {adminMode && <GroupShuffleToolbar />}
      <div className="standings-groups">
        {standingGroups.map(({ group, rows }) => (
          <section className="standing-group" key={group.id}>
            <h4>{group.name}</h4>
            <div className="standings">
              <div className="standing-row standing-head">
                <span>#</span>
                <span>Команда</span>
                <span>Матчи</span>
                <span>Карты</span>
                <span>Итог</span>
              </div>
              {rows.map((row) => {
                const outcome = groupOutcome(
                  row.place,
                  group,
                  data.tournament.playoff_type,
                );
                const eliminated = outcome === "eliminated";
                return (
                  <div
                    className={`standing-row${
                      eliminated ? " eliminated" : " advanced"
                    }`}
                    key={row.id}
                  >
                    <span className="place">{row.place}</span>
                    <span className="standing-team">
                      <i>{initials(row.team_name)}</i>
                      <strong>{row.team_name}</strong>
                    </span>
                    <span>{row.games}</span>
                    <strong>{row.maps_won}</strong>
                    <span
                      className={`standing-outcome${
                        eliminated ? " eliminated" : ""
                      }`}
                    >
                      {groupOutcomeLabel(outcome)}
                    </span>
                  </div>
                );
              })}
            </div>
            {group.explanation && (
              <p className="group-explanation">{group.explanation}</p>
            )}
            {adminMode && (
              <GroupSettingsEditor
                key={`${group.id}:${group.team_capacity}:${group.advance_to_playoff}:${group.advance_to_upper}:${group.advance_to_lower}:${group.explanation}`}
                group={group}
                playoffType={data.tournament.playoff_type}
                onSaved={loadData}
                onMessage={setToast}
              />
            )}
          </section>
        ))}
        {!standingGroups.length && (
          <div className="empty-standings">Группы ещё не сформированы</div>
        )}
      </div>
    </div>
  );
}

export function PlayoffsPanel() {
  const { activeTab, adminMode, data } = useTournament();
  if (!data || activeTab !== "playoffs") return null;

  const hasPlayoffStage = tournamentCompetitionStages(
    data.tournament,
  ).some((stage) => stage.key === "playoffs");
  const matches = data.matches.filter(
    (match) =>
      match.bracket_side !== null && match.bracket_side !== "group",
  );

  return (
    <div className="tab-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">
            {hasPlayoffStage ? "Плей-офф" : "Гранд-финал"}
          </p>
          <h3>{hasPlayoffStage ? "Турнирная сетка" : "Финальный матч"}</h3>
        </div>
        <span className="timezone">
          Наведите на команду, чтобы увидеть её путь
        </span>
      </div>
      <TournamentBracket
        key={matches
          .map(
            (match) =>
              `${match.id}:${match.bracket_round}:${match.bracket_slot}:${match.bracket_grid_column}:${match.bracket_grid_row}:${match.eliminated_team_application_id}`,
          )
          .join("|")}
        matches={matches}
        editable={adminMode}
        tournamentId={data.tournament.id}
        emptyMessage={
          hasPlayoffStage
            ? "Матчи плей-офф ещё не добавлены в сетку"
            : "Матч гранд-финала ещё не добавлен"
        }
      />
    </div>
  );
}

export function RulesPanel() {
  const { activeTab, data } = useTournament();
  if (!data || activeTab !== "rules") return null;

  return (
    <div className="tab-panel rules-panel">
      <div className="panel-heading">
        <div>
          <p className="card-kicker">Документы турнира</p>
          <h3>Дополнительные правила</h3>
        </div>
        <span className="timezone">{data.rules.length} пунктов</span>
      </div>
      <ol className="tournament-rules-list">
        {data.rules.map((rule) => (
          <li key={rule.id}>{rule.rule_text}</li>
        ))}
      </ol>
      {!data.rules.length && (
        <div className="empty-standings">
          Дополнительные правила для этого турнира не указаны
        </div>
      )}
    </div>
  );
}
