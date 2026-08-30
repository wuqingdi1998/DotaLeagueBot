import Link from "next/link";
import { FiArchive } from "react-icons/fi";

export function OrganizerArchiveLink({
  isOrganizer,
}: {
  isOrganizer: boolean;
}) {
  if (!isOrganizer) return null;

  return (
    <Link className="organizer-archive-link" href="/organizer">
      <FiArchive aria-hidden="true" /> Архив организатора
    </Link>
  );
}
