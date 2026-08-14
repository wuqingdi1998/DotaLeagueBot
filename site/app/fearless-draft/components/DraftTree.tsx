import Image from "next/image";
import { buildDraftTreeRows, type DraftTreeStep } from "../model/draft-tree";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import type { DraftActionSnapshot } from "../model/snapshot";

export function DraftTree({
  actions,
  radiantPlayerId,
  firstPickPlayerId,
  currentStep,
  previewHeroId,
}: {
  actions: DraftActionSnapshot[];
  radiantPlayerId: string;
  firstPickPlayerId: string;
  currentStep: number;
  previewHeroId: number | null;
}) {
  const draftTreeRows = buildDraftTreeRows(
    actions,
    radiantPlayerId,
    firstPickPlayerId,
  );

  function renderSlot(treeStep: DraftTreeStep, sideName: "Свет" | "Тьма") {
    const { action } = treeStep;
    const hero = action?.heroId
      ? FEARLESS_DRAFT_HEROES_BY_ID.get(action.heroId)
      : null;
    const isCurrent = !action && treeStep.number === currentStep + 1;
    const previewHero = isCurrent && previewHeroId
      ? FEARLESS_DRAFT_HEROES_BY_ID.get(previewHeroId)
      : null;
    const displayedHero = hero ?? previewHero;
    const actionName = treeStep.type === "BAN" ? "Бан" : "Пик";

    return (
      <div
        className={`fearless-draft-tree-slot ${treeStep.type.toLowerCase()} ${hero ? "filled" : ""} ${isCurrent ? "current-action" : ""} ${previewHero ? "previewing" : ""}`}
        aria-label={`${treeStep.number}. ${actionName}, ${sideName}${displayedHero ? `: ${displayedHero.name}` : ""}`}
      >
        {displayedHero && (
          <Image src={displayedHero.imageUrl} alt="" fill sizes="76px" unoptimized />
        )}
      </div>
    );
  }

  return (
    <div
      className="fearless-draft-tree"
      id="fearless-draft-tree-panel"
      role="tabpanel"
      aria-labelledby="fearless-draft-tree-tab"
    >
      <div className="fearless-draft-tree-sides" aria-hidden="true">
        <span>СВЕТ</span>
        <span>ТЬМА</span>
      </div>
      {draftTreeRows.map(({ radiant, dire }) => {
        const hasPick = radiant.type === "PICK" || dire.type === "PICK";
        return (
          <div
            className={`fearless-draft-tree-row ${hasPick ? "has-pick" : ""}`}
            key={`${radiant.number}-${dire.number}`}
          >
            <div className="fearless-draft-tree-branch radiant active">
              {renderSlot(radiant, "Свет")}
            </div>
            <div className="fearless-draft-tree-numbers" aria-hidden="true">
              <b className="fearless-draft-tree-number radiant">{radiant.number}</b>
              <b className="fearless-draft-tree-number dire">{dire.number}</b>
            </div>
            <div className="fearless-draft-tree-branch dire active">
              {renderSlot(dire, "Тьма")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
