export function DraftProfileServiceLogo({
  service,
}: {
  service: "stratz" | "dotabuff";
}) {
  if (service === "stratz") {
    return (
      <svg
        className="fearless-lobby-service-logo stratz"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="15" fill="#071116" />
        <path
          d="M7 23h18v3H7zm3-2V11l4 3v7h1V7l2-2 2 2v14h1v-7l4-3v10z"
          fill="#f4fbfd"
        />
        <path
          d="M8 9.5 14 14M24 9.5 20 14M12 24h8"
          fill="none"
          stroke="#09b9d6"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  return (
    <svg
      className="fearless-lobby-service-logo dotabuff"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5" fill="#ef4435" />
      <path
        d="M6 4h5.7A6.3 6.3 0 0 1 18 10.3v3.4a6.3 6.3 0 0 1-6.3 6.3H6zm3.2 3.1v9.8h2.3a3.3 3.3 0 0 0 3.3-3.3v-3.2a3.3 3.3 0 0 0-3.3-3.3z"
        fill="#fff"
      />
    </svg>
  );
}
