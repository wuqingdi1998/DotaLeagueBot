"use client";

import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { FiMove } from "react-icons/fi";
import type { CropState, CropTarget } from "./crop-model";
import { desktopOutput } from "./crop-model";

export function CropPanel({
  label,
  description,
  target,
  canvasRef,
  output,
  crop,
  imageReady,
  dragging,
  onZoom,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  label: string;
  description: string;
  target: CropTarget;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  output: typeof desktopOutput;
  crop: CropState;
  imageReady: boolean;
  dragging: boolean;
  onZoom: (value: number) => void;
  onPointerDown: (
    target: CropTarget,
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => void;
  onPointerMove: (
    target: CropTarget,
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
}) {
  return (
    <section className={`profile-background-crop-panel ${target}`}>
      <div className="profile-background-crop-panel-heading">
        <div>
          <strong>{label}</strong>
          <span>{description}</span>
        </div>
        <FiMove aria-hidden="true" />
      </div>
      <div className={`profile-background-crop-frame ${target}`}>
        <canvas
          ref={canvasRef}
          className={dragging ? "is-dragging" : undefined}
          width={output.width}
          height={output.height}
          onPointerDown={(event) => onPointerDown(target, event)}
          onPointerMove={(event) => onPointerMove(target, event)}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        />
        {!imageReady && <span>Подготавливаем изображение…</span>}
      </div>
      <label className="profile-background-zoom">
        <span>Масштаб</span>
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={crop.zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
        />
      </label>
      <small>Увеличьте и перетащите изображение внутри рамки.</small>
    </section>
  );
}
