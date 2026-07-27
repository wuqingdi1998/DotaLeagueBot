export const desktopOutput = { width: 1400, height: 400 };
export const mobileOutput = { width: 720, height: 1280 };
export const maximumSourceSize = 25 * 1024 * 1024;

export type CropTarget = "desktop" | "mobile";
export type CropState = {
  zoom: number;
  horizontal: number;
  vertical: number;
};
export type CropDragState = {
  target: CropTarget;
  pointerId: number;
  startX: number;
  startY: number;
  horizontal: number;
  vertical: number;
};

export const initialCrop: CropState = {
  zoom: 1,
  horizontal: 50,
  vertical: 50,
};

export function clampCropPosition(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function drawCrop(
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

export function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
}
