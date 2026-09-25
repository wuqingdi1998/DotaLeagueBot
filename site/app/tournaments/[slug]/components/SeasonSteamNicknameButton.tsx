"use client";

import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";

export function SeasonSteamNicknameButton({
  profileUrls,
}: {
  profileUrls: string[];
}) {
  const [hasBlockedTabs, setHasBlockedTabs] = useState(false);

  function openSteamProfiles() {
    let openedTabCount = 0;

    for (const profileUrl of profileUrls) {
      const openedTab = window.open(profileUrl, "_blank");
      if (!openedTab) continue;
      openedTab.opener = null;
      openedTabCount += 1;
    }

    setHasBlockedTabs(openedTabCount < profileUrls.length);
  }

  return (
    <>
      <button
        className="season-steam-nickname-button"
        onClick={openSteamProfiles}
        type="button"
      >
        <FiExternalLink aria-hidden="true" /> Проверить Steam-никнеймы
      </button>
      {hasBlockedTabs && (
        <p className="season-steam-popup-warning" role="alert">
          Браузер заблокировал часть вкладок. Разрешите всплывающие окна для
          этого сайта и нажмите кнопку снова.
        </p>
      )}
    </>
  );
}
