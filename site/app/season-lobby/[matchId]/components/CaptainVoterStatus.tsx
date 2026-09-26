import { AvatarImage } from "@/app/components/AvatarImage";
import type { SeasonLobbyRoomPlayer } from "../model/types";

export function CaptainVoterStatus({
  players,
  hasResponded,
}: {
  players: SeasonLobbyRoomPlayer[];
  hasResponded: (player: SeasonLobbyRoomPlayer) => boolean;
}) {
  return (
    <div className="season-room-voter-status" aria-label="Статус голосования игроков">
      {players.map((player) => {
        const isReady = hasResponded(player);
        return (
          <div className={isReady ? "ready" : "pending"} key={player.playerId}>
            <span className="season-room-voter-status-avatar">
              <AvatarImage
                source={player.avatarUrl}
                alt=""
                width={38}
                height={38}
                fallback={<i>{player.nickname.slice(0, 1)}</i>}
              />
              <b aria-label={isReady ? "Ответ получен" : "Ожидается ответ"} />
            </span>
            <strong title={player.nickname}>{player.nickname}</strong>
          </div>
        );
      })}
    </div>
  );
}
