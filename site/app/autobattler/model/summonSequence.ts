import type {Rarity} from '@/lib/autobattler/catalog';

export const pendingKey='lse-autobattler-summon';
export const summonTiming:Record<Rarity,number>={Rare:720,Epic:2250,Legendary:3650};
export type ShardColor='blue'|'gold';
export type PendingSummon={id:string;started:number;shard?:ShardColor;revealed?:number};

export function readPendingSummon():PendingSummon|undefined{
 try{
  const data=JSON.parse(localStorage.getItem(pendingKey)??'null');
  if(typeof data?.id==='string'&&Number.isFinite(data.started))return data;
 }catch{
  localStorage.removeItem(pendingKey);
 }
}
