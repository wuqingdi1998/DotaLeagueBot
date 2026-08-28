import Image from "next/image";

export function DraftProfileServiceLogo({
  service,
}: {
  service: "stratz" | "dotabuff";
}) {
  if (service === "stratz") {
    return (
      <Image
        className="fearless-lobby-service-logo stratz"
        src="/fearless-draft/stratz-logo.svg"
        alt=""
        width={300}
        height={300}
        unoptimized
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      className="fearless-lobby-service-logo dotabuff"
      viewBox="0 0 450 448"
      aria-hidden="true"
    >
      <rect width="450" height="448" fill="#f23a1f" />
      <path
        d="M118 100H211C281 100 326 146 326 224S281 348 211 348H118V100ZM158 137V312H210C259 312 286 282 286 224S259 137 210 137H158Z"
        fillRule="evenodd"
        fill="#fff"
      />
    </svg>
  );
}
