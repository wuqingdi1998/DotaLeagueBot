"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import { compactDiscordAvatarUrl } from "@/lib/avatar-url";

export type MatchRoomChatMessage = {
  id: number;
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  message: string;
};

const basicEmoji = ["😀", "😂", "👍", "❤️", "🔥", "🎮"];

export function MatchRoomChat({
  currentUserId,
  messages,
  isSending,
  sendMessage,
}: {
  currentUserId: string;
  messages: MatchRoomChatMessage[];
  isSending: boolean;
  sendMessage: (message: string) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const outgoing = message.trim();
    if (!outgoing || isSending) return;
    if (await sendMessage(outgoing)) setMessage("");
  }

  return (
    <section className="season-room-chat">
      <header>
        <FiMessageCircle aria-hidden="true" />
        <strong>Чат лобби</strong>
      </header>
      <div className="season-room-messages" ref={messageListRef}>
        {!messages.length && <p>Сообщений пока нет. Поздоровайтесь с участниками.</p>}
        {messages.map((item, index) => {
          const previousMessage = messages[index - 1];
          const isContinuation = previousMessage?.playerId === item.playerId;
          const isOwnMessage = item.playerId === currentUserId;
          return (
            <article
              className={`${isOwnMessage ? "own" : ""} ${isContinuation ? "continuation" : ""}`.trim()}
              key={item.id}
            >
              <span className="season-room-message-avatar">
                <AvatarImage
                  source={item.avatarUrl ? compactDiscordAvatarUrl(item.avatarUrl) : null}
                  width={26}
                  height={26}
                  alt=""
                  fallback={<i>{item.nickname.slice(0, 1).toUpperCase()}</i>}
                />
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
          <button type="button" key={emoji} onClick={() => setMessage((value) => `${value}${emoji}`)}>
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
