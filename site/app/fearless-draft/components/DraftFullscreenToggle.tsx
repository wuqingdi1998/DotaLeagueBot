import { FiGlobe, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { useDraftLocale } from "../hooks/useDraftLocale";

export function DraftFullscreenToggle({
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
}: {
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => Promise<void>;
}) {
  const { locale, toggleLocale, text } = useDraftLocale();

  return (
    <div className="fearless-display-toggles">
      {isFullscreenSupported && (
        <button
          className="fearless-fullscreen-toggle"
          type="button"
          role="switch"
          aria-checked={isFullscreen}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
          <span aria-hidden="true"><i /></span>
          <em>{text.fullscreen}</em>
        </button>
      )}
      <button
        className="fearless-language-toggle"
        type="button"
        role="switch"
        aria-label={text.language}
        aria-checked={locale === "en"}
        onClick={toggleLocale}
      >
        <FiGlobe />
        <span aria-hidden="true"><i /></span>
        <em>
          <b className={locale === "ru" ? "active" : ""}>RU</b>
          /
          <b className={locale === "en" ? "active" : ""}>ENG</b>
        </em>
      </button>
    </div>
  );
}
