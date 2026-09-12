import { MatchRoomChat } from "@/app/components/MatchRoomChat";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

export function LobbyChat({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  return (
    <MatchRoomChat
      currentUserId={snapshot.currentUserId}
      messages={snapshot.messages}
      isSending={isSending}
      sendMessage={(message) => send({ action: "SEND_MESSAGE", message })}
    />
  );
}
