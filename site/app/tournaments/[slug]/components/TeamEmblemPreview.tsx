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
      <span className="team-emblem-popup" aria-hidden="true">
        <Image
          className="team-emblem-popup-image"
          src={src}
          alt=""
          width={240}
          height={240}
          unoptimized
        />
      </span>
    </span>
  );
}
