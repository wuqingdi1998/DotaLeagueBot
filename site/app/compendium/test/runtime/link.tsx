import type { AnchorHTMLAttributes } from "react";

/** Participant/profile links remain labels inside the isolated test. */
export default function TestLink({ children, href, prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) {
  void prefetch;
  return <a {...props} href={href === "#" ? "#" : undefined} aria-disabled="true" onClick={(event) => event.preventDefault()}>{children}</a>;
}
