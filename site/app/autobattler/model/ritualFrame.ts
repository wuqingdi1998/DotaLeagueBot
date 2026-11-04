import type {Rarity} from '@/lib/autobattler/catalog';
import type {ShardColor} from './summonSequence';
import {smoothstep} from './crystalMath';

export function ritualFrame(phase:string,progress:number,shard:ShardColor,rarity?:Rarity){
 const opening=phase==='opening';
 const p=Math.max(0,Math.min(1,progress));
 const reveal=opening?smoothstep(.16,.68,p):0;
 const baseHue=shard==='gold'?42:202;
 const rareHue=rarity==='Legendary'?42:rarity==='Epic'?278:202;
 return {
  energy:phase==='charge'?smoothstep(0,1,p)*.62:opening?.62+smoothstep(0,.64,p)*.38:.03,
  rarityBlend:reveal,
  baseHue,
  rareHue,
  separation:opening?smoothstep(.36,.67,p)*.038:0,
  burst:opening?smoothstep(.63,1,p):0,
  glow:opening?smoothstep(.12,.63,p)*(1-smoothstep(.88,1,p)):0,
  flash:opening?Math.sin(smoothstep(.60,.87,p)*Math.PI)*.74:0,
 };
}
