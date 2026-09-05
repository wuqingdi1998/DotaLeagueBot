import { FiArrowUpRight, FiCheck } from "react-icons/fi";
import { SiBoosty } from "react-icons/si";
import { boostyUrl } from "@/lib/community-links";
import {
  boostyBenefits,
  boostyPlans,
  type BoostyPlan,
} from "../model/boosty-plans";

function PlanHeading({ plan }: { plan: BoostyPlan }) {
  return (
    <div
      className="boosty-plan-heading"
      style={{ "--plan-color": plan.color } as React.CSSProperties}
    >
      <span>{plan.name}</span>
      <strong>{plan.level}</strong>
      <b>{plan.price}</b>
      {plan.note && <small>{plan.note}</small>}
    </div>
  );
}

function BenefitCheck({ label }: { label: string }) {
  return (
    <span className="boosty-benefit-check" aria-label={label}>
      <FiCheck aria-hidden="true" />
    </span>
  );
}

export function BoostyBenefits() {
  return (
    <section
      className="boosty-benefits-section"
      aria-labelledby="boosty-benefits-title"
    >
      <div className="boosty-section-heading boosty-benefits-heading">
        <span>Уровни поддержки</span>
        <div className="boosty-benefits-title-row">
          <h2 id="boosty-benefits-title">Сравнение преимуществ</h2>
          <a
            className="boosty-external-button boosty-action-button"
            href={boostyUrl}
            target="_blank"
            rel="noreferrer"
          >
            <SiBoosty aria-hidden="true" />
            Перейти на Boosty
            <FiArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <p>Чем выше уровень, тем больше возможностей открывается.</p>
      </div>

      <div
        className="boosty-benefits-matrix"
        role="table"
        aria-label="Уровни и преимущества Boosty"
      >
        <div className="boosty-matrix-head" role="row">
          <strong role="columnheader">Преимущества</strong>
          {boostyPlans.map((plan) => (
            <div role="columnheader" key={plan.id}>
              <PlanHeading plan={plan} />
            </div>
          ))}
        </div>
        {boostyBenefits.map((benefit) => (
          <div className="boosty-matrix-row" role="row" key={benefit.id}>
            <strong role="rowheader">{benefit.label}</strong>
            {boostyPlans.map((plan) => (
              <span role="cell" key={plan.id}>
                {plan.benefitIds.includes(benefit.id) && (
                  <BenefitCheck
                    label={`${plan.name}: преимущество доступно`}
                  />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="boosty-plan-cards">
        {boostyPlans.map((plan) => (
          <article className="boosty-plan-card" key={plan.id}>
            <PlanHeading plan={plan} />
            <ul>
              {boostyBenefits
                .filter((benefit) => plan.benefitIds.includes(benefit.id))
                .map((benefit) => (
                  <li key={benefit.id}>
                    <FiCheck aria-hidden="true" />
                    <span>{benefit.label}</span>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
