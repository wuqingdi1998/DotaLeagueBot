"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  FiImage,
  FiMove,
  FiRotateCcw,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

const desktopOutput = { width: 1400, height: 400 };
const mobileOutput = { width: 720, height: 1280 };
const maximumSourceSize = 10 * 1024 * 1024;

type CropTarget = "desktop" | "mobile";
type CropState = {
  zoom: number;
  horizontal: number;
  vertical: number;
};
type DragState = {
  target: CropTarget;
  pointerId: number;
  startX: number;
  startY: number;
  horizontal: number;
  vertical: number;
};

const initialCrop: CropState = {
  zoom: 1,
  horizontal: 50,
  vertical: 50,
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function drawCrop(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement | null,
  crop: CropState,
  output: typeof desktopOutput,
) {
  if (!canvas || !image) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const targetRatio = output.width / output.height;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const baseCropWidth =
    sourceRatio > targetRatio
      ? image.naturalHeight * targetRatio
      : image.naturalWidth;
  const baseCropHeight =
    sourceRatio > targetRatio
      ? image.naturalHeight
      : image.naturalWidth / targetRatio;
  const cropWidth = baseCropWidth / crop.zoom;
  const cropHeight = baseCropHeight / crop.zoom;
  const sourceX =
    (image.naturalWidth - cropWidth) * (crop.horizontal / 100);
  const sourceY =
    (image.naturalHeight - cropHeight) * (crop.vertical / 100);

  context.clearRect(0, 0, output.width, output.height);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    output.width,
    output.height,
  );
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
}

function CropPanel({
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

export function ProfileBackgroundPicker({
  dotaId,
  hasCustomBackground,
}: {
  dotaId: string;
  hasCustomBackground: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [desktopCrop, setDesktopCrop] = useState<CropState>(initialCrop);
  const [mobileCrop, setMobileCrop] = useState<CropState>(initialCrop);
  const [dragging, setDragging] = useState<CropTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageUrl) return;
    const sourceImage = new window.Image();
    sourceImage.onload = () => {
      sourceImageRef.current = sourceImage;
      setImageReady(true);
    };
    sourceImage.onerror = () => {
      setError("Не удалось открыть изображение");
      setImageReady(false);
    };
    sourceImage.src = imageUrl;
    return () => {
      sourceImageRef.current = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!imageReady) return;
    drawCrop(
      desktopCanvasRef.current,
      sourceImageRef.current,
      desktopCrop,
      desktopOutput,
    );
  }, [desktopCrop, imageReady]);

  useEffect(() => {
    if (!imageReady) return;
    drawCrop(
      mobileCanvasRef.current,
      sourceImageRef.current,
      mobileCrop,
      mobileOutput,
    );
  }, [imageReady, mobileCrop]);

  useEffect(() => {
    if (!imageUrl) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setImageUrl("");
        setImageReady(false);
        setError("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [imageUrl, saving]);

  function closeEditor(force = false) {
    if (saving && !force) return;
    dragRef.current = null;
    setDragging(null);
    setImageUrl("");
    setImageReady(false);
    setError("");
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Выберите изображение PNG или JPG");
      return;
    }
    if (file.size > maximumSourceSize) {
      setError("Исходное изображение не должно превышать 10 МБ");
      return;
    }
    setDesktopCrop(initialCrop);
    setMobileCrop(initialCrop);
    setImageReady(false);
    setError("");
    setImageUrl(URL.createObjectURL(file));
  }

  function updateCrop(target: CropTarget, crop: CropState) {
    if (target === "desktop") {
      setDesktopCrop(crop);
    } else {
      setMobileCrop(crop);
    }
  }

  function startDragging(
    target: CropTarget,
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!imageReady) return;
    const crop = target === "desktop" ? desktopCrop : mobileCrop;
    dragRef.current = {
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: crop.horizontal,
      vertical: crop.vertical,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(target);
  }

  function moveImage(
    target: CropTarget,
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    const drag = dragRef.current;
    if (
      !drag ||
      drag.target !== target ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const crop = target === "desktop" ? desktopCrop : mobileCrop;
    updateCrop(target, {
      ...crop,
      horizontal: clamp(
        drag.horizontal -
          ((event.clientX - drag.startX) / Math.max(bounds.width, 1)) * 100,
      ),
      vertical: clamp(
        drag.vertical -
          ((event.clientY - drag.startY) / Math.max(bounds.height, 1)) * 100,
      ),
    });
  }

  function stopDragging(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(null);
  }

  async function saveCustomBackground() {
    const desktopCanvas = desktopCanvasRef.current;
    const mobileCanvas = mobileCanvasRef.current;
    if (
      !desktopCanvas ||
      !mobileCanvas ||
      !imageReady ||
      saving
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const [desktopBlob, mobileBlob] = await Promise.all([
        canvasBlob(desktopCanvas),
        canvasBlob(mobileCanvas),
      ]);
      if (!desktopBlob || !mobileBlob) {
        setError("Не удалось подготовить изображение");
        return;
      }
      const formData = new FormData();
      formData.set(
        "desktopBackground",
        new File([desktopBlob], "profile-background-desktop.jpg", {
          type: "image/jpeg",
        }),
      );
      formData.set(
        "mobileBackground",
        new File([mobileBlob], "profile-background-mobile.jpg", {
          type: "image/jpeg",
        }),
      );
      const response = await fetch(`/api/players/${dotaId}/background`, {
        method: "PUT",
        body: formData,
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Не удалось сохранить фон");
        return;
      }
      closeEditor(true);
      router.refresh();
    } catch {
      setError(
        "Сервер не ответил. Попробуйте сохранить фон ещё раз",
      );
    } finally {
      setSaving(false);
    }
  }

  async function restoreStandardBackground() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/players/${dotaId}/background`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Не удалось вернуть стандартный фон");
        return;
      }
      router.refresh();
    } catch {
      setError("Сервер не ответил. Попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-background-control">
      <input
        ref={fileInputRef}
        className="profile-background-file"
        type="file"
        accept="image/png,image/jpeg"
        onChange={selectFile}
      />
      <button
        className="profile-background-button"
        type="button"
        disabled={saving}
        onClick={() =>
          hasCustomBackground
            ? void restoreStandardBackground()
            : fileInputRef.current?.click()
        }
      >
        {hasCustomBackground ? (
          <FiRotateCcw aria-hidden="true" />
        ) : (
          <FiImage aria-hidden="true" />
        )}
        {hasCustomBackground
          ? "Вернуть стандартный фон"
          : "Изменить фон"}
      </button>
      {!imageUrl && error && (
        <p className="profile-background-error">{error}</p>
      )}

      {imageUrl && (
        <div
          className="profile-background-crop-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-background-crop-title"
        >
          <div className="profile-background-crop-modal">
            <header>
              <div>
                <span>Редактор изображения</span>
                <h2 id="profile-background-crop-title">
                  Настройте фон профиля
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeEditor()}
                aria-label="Закрыть редактор"
                disabled={saving}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>
            <p>
              Подготовьте отдельные кадры для компьютера и телефона. Видимую
              область можно увеличивать и двигать прямо внутри рамки.
            </p>
            <div className="profile-background-crop-workspace">
              <CropPanel
                label="Компьютер"
                description="Широкий фон"
                target="desktop"
                canvasRef={desktopCanvasRef}
                output={desktopOutput}
                crop={desktopCrop}
                imageReady={imageReady}
                dragging={dragging === "desktop"}
                onZoom={(zoom) =>
                  setDesktopCrop((current) => ({ ...current, zoom }))
                }
                onPointerDown={startDragging}
                onPointerMove={moveImage}
                onPointerEnd={stopDragging}
              />
              <CropPanel
                label="Телефон"
                description="Вертикальный фон"
                target="mobile"
                canvasRef={mobileCanvasRef}
                output={mobileOutput}
                crop={mobileCrop}
                imageReady={imageReady}
                dragging={dragging === "mobile"}
                onZoom={(zoom) =>
                  setMobileCrop((current) => ({ ...current, zoom }))
                }
                onPointerDown={startDragging}
                onPointerMove={moveImage}
                onPointerEnd={stopDragging}
              />
            </div>
            {error && (
              <p className="profile-background-error">{error}</p>
            )}
            <div className="profile-background-crop-actions">
              <button
                className="secondary-button compact"
                type="button"
                onClick={() => closeEditor()}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                className="primary-button compact"
                type="button"
                onClick={() => void saveCustomBackground()}
                disabled={saving || !imageReady}
              >
                <FiUploadCloud aria-hidden="true" />
                {saving ? "Сохраняем…" : "Установить фон"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
