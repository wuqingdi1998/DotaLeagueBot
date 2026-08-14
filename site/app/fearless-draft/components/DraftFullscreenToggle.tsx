import { FiMaximize2, FiMinimize2 } from "react-icons/fi";

export function DraftFullscreenToggle({
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
}: {
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => Promise<void>;
}) {
  if (!isFullscreenSupported) return null;

  return (
    <button
      className="fearless-fullscreen-toggle"
      type="button"
      role="switch"
      aria-checked={isFullscreen}
      onClick={() => void toggleFullscreen()}
    >
      {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
      <span aria-hidden="true"><i /></span>
      <em>На полный экран</em>
    </button>
  );
}
