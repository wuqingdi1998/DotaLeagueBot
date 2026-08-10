import Image from "next/image";

type TeamEmblemPreviewProps = {
  src: string;
  alt: string;
};

export function TeamEmblemPreview({ src, alt }: TeamEmblemPreviewProps) {
  return (
    <span className="team-emblem-preview">
      <Image
        className="team-emblem"
        src={src}
        alt={alt}
        width={60}
        height={60}
        unoptimized
      />
      <Image
        className="team-emblem-popup"
        src={src}
        alt=""
        aria-hidden="true"
        width={220}
        height={220}
        unoptimized
      />
    </span>
  );
}
