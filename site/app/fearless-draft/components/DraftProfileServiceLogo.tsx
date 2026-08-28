export function DraftProfileServiceLogo({
  service,
}: {
  service: "stratz" | "dotabuff";
}) {
  if (service === "stratz") {
    return (
      <svg
        className="fearless-lobby-service-logo stratz"
        viewBox="0 0 300 300"
        aria-hidden="true"
      >
        <circle
          cx="150"
          cy="150"
          r="123"
          fill="#05090b"
          stroke="#0aa9c6"
          strokeWidth="15"
        />
        <path
          d="M108 127 116 123V109L130 102V116L143 109V92L156 84 169 92V107L182 101V116L194 110V130L188 132V184H112V132Z"
          fill="#d8dde0"
          stroke="#05090b"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M108 127 116 123V109L130 102V116L143 109V92L156 84V184H112V132Z"
          fill="#1598b0"
          stroke="#05090b"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="M74 210C97 194 122 185 150 183 178 185 203 194 226 210 199 202 175 198 150 198S101 202 74 210Z"
          fill="#d8dde0"
        />
        <path
          d="M74 210C97 194 122 185 150 183V198C125 198 101 202 74 210Z"
          fill="#1598b0"
        />
        <text
          x="218"
          y="202"
          fill="#d8dde0"
          fontFamily="Arial, sans-serif"
          fontSize="11"
          fontWeight="700"
        >
          ®
        </text>
      </svg>
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
