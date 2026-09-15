"use client";

import { useEffect, useRef } from "react";
import { draftCountdownCueId } from "../model/countdown-sound";

const DRAFT_COUNTDOWN_FREQUENCY_HZ = 880;
const DRAFT_COUNTDOWN_DURATION_SECONDS = 0.09;
const DRAFT_COUNTDOWN_VOLUME = 0.18;

type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function createAudioContext(): AudioContext | null {
  const AudioContextConstructor = window.AudioContext
    ?? (window as BrowserWindow).webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : null;
}

function playCountdownBeep(audioContext: AudioContext): void {
  if (audioContext.state !== "running") return;

  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  const startsAt = audioContext.currentTime;
  const endsAt = startsAt + DRAFT_COUNTDOWN_DURATION_SECONDS;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(DRAFT_COUNTDOWN_FREQUENCY_HZ, startsAt);
  volume.gain.setValueAtTime(DRAFT_COUNTDOWN_VOLUME, startsAt);
  volume.gain.exponentialRampToValueAtTime(0.001, endsAt);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start(startsAt);
  oscillator.stop(endsAt);
}

export function useDraftCountdownSound(
  mapId: number,
  currentStep: number,
  isCountdownWarning: boolean,
): void {
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedCuesRef = useRef(new Set<string>());
  const cueId = draftCountdownCueId(
    mapId,
    currentStep,
    isCountdownWarning,
  );

  useEffect(() => {
    const enableSound = () => {
      const audioContext = audioContextRef.current ?? createAudioContext();
      audioContextRef.current = audioContext;
      if (audioContext?.state === "suspended") {
        void audioContext.resume().catch(() => undefined);
      }
    };

    window.addEventListener("pointerdown", enableSound);
    window.addEventListener("keydown", enableSound);
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
      const audioContext = audioContextRef.current;
      audioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, []);

  useEffect(() => {
    if (cueId === null) return;

    if (playedCuesRef.current.has(cueId)) return;
    playedCuesRef.current.add(cueId);

    const audioContext = audioContextRef.current ?? createAudioContext();
    audioContextRef.current = audioContext;
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      void audioContext.resume()
        .then(() => playCountdownBeep(audioContext))
        .catch(() => undefined);
      return;
    }
    playCountdownBeep(audioContext);
  }, [cueId]);
}
