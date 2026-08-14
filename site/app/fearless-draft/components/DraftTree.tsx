import Image from "next/image";
import { buildDraftTreeSteps } from "../model/draft-tree";
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
  const draftTreeSteps = buildDraftTreeSteps(
    actions,
    radiantPlayerId,
    firstPickPlayerId,
  );

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
      {draftTreeSteps.map((treeStep) => {
        const { action, isRadiant } = treeStep;
        const hero = action?.heroId
          ? FEARLESS_DRAFT_HEROES_BY_ID.get(action.heroId)
          : null;
        const isCurrent = !action && treeStep.number === currentStep + 1;
        const previewHero = isCurrent && previewHeroId
          ? FEARLESS_DRAFT_HEROES_BY_ID.get(previewHeroId)
          : null;
        const displayedHero = hero ?? previewHero;
        const actionName = treeStep.type === "BAN" ? "Бан" : "Пик";
        const sideName = isRadiant ? "Свет" : "Тьма";
        const slot = (
          <div
            className={`fearless-draft-tree-slot ${treeStep.type.toLowerCase()} ${action ? "filled" : ""} ${isCurrent ? "current-action" : ""} ${previewHero ? "previewing" : ""}`}
            aria-label={`${treeStep.number}. ${actionName}, ${sideName}${displayedHero ? `: ${displayedHero.name}` : ""}`}
          >
            {displayedHero && (
              <Image src={displayedHero.imageUrl} alt="" fill sizes="76px" unoptimized />
            )}
            {action && !hero && <i>—</i>}
          </div>
        );

        return (
          <div
            className={`fearless-draft-tree-row ${treeStep.type.toLowerCase()}`}
            key={treeStep.number}
          >
            <div className={`fearless-draft-tree-branch radiant ${isRadiant ? "active" : ""}`}>
              {isRadiant && slot}
            </div>
            <b>{treeStep.number}</b>
            <div className={`fearless-draft-tree-branch dire ${isRadiant ? "" : "active"}`}>
              {!isRadiant && slot}
            </div>
          </div>
        );
      })}
    </div>
  );
}
