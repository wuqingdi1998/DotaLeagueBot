import type { ReactNode } from "react";

/** Participant/profile links remain labels inside the isolated test. */
export default function TestLink({ children, className }: { children?: ReactNode; className?: string }) {
  return <span className={className ?? "compendium-test-inert-link"}>{children}</span>;
}
