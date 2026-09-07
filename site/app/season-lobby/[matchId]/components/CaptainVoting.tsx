"use client";

import { FiCheck, FiClock, FiUsers } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import type {
  SeasonLobbyCaptainBallot,
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomPlayer,
  SeasonLobbyRoomSnapshot,
} from "../model/types";
import { CaptainStageTimer } from "./CaptainStageTimer";

function PlayerAvatar({
  player,
  className,
}: {
  player: SeasonLobbyRoomPlayer;
  className: string;
}) {
  return (
    <AvatarImage
      className={className}
      source={player.avatarUrl}
      alt=""
      width={48}
      height={48}
      fallback={<i className={className}>{player.nickname.slice(0, 1)}</i>}
    />
  );
}

function VotingHeader({
  snapshot,
  stage,
  title,
  description,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  stage: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <FiUsers aria-hidden="true" />
      <div className="season-room-voting-heading">
        <span>{stage}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="season-room-voting-timer">
        <FiClock aria-hidden="true" />
        <CaptainStageTimer
          deadlineAt={snapshot.captainStageDeadlineAt}
          serverNow={snapshot.serverNow}
        />
      </div>
    </header>
  );
}

function CandidateCard({
  candidate,
  ballots,
  players,
  isSelected,
  canSelect,
  isSending,
  showVoters = true,
  onSelect,
}: {
  candidate: SeasonLobbyRoomPlayer;
  ballots: SeasonLobbyCaptainBallot[];
  players: SeasonLobbyRoomPlayer[];
  isSelected: boolean;
  canSelect: boolean;
  isSending: boolean;
  showVoters?: boolean;
  onSelect: () => void;
}) {
  const voters = ballots.flatMap((ballot) => {
    if (ballot.candidatePlayerId !== candidate.playerId) return [];
    const voter = players.find((player) => player.playerId === ballot.voterPlayerId);
    return voter ? [voter] : [];
  });
  return (
    <button
      className={`season-room-candidate-card${isSelected ? " selected" : ""}`}
      type="button"
      disabled={!canSelect || isSending}
      onClick={onSelect}
    >
      <div className="season-room-candidate-name">
        <PlayerAvatar player={candidate} className="season-room-candidate-avatar" />
        <span>
          <strong>{candidate.nickname}</strong>
          <small>Тир {candidate.tier ?? "–"}</small>
        </span>
        {isSelected && <FiCheck aria-label="Ваш голос" />}
      </div>
      {showVoters && (
        <div className="season-room-candidate-voters">
          {voters.length > 0 ? voters.map((voter) => (
            <span title={`${voter.nickname} проголосовал здесь`} key={voter.playerId}>
              <PlayerAvatar player={voter} className="season-room-voter-avatar" />
            </span>
          )) : <small>Пока нет голосов</small>}
        </div>
      )}
    </button>
  );
}

function CaptainInterest({
  snapshot,
  isSending,
  send,
}: CaptainVotingProps) {
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const answerCount = team.filter(
    (player) => player.hasAnsweredCaptainInterest,
  ).length;
  return (
    <section className="season-room-voting">
      <VotingHeader
        snapshot={snapshot}
        stage="Этап 1 из 3"
        title="Вы хотите быть капитаном?"
        description="Не ответившие до конца таймера автоматически выбирают «Нет»."
      />
      <div className="season-room-interest-actions">
        <button
          className={snapshot.ownCaptainInterest === true ? "selected yes" : ""}
          type="button"
          disabled={isSending}
          onClick={() => void send({
            action: "ANSWER_CAPTAIN_INTEREST",
            wantsCaptain: true,
          })}
        >
          Да, хочу
        </button>
        <button
          className={snapshot.ownCaptainInterest === false ? "selected no" : ""}
          type="button"
          disabled={isSending}
          onClick={() => void send({
            action: "ANSWER_CAPTAIN_INTEREST",
            wantsCaptain: false,
          })}
        >
          Нет
        </button>
      </div>
      <footer>
        <span>Ответили: {answerCount}/{team.length}</span>
        {snapshot.ownCaptainInterest !== null && (
          <strong><FiCheck aria-hidden="true" /> Ответ сохранён</strong>
        )}
      </footer>
    </section>
  );
}

function CaptainChoice({
  snapshot,
  isSending,
  send,
}: CaptainVotingProps) {
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const candidates = team.filter(
    (player) => snapshot.captainCandidateIds.includes(player.playerId),
  );
  const canVote = snapshot.ownCaptainInterest === false && candidates.length > 1;
  const eligibleVoters = team.filter((player) => player.wantsCaptain === false);
  const externalVoteCount = snapshot.captainBallots.filter(
    (ballot) => !ballot.isAutomatic,
  ).length;
  const captain = team.find((player) => player.isCaptain);
  return (
    <section className="season-room-voting">
      <VotingHeader
        snapshot={snapshot}
        stage="Этап 2 из 3"
        title="Выберите капитана"
        description={canVote
          ? "Нажмите на одного из игроков, которые хотят стать капитаном."
          : "Кандидаты не голосуют на этом этапе: их голос уже отдан за себя."}
      />
      {candidates.length > 1 ? (
        <div className="season-room-candidate-grid">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.playerId}
              candidate={candidate}
              ballots={snapshot.captainBallots}
              players={team}
              isSelected={snapshot.ownVoteCandidateId === candidate.playerId}
              canSelect={canVote}
              isSending={isSending}
              onSelect={() => void send({
                action: "VOTE_CAPTAIN",
                candidatePlayerId: candidate.playerId,
              })}
            />
          ))}
        </div>
      ) : (
        <div className="season-room-captain-resolved">
          <strong>{captain?.nickname ?? "Капитан команды уже определён"}</strong>
          <span>Ожидаем завершения выбора в другой команде.</span>
        </div>
      )}
      <footer>
        <span>Проголосовали: {externalVoteCount}/{eligibleVoters.length}</span>
        {!canVote && candidates.length > 1 && <strong>Ваш голос учтён автоматически</strong>}
      </footer>
    </section>
  );
}

function CaptainTiebreak({
  snapshot,
  isSending,
  send,
}: CaptainVotingProps) {
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const tiebreak = snapshot.captainTiebreak;
  const candidates = team.filter(
    (player) => tiebreak?.candidatePlayerIds.includes(player.playerId),
  );
  const canVote = tiebreak?.voterPlayerId === snapshot.currentUserId;
  return (
    <section className="season-room-voting">
      <VotingHeader
        snapshot={snapshot}
        stage="Этап 3 из 3"
        title="Решающий голос"
        description={canVote
          ? "Вы не получили внешний голос. Выберите капитана из двух лидеров."
          : "В вашей команде возникла особая ничья. Ожидаем решающий голос."}
      />
      {tiebreak ? (
        <div className="season-room-candidate-grid tiebreak">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.playerId}
              candidate={candidate}
              ballots={[]}
              players={team}
              isSelected={tiebreak.selectedCandidateId === candidate.playerId}
              canSelect={canVote}
              isSending={isSending}
              showVoters={false}
              onSelect={() => void send({
                action: "VOTE_CAPTAIN_TIEBREAK",
                candidatePlayerId: candidate.playerId,
              })}
            />
          ))}
        </div>
      ) : (
        <div className="season-room-captain-resolved">
          <strong>Капитан вашей команды определён</strong>
          <span>Ожидаем решающий голос в другой команде.</span>
        </div>
      )}
    </section>
  );
}

type CaptainVotingProps = {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
};

export function CaptainVoting(props: CaptainVotingProps) {
  if (props.snapshot.status === "captain_interest") {
    return <CaptainInterest {...props} />;
  }
  if (props.snapshot.status === "captain_voting") {
    return <CaptainChoice {...props} />;
  }
  if (props.snapshot.status === "captain_tiebreak") {
    return <CaptainTiebreak {...props} />;
  }
  return null;
}
