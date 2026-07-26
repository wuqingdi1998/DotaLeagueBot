"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FiImage,
  FiRotateCcw,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

const outputWidth = 1400;
const outputHeight = 400;
const maximumSourceSize = 10 * 1024 * 1024;

export function ProfileBackgroundPicker({
  dotaId,
  hasCustomBackground,
}: {
  dotaId: string;
  hasCustomBackground: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
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
    const canvas = canvasRef.current;
    const sourceImage = sourceImageRef.current;
    if (!canvas || !sourceImage || !imageReady) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const targetRatio = outputWidth / outputHeight;
    const sourceRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
    const baseCropWidth =
      sourceRatio > targetRatio
        ? sourceImage.naturalHeight * targetRatio
        : sourceImage.naturalWidth;
    const baseCropHeight =
      sourceRatio > targetRatio
        ? sourceImage.naturalHeight
        : sourceImage.naturalWidth / targetRatio;
    const cropWidth = baseCropWidth / zoom;
    const cropHeight = baseCropHeight / zoom;
    const sourceX =
      (sourceImage.naturalWidth - cropWidth) * (horizontal / 100);
    const sourceY =
      (sourceImage.naturalHeight - cropHeight) * (vertical / 100);

    context.clearRect(0, 0, outputWidth, outputHeight);
    context.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }, [horizontal, imageReady, vertical, zoom]);

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

  function closeEditor() {
    if (saving) return;
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
    setZoom(1);
    setHorizontal(50);
    setVertical(50);
    setImageReady(false);
    setError("");
    setImageUrl(URL.createObjectURL(file));
  }

  async function saveCustomBackground() {
    const canvas = canvasRef.current;
    if (!canvas || !imageReady || saving) return;
    setSaving(true);
    setError("");
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob) {
      setSaving(false);
      setError("Не удалось подготовить изображение");
      return;
    }
    const formData = new FormData();
    formData.set(
      "background",
      new File([blob], "profile-background.jpg", {
        type: "image/jpeg",
      }),
    );
    const response = await fetch(`/api/players/${dotaId}/background`, {
      method: "PUT",
      body: formData,
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Не удалось сохранить фон");
      return;
    }
    closeEditor();
    router.refresh();
  }

  async function restoreStandardBackground() {
    if (saving) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/players/${dotaId}/background`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Не удалось вернуть стандартный фон");
      return;
    }
    router.refresh();
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
      {!imageUrl && error && <p className="profile-background-error">{error}</p>}

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
                <h2 id="profile-background-crop-title">Настройте фон профиля</h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Закрыть редактор"
                disabled={saving}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>
            <p>
              Область внутри рамки будет видна за именем и статистикой игрока.
            </p>
            <div className="profile-background-crop-frame">
              <canvas
                ref={canvasRef}
                width={outputWidth}
                height={outputHeight}
              />
              {!imageReady && <span>Подготавливаем изображение…</span>}
            </div>
            <div className="profile-background-crop-controls">
              <label>
                <span>Масштаб</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
              <label>
                <span>По горизонтали</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={horizontal}
                  onChange={(event) =>
                    setHorizontal(Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>По вертикали</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vertical}
                  onChange={(event) =>
                    setVertical(Number(event.target.value))
                  }
                />
              </label>
            </div>
            {error && <p className="profile-background-error">{error}</p>}
            <div className="profile-background-crop-actions">
              <button
                className="secondary-button compact"
                type="button"
                onClick={closeEditor}
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
