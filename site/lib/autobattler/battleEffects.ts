import type {Unit} from './simulation';

export const battleEffects = [
  {id:'shield',icon:'⬡',isBuff:true,until:'shieldUntil',duration:5000},
  {id:'haste',icon:'»',isBuff:true,until:'hasteUntil',duration:4000},
  {id:'stun',icon:'✦',isBuff:false,until:'stunnedUntil',duration:1800},
  {id:'poison',icon:'◆',isBuff:false,until:'poisonUntil',duration:6000},
  {id:'weaken',icon:'↓',isBuff:false,until:'weakUntil',duration:4000},
] as const;

export function visibleBattleEffects(unit:Unit,time:number){
  return battleEffects.flatMap(effect=>{
    const remaining=unit[effect.until]-time;
    if(remaining<=0||(effect.id==='shield'&&unit.shield<=0))return [];
    return [{...effect,progress:Math.min(1,remaining/(unit.effectDurations?.[effect.id]??effect.duration))}];
  });
}
