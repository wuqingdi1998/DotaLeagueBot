import { FiCheck } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import { PlayerRoleBadge } from "@/app/components/PlayerRoleBadge";
import { SubscriptionRuneNickname } from "@/app/components/SubscriptionRuneNickname";
import type { SeasonLobbyCaptainBallot, SeasonLobbyRoomPlayer } from "../model/types";

function PlayerAvatar({ player, className }: {
  player: SeasonLobbyRoomPlayer;
  className: string;
}) {
  return (
    <AvatarImage className={className} source={player.avatarUrl} alt="" width={48} height={48}
      fallback={<i className={className}>{player.nickname.slice(0, 1)}</i>} />
  );
}

export function CaptainCandidateCard({
  candidate, ballots, players, isSelected, canSelect, isSending, showVoters = false, onSelect,
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
    <button className={`season-room-candidate-card${isSelected ? " selected" : ""}`}
      type="button" disabled={!canSelect || isSending} onClick={onSelect}>
      <div className="season-room-candidate-name">
        <PlayerAvatar player={candidate} className="season-room-candidate-avatar" />
        <span>
          <strong><SubscriptionRuneNickname nickname={candidate.nickname}
            subscriptionRole={candidate.subscriptionRole} /></strong>
          <small>Тир {candidate.tier ?? "–"}<PlayerRoleBadge positions={candidate.positions} /></small>
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
