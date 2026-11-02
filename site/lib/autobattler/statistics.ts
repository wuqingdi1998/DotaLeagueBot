import {heroes} from './catalog';
import {newProfile,summon} from './progression';
/** Fixed seed and isolated in-memory profile; never grants resources to an account. */
export function summonStatistics(count=100000,seed=19){
  if(!Number.isInteger(count)||count<1||count>100000)throw new Error('Лимит симуляции – 100000 призывов');
  const profile=newProfile();profile.tickets=count;let state=seed;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const totals={Rare:0,Epic:0,Legendary:0};
  for(let index=0;index<count;index++){
    const [id]=summon(profile,1,random);
    totals[heroes.find(hero=>hero.id===id)!.rarity]++;
    profile.summons=[];
  }
  return {count,seed,totals};
}
