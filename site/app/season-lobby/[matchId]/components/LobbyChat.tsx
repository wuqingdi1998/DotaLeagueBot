"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { compactDiscordAvatarUrl } from "@/lib/avatar-url";
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
        <strong>Чат лобби</strong>
      </header>
      <div className="season-room-messages" ref={messageListRef}>
        {!snapshot.messages.length && (
          <p>Сообщений пока нет. Поздоровайтесь с участниками.</p>
        )}
        {snapshot.messages.map((item, index) => {
          const previousMessage = snapshot.messages[index - 1];
          const isContinuation =
            previousMessage?.playerId === item.playerId;
          const isOwnMessage = item.playerId === snapshot.currentUserId;
          return (
            <article
              className={`${isOwnMessage ? "own" : ""} ${
                isContinuation ? "continuation" : ""
              }`.trim()}
              key={item.id}
            >
              <span className="season-room-message-avatar">
                {item.avatarUrl ? (
                  <Image
                    src={compactDiscordAvatarUrl(item.avatarUrl)}
                    width={26}
                    height={26}
                    alt=""
                  />
                ) : (
                  <i>{item.nickname.slice(0, 1).toUpperCase()}</i>
                )}
              </span>
              <div className="season-room-message-body">
                {!isContinuation && <strong>{item.nickname}</strong>}
                <p>{item.message}</p>
              </div>
            </article>
          );
        })}
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
