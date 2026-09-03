"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

type AvatarImageProps = Omit<ImageProps, "onError" | "src"> & {
  fallback: ReactNode;
  source: string | null | undefined;
};

export function AvatarImage({
  alt,
  fallback,
  source,
  ...imageProps
}: AvatarImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!source || failedSource === source) {
    return <>{fallback}</>;
  }

  return (
    <Image
      {...imageProps}
      alt={alt}
      src={source}
      onError={() => setFailedSource(source)}
    />
  );
}
