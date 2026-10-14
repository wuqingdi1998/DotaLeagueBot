import Image from "next/image";
import { FaEquals } from "react-icons/fa";
import type { OctoberClanMember } from "../model/clan-members";
import { octoberClanLead } from "../model/clan-standings";

export function OctoberClanLead({ members }: { members: readonly OctoberClanMember[] }) {
  const { leader, advantage } = octoberClanLead(members);
  const stars = new Intl.NumberFormat("ru-RU").format(advantage);
  const starLabel = new Intl.PluralRules("ru-RU").select(advantage);
  const starWord = starLabel === "one" ? "звезду" : starLabel === "few" ? "звезды" : "звёзд";
  return (
    <div className="october-clan-lead" aria-label="Лидер кланового зачёта">
      {leader ? (
        <Image className="october-clan-lead-emblem" src={leader.emblem} alt="" width={48} height={48} />
      ) : (
        <span className="october-clan-lead-tie" aria-label="Ничья">
          <FaEquals aria-hidden="true" />
        </span>
      )}
      <div>
        <strong>{leader ? `Лидирует ${leader.name}` : "Кланы идут наравне"}</strong>
        <span>{leader ? `Впереди на ${stars} ${starWord}` : "Разница – 0 звёзд"}</span>
      </div>
    </div>
  );
}
