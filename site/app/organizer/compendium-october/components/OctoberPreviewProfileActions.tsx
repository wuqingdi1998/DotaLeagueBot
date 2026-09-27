"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiArchive, FiDatabase } from "react-icons/fi";
import {
  OCTOBER_PREVIEW_MAXIMUM_STARS,
  OCTOBER_PREVIEW_STARS_PARAM,
} from "../model/preview-settings";

export function OctoberPreviewProfileActions({
  isMaximumStarsEnabled,
}: {
  isMaximumStarsEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function setMaximumStars(isEnabled: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (isEnabled) {
      nextParams.set(OCTOBER_PREVIEW_STARS_PARAM, String(OCTOBER_PREVIEW_MAXIMUM_STARS));
    } else {
      nextParams.delete(OCTOBER_PREVIEW_STARS_PARAM);
    }
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <>
      <Link className="profile-popover-link" href="/organizer">
        Архив организатора <FiArchive aria-hidden="true" />
      </Link>
      <Link className="profile-popover-link" href="/organizer/compendium-october/base">
        База компендиума <FiDatabase aria-hidden="true" />
      </Link>
      <label className="participant-view-toggle">
        <input
          type="checkbox"
          checked={isMaximumStarsEnabled}
          onChange={(event) => setMaximumStars(event.target.checked)}
        />
        <span>
          <strong>Показать 100 звёзд</strong>
          <small>Проверить максимальный личный зачёт</small>
        </span>
      </label>
    </>
  );
}
