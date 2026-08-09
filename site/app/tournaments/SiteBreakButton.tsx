"use client";

import { useEffect, useState } from "react";
import { FiCoffee } from "react-icons/fi";

type SiteBreakResponse = {
  isBreakEnabled?: boolean;
  error?: string;
};

export function SiteBreakButton() {
  const [isBreakEnabled, setIsBreakEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/site-break", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as SiteBreakResponse;
        if (!response.ok) throw new Error(result.error);
        setIsBreakEnabled(Boolean(result.isBreakEnabled));
      })
      .catch(() => setError("Не удалось узнать состояние перерыва"))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggleSiteBreak() {
    const nextIsBreakEnabled = !isBreakEnabled;
    if (
      nextIsBreakEnabled &&
      !window.confirm(
        "Включить перерыв? Все посетители потеряют доступ к сайту, пока организатор не выключит этот режим.",
      )
    ) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/site-break", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isBreakEnabled: nextIsBreakEnabled }),
      });
      const result = (await response.json()) as SiteBreakResponse;
      if (!response.ok || typeof result.isBreakEnabled !== "boolean") {
        throw new Error(result.error ?? "Не удалось изменить состояние сайта");
      }
      setIsBreakEnabled(result.isBreakEnabled);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось изменить состояние сайта",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <span className="site-break-control">
      <button
        className={`site-break-toggle${isBreakEnabled ? " active" : ""}`}
        type="button"
        disabled={isLoading}
        aria-pressed={isBreakEnabled}
        onClick={() => void toggleSiteBreak()}
      >
        <FiCoffee aria-hidden="true" />
        {isBreakEnabled ? "Перерыв · включён" : "Перерыв"}
      </button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
}
