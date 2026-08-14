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
    const openingBanSpacing = treeStep.number === 4 ? "opening-ban-spacing" : "";

    return (
      <div
        className={`fearless-draft-tree-slot ${treeStep.type.toLowerCase()} ${openingBanSpacing} ${hero ? "filled" : ""} ${isCurrent ? "current-action" : ""} ${previewHero ? "previewing" : ""}`}
        aria-label={`${treeStep.number}. ${actionName}, ${sideName}${displayedHero ? `: ${displayedHero.name}` : ""}`}
      >
        {displayedHero && (
          <Image src={displayedHero.imageUrl} alt="" fill sizes="88px" unoptimized />
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
        const rowSteps = [radiant, dire].filter(
          (treeStep): treeStep is DraftTreeStep => treeStep !== undefined,
        );
        rowSteps.sort((left, right) => left.number - right.number);
        const [earlierStep, laterStep] = rowSteps;
        const earlierLevel = laterStep ? "upper" : "middle";
        const hasPick = rowSteps.some((treeStep) => treeStep.type === "PICK");
        const radiantLevel = radiant?.number === earlierStep.number ? earlierLevel : "lower";
        const direLevel = dire?.number === earlierStep.number ? earlierLevel : "lower";
        const radiantDigits = radiant && radiant.number >= 10 ? "double-digit" : "single-digit";
        const direDigits = dire && dire.number >= 10 ? "double-digit" : "single-digit";
        return (
          <div
            className={`fearless-draft-tree-row ${hasPick ? "has-pick" : ""}`}
            key={rowSteps.map((treeStep) => treeStep.number).join("-")}
          >
            <div className={`fearless-draft-tree-branch radiant ${radiant ? `active ${radiantLevel} ${radiantDigits}` : ""}`}>
              {radiant && renderSlot(radiant, "Свет")}
            </div>
            <div className="fearless-draft-tree-numbers" aria-hidden="true">
              <b className={`fearless-draft-tree-number ${earlierLevel}`}>{earlierStep.number}</b>
              {laterStep && (
                <b className="fearless-draft-tree-number lower">{laterStep.number}</b>
              )}
            </div>
            <div className={`fearless-draft-tree-branch dire ${dire ? `active ${direLevel} ${direDigits}` : ""}`}>
              {dire && renderSlot(dire, "Тьма")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
