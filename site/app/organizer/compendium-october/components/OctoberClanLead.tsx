import { FaStar } from "react-icons/fa";
import type { OctoberClanMember } from "../model/clan-members";
import { octoberClanLead } from "../model/clan-standings";

export function OctoberClanLead({ members }: { members: readonly OctoberClanMember[] }) {
  const { leader, advantage } = octoberClanLead(members);
  const stars = new Intl.NumberFormat("ru-RU").format(advantage);
  const starLabel = new Intl.PluralRules("ru-RU").select(advantage);
  const starWord = starLabel === "one" ? "звезду" : starLabel === "few" ? "звезды" : "звёзд";
  return (
    <div className="october-clan-lead" aria-label="Лидер кланового зачёта">
      <FaStar aria-hidden="true" />
      <div>
        <strong>{leader ? `Лидирует ${leader.name}` : "Кланы идут наравне"}</strong>
        <span>{leader ? `Впереди на ${stars} ${starWord}` : "Разница – 0 звёзд"}</span>
      </div>
    </div>
  );
}
