import { useRef, useState } from "react";
import Image from "next/image";
import { FaEquals } from "react-icons/fa";
import { FiGift } from "react-icons/fi";
import { OctoberClanStandings } from "@/app/organizer/compendium-october/components/OctoberClanStandings";
import { TEST_CLANS, TEST_PRIZES, testMembers } from "../model/presentation";
import { TEST_COMPENDIUM } from "../model/config";
import type { TestState } from "../model/state";

export function TestClans({ state }: { state: TestState }) {
  const members = testMembers(state);
  const totals = TEST_CLANS.map((clan) => members.filter((member) => member.clanId === clan.id).reduce((sum, member) => sum + member.totalPoints, 0));
  const leader = totals[0] === totals[1] ? null : TEST_CLANS[totals[0] > totals[1] ? 0 : 1];
  const [selectedPrize, setSelectedPrize] = useState<(typeof TEST_PRIZES)[number] | null>(null);
  const [areAllPrizesVisible, setAreAllPrizesVisible] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  return <section className="october-clan-showcase" aria-label="Клановый зачёт теста">
    <section className="october-clan-prize-board" data-mobile-expanded={areAllPrizesVisible}>
      <div className="october-clan-prize-intro">
        <div className="october-clan-prize-copy">
          <p>{TEST_PRIZES.length} предметов в финальном розыгрыше</p><p>Каждая звезда – дополнительный шанс на выигрыш</p><p>Победители разыграют 21 предмет, проигравшие – 9</p>
        </div>
        <div className="october-clan-lead" aria-label="Лидер тестового кланового зачёта"><div className="october-clan-lead-panel">
          {leader ? <Image src={leader.emblem} alt="" width={48} height={48} /> : <FaEquals aria-hidden="true" />}
          <div><strong>{leader ? `Лидирует ${leader.name}` : "Кланы идут наравне"}</strong><span>Разница – {Math.abs(totals[0] - totals[1])} звёзд</span></div>
        </div></div>
      </div>
      <div className="october-clan-prize-lists">
        {(["primary", "additional", "small"] as const).map((row, index) => <ul key={row} className={`october-clan-prize-row october-clan-prize-row--${row}`}>
          {TEST_PRIZES.slice(index * 10, (index + 1) * 10).map((prize) => <li key={prize.id} className={`october-clan-prize-slot october-clan-prize-slot--${prize.pool}${prize.pool === "runners-up" && [1, 4, 7].includes(prize.poolPosition) ? " october-clan-prize-slot--pool-start" : ""}`}>
            <button type="button" title={prize.name ?? "Приз пока не выбран"} aria-label={`Посмотреть приз ${prize.name ?? prize.poolPosition}`} onClick={() => { setSelectedPrize(prize); dialog.current?.showModal(); }}>
              <span className="october-clan-prize-place">{prize.poolPosition}</span>
              {prize.imagePath ? <Image className="october-clan-prize-slot-image" src={prize.thumbnailImagePath ?? prize.imagePath} alt="" fill sizes="112px" /> : <FiGift aria-hidden="true" />}
            </button>
          </li>)}
        </ul>)}
      </div>
      <button className="october-clan-prize-toggle" type="button" onClick={() => setAreAllPrizesVisible((value) => !value)}>{areAllPrizesVisible ? "Свернуть призы" : `Показать все ${TEST_PRIZES.length} призов`}</button>
    </section>
    <div className="october-clan-lineup">{TEST_CLANS.map((clan, index) => <div className="october-clan-lineup-slot" key={clan.id}>
      {index > 0 && <span className="october-clan-versus" aria-hidden="true">VS</span>}
      <OctoberClanStandings clanId={clan.id} clanName={clan.name} clanEmblem={clan.emblem} members={members.filter((member) => member.clanId === clan.id)} viewerDiscordId={TEST_COMPENDIUM.playerId} />
    </div>)}</div>
    <dialog ref={dialog} className="compendium-test-prize-dialog"><button type="button" onClick={() => dialog.current?.close()}>Закрыть приз</button>
      {selectedPrize?.imagePath && <Image src={selectedPrize.imagePath} alt="" width={300} height={220} />}
      <h3>{selectedPrize?.name ?? "Приз пока не выбран"}</h3><p>{selectedPrize?.approximateValue}</p>
    </dialog>
  </section>;
}
