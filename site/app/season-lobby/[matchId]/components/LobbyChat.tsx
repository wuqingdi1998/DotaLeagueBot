"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

const basicEmoji = ["😀", "😂", "👍", "❤️", "🔥", "🎮"];

export function LobbyChat({
  snapshot,
  isSending,
  send,
}: {
  snapshot: SeasonLobbyRoomSnapshot;
  isSending: boolean;
  send: (command: SeasonLobbyRoomCommand) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [snapshot.messages.length]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const outgoing = message.trim();
    if (!outgoing || isSending) return;
    if (await send({ action: "SEND_MESSAGE", message: outgoing })) {
      setMessage("");
    }
  }

  return (
    <section className="season-room-chat">
      <header>
        <FiMessageCircle aria-hidden="true" />
        <div>
          <span>Чат лобби</span>
          <strong>Только для этих 10 игроков</strong>
        </div>
      </header>
      <div className="season-room-messages" ref={messageListRef}>
        {!snapshot.messages.length && (
          <p>Сообщений пока нет. Поздоровайтесь с участниками.</p>
        )}
        {snapshot.messages.map((item) => (
          <article
            className={item.playerId === snapshot.currentUserId ? "own" : ""}
            key={item.id}
          >
            <strong>{item.nickname}</strong>
            <p>{item.message}</p>
          </article>
        ))}
      </div>
      <div className="season-room-emoji" aria-label="Смайлики">
        {basicEmoji.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => setMessage((current) => `${current}${emoji}`)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form onSubmit={(event) => void submitMessage(event)}>
        <input
          aria-label="Сообщение в чат лобби"
          maxLength={500}
          placeholder="Напишите сообщение…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button type="submit" disabled={isSending || !message.trim()}>
          <FiSend aria-hidden="true" />
          <span>Отправить</span>
        </button>
      </form>
    </section>
  );
}
