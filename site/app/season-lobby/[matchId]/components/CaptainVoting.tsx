"use client";

import { useState, type ReactNode } from "react";
import { FiCheck, FiClock, FiUsers } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import type {
  SeasonLobbyCaptainBallot,
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomPlayer,
  SeasonLobbyRoomSnapshot,
} from "../model/types";
import { CaptainStageTimer } from "./CaptainStageTimer";
import { CaptainVoterStatus } from "./CaptainVoterStatus";

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

function ConfirmationPrompt({
  question,
  isSending,
  onConfirm,
  onCancel,
}: {
  question: ReactNode;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="season-room-vote-confirmation" role="group">
      <p>{question}</p>
      <span>После подтверждения изменить ответ нельзя.</span>
      <div>
        <button type="button" disabled={isSending} onClick={onConfirm}>
          Да
        </button>
        <button type="button" disabled={isSending} onClick={onCancel}>
          Нет
        </button>
      </div>
    </div>
  );
}

function useCandidateConfirmation(
  action: "VOTE_CAPTAIN" | "VOTE_CAPTAIN_TIEBREAK",
  send: CaptainVotingProps["send"],
) {
  const [pendingCandidate, setPendingCandidate] = useState<
    SeasonLobbyRoomPlayer | null
  >(null);
  const [submittedCandidateId, setSubmittedCandidateId] = useState<string | null>(
    null,
  );
  async function confirmCandidate() {
    if (!pendingCandidate) return;
    const candidateId = pendingCandidate.playerId;
    if (await send({ action, candidatePlayerId: candidateId })) {
      setSubmittedCandidateId(candidateId);
      setPendingCandidate(null);
    }
  }
  return {
    pendingCandidate,
    submittedCandidateId,
    setPendingCandidate,
    confirmCandidate,
  };
}

function CandidateCard({
  candidate,
  ballots,
  players,
  isSelected,
  canSelect,
  isSending,
  showVoters = false,
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
  const [pendingInterest, setPendingInterest] = useState<boolean | null>(null);
  const [submittedInterest, setSubmittedInterest] = useState<boolean | null>(null);
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const fixedInterest = snapshot.ownCaptainInterest ?? submittedInterest;
  const answerCount = team.filter(
    (player) => player.hasAnsweredCaptainInterest,
  ).length;
  async function confirmInterest() {
    if (pendingInterest === null) return;
    const answer = pendingInterest;
    if (await send({
      action: "ANSWER_CAPTAIN_INTEREST",
      wantsCaptain: answer,
    })) {
      setSubmittedInterest(answer);
      setPendingInterest(null);
    }
  }
  return (
    <section className="season-room-voting">
      <VotingHeader
        snapshot={snapshot}
        stage="Этап 1 из 3"
        title="Вы хотите быть капитаном?"
        description="Не ответившие до конца таймера автоматически выбирают «Нет»."
      />
      {pendingInterest === null ? (
        <div className="season-room-interest-actions">
          <button
            className={fixedInterest === true ? "selected yes" : ""}
            type="button"
            disabled={isSending || fixedInterest !== null}
            onClick={() => setPendingInterest(true)}
          >
            Да, хочу
          </button>
          <button
            className={fixedInterest === false ? "selected no" : ""}
            type="button"
            disabled={isSending || fixedInterest !== null}
            onClick={() => setPendingInterest(false)}
          >
            Нет
          </button>
        </div>
      ) : (
        <ConfirmationPrompt
          question={<>Вы уверены, что хотите ответить <strong>
            {pendingInterest ? "«Да, хочу»" : "«Нет»"}
          </strong>?</>}
          isSending={isSending}
          onConfirm={() => void confirmInterest()}
          onCancel={() => setPendingInterest(null)}
        />
      )}
      <CaptainVoterStatus
        players={team}
        hasResponded={(player) => player.hasAnsweredCaptainInterest}
      />
      <footer>
        <span>Ответили: {answerCount}/{team.length}</span>
        {fixedInterest !== null && (
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
  const confirmation = useCandidateConfirmation("VOTE_CAPTAIN", send);
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const candidates = team.filter(
    (player) => snapshot.captainCandidateIds.includes(player.playerId),
  );
  const captain = team.find((player) => player.isCaptain);
  const fixedCandidateId = snapshot.ownVoteCandidateId ??
    confirmation.submittedCandidateId;
  const canVote = snapshot.ownCaptainInterest === false &&
    candidates.length > 1 && !captain && fixedCandidateId === null;
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
      {captain ? (
        <div className="season-room-captain-resolved">
          <strong>{captain.nickname} выбран капитаном</strong>
          <span>Ожидаем завершения выбора в другой команде.</span>
        </div>
      ) : confirmation.pendingCandidate ? (
        <ConfirmationPrompt
          question={<>Выбрать <strong>
            {confirmation.pendingCandidate.nickname}
          </strong> капитаном?</>}
          isSending={isSending}
          onConfirm={() => void confirmation.confirmCandidate()}
          onCancel={() => confirmation.setPendingCandidate(null)}
        />
      ) : candidates.length > 1 ? (
        <div className="season-room-candidate-grid">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.playerId}
              candidate={candidate}
              ballots={snapshot.captainBallots}
              players={team}
              isSelected={fixedCandidateId === candidate.playerId}
              canSelect={canVote}
              isSending={isSending}
              onSelect={() => confirmation.setPendingCandidate(candidate)}
            />
          ))}
        </div>
      ) : (
        <div className="season-room-captain-resolved">
          <strong>Капитан команды уже определён</strong>
          <span>Ожидаем завершения выбора в другой команде.</span>
        </div>
      )}
      <CaptainVoterStatus
        players={team}
        hasResponded={(player) => player.hasVoted}
      />
      <footer>
        <span>Проголосовали: {snapshot.teamVoteCount}/{team.length}</span>
        {fixedCandidateId && snapshot.ownCaptainInterest === false && (
          <strong><FiCheck aria-hidden="true" /> Ваш голос зафиксирован</strong>
        )}
        {snapshot.ownCaptainInterest === true && candidates.length > 1 && (
          <strong>Ваш голос учтён автоматически</strong>
        )}
      </footer>
    </section>
  );
}

function CaptainVoteReveal({ snapshot }: CaptainVotingProps) {
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const candidates = team.filter(
    (player) => snapshot.captainCandidateIds.includes(player.playerId),
  );
  const captain = team.find((player) => player.isCaptain);
  const tiebreak = snapshot.captainTiebreak;
  const decisiveVoter = team.find((player) =>
    player.playerId === tiebreak?.voterPlayerId);
  const decisiveCandidate = team.find((player) =>
    player.playerId === tiebreak?.selectedCandidateId);
  const hasVotes = team.some((player) => player.hasVoted);
  return (
    <section className="season-room-voting">
      <VotingHeader
        snapshot={snapshot}
        stage="Итоги голосования"
        title={captain
          ? `${captain.nickname} выбран капитаном`
          : "Результаты выбора капитана"}
        description={snapshot.captainRevealNextStatus === "captain_tiebreak"
          ? "Через 10 секунд начнётся дополнительный раунд."
          : "Через 10 секунд начнётся Fearless Draft."}
      />
      {candidates.length > 0 ? (
        <div className="season-room-candidate-grid reveal">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.playerId}
              candidate={candidate}
              ballots={snapshot.captainBallots}
              players={team}
              isSelected={candidate.playerId === captain?.playerId}
              canSelect={false}
              isSending={false}
              showVoters
              onSelect={() => undefined}
            />
          ))}
        </div>
      ) : (
        <div className="season-room-captain-resolved">
          <strong>{captain?.nickname ?? "Капитан"} выбран капитаном</strong>
          <span>Кандидат определён по правилам этапа.</span>
        </div>
      )}
      {decisiveVoter && decisiveCandidate && (
        <p className="season-room-decisive-vote">
          Решающий голос: {decisiveVoter.nickname} выбрал {decisiveCandidate.nickname}.
        </p>
      )}
      <CaptainVoterStatus
        players={team}
        hasResponded={(player) => hasVotes
          ? player.hasVoted
          : player.hasAnsweredCaptainInterest}
      />
    </section>
  );
}

function CaptainTiebreak({
  snapshot,
  isSending,
  send,
}: CaptainVotingProps) {
  const confirmation = useCandidateConfirmation("VOTE_CAPTAIN_TIEBREAK", send);
  const team = snapshot.players.filter(
    (player) => player.teamSide === snapshot.currentUserTeamSide,
  );
  const tiebreak = snapshot.captainTiebreak;
  const candidates = team.filter(
    (player) => tiebreak?.candidatePlayerIds.includes(player.playerId),
  );
  const captain = team.find((player) => player.isCaptain);
  const fixedCandidateId = tiebreak?.selectedCandidateId ??
    confirmation.submittedCandidateId;
  const canVote = tiebreak?.voterPlayerId === snapshot.currentUserId &&
    fixedCandidateId === null && !captain;
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
      {captain ? (
        <div className="season-room-captain-resolved">
          <strong>{captain.nickname} выбран капитаном</strong>
          <span>Ожидаем завершения выбора в другой команде.</span>
        </div>
      ) : confirmation.pendingCandidate ? (
        <ConfirmationPrompt
          question={<>Выбрать <strong>
            {confirmation.pendingCandidate.nickname}
          </strong> капитаном?</>}
          isSending={isSending}
          onConfirm={() => void confirmation.confirmCandidate()}
          onCancel={() => confirmation.setPendingCandidate(null)}
        />
      ) : tiebreak ? (
        <div className="season-room-candidate-grid tiebreak">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.playerId}
              candidate={candidate}
              ballots={[]}
              players={team}
              isSelected={fixedCandidateId === candidate.playerId}
              canSelect={canVote}
              isSending={isSending}
              showVoters={false}
              onSelect={() => confirmation.setPendingCandidate(candidate)}
            />
          ))}
        </div>
      ) : (
        <div className="season-room-captain-resolved">
          <strong>Капитан вашей команды определён</strong>
          <span>Ожидаем решающий голос в другой команде.</span>
        </div>
      )}
      <CaptainVoterStatus
        players={team}
        hasResponded={(player) => player.playerId === tiebreak?.voterPlayerId
          ? tiebreak.hasResponded
          : player.hasVoted}
      />
    </section>
  );
}

type CaptainVotingProps = {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
};

export function CaptainVoting(props: CaptainVotingProps) {
  if (props.snapshot.status === "captain_reveal") {
    return <CaptainVoteReveal {...props} />;
  }
  if (props.snapshot.status === "captain_interest") {
    return <CaptainInterest {...props} />;
  }
  if (props.snapshot.status === "captain_voting") {
    const hasOwnCaptain = props.snapshot.players.some(
      (player) => player.teamSide === props.snapshot.currentUserTeamSide &&
        player.isCaptain,
    );
    if (props.snapshot.captainTiebreak && !hasOwnCaptain) {
      return <CaptainTiebreak {...props} />;
    }
    return <CaptainChoice {...props} />;
  }
  if (props.snapshot.status === "captain_tiebreak") {
    return <CaptainTiebreak {...props} />;
  }
  return null;
}
