import {shardRarity} from './shards';
import { heroes, rules, starter } from './catalog';
import {levelCost,levelRules,stageExperience} from './abilities';
export interface Copy { count:number; first:string; last:string; level?:number }
export interface Profile { version:number; tickets:number; goldenShards?:number; experience?:number; collection:Record<string,Copy>; team:(string|null)[];
  cleared:number[]; unlocked:number; epic:number; legendary:number; summons:{hero:string; at:string}[] }
export function newProfile(now=new Date().toISOString()):Profile {
  return {version:rules.version,tickets:rules.initialTickets,goldenShards:0,experience:levelRules.initialExperience,collection:Object.fromEntries(starter.map(id=>[id,{count:1,first:now,last:now,level:1}])),
    team:[...starter],cleared:[],unlocked:1,epic:0,legendary:0,summons:[]};
}
export function grantHero(profile:Profile,id:string,now:string){
  const copy=profile.collection[id];profile.collection[id]={count:(copy?.count??0)+1,first:copy?.first??now,last:now,level:copy?.level??1};
}
/** Add level progression to existing JSON profiles without resetting collections or campaign. */
export function normalizeProfile(profile:Profile){
  profile.goldenShards??=0;
  profile.experience??=levelRules.initialExperience+profile.cleared.reduce((sum,stage)=>sum+stageExperience(stage),0);
  for(const copy of Object.values(profile.collection))copy.level??=1;
  profile.version=rules.version;
  return profile;
}
export function levelUp(profile:Profile,id:unknown){
  normalizeProfile(profile);
  if(typeof id!=='string'||!Object.hasOwn(profile.collection,id)||!heroes.some(hero=>hero.id===id))throw new Error('Герой ещё не получен');
  const copy=profile.collection[id],level=copy.level??1,cost=levelCost(level);
  if(level>=levelRules.max)throw new Error('Достигнут максимальный уровень');
  if((profile.experience??0)<cost)throw new Error('Недостаточно опыта: проходите новые этапы кампании');
  profile.experience=(profile.experience??0)-cost;copy.level=level+1;
}
export function summon(profile:Profile,count:number,random:()=>number,now=new Date().toISOString(),shard:unknown="blue"):string[]{
  if(shard!=='blue'&&shard!=='gold')throw new Error('Неизвестный осколок');
  const balance=shard==='gold'?(profile.goldenShards??0):profile.tickets;
  if(![1,10].includes(count)||balance<count)throw new Error('Недостаточно осколков или неверное количество');
  const result:string[]=[];
  for(let i=0;i<count;i++){
    const roll=random();const rarity=shardRarity(shard,roll);
    const pool=heroes.filter(hero=>hero.rarity===rarity);const hero=pool[Math.floor(random()*pool.length)];
    profile.epic=rarity==='Rare'?profile.epic+1:0;profile.legendary=rarity==='Legendary'?0:profile.legendary+1;
    grantHero(profile,hero.id,now);profile.summons.push({hero:hero.id,at:now});result.push(hero.id);
  }
  if(shard==='gold')profile.goldenShards=balance-count;else profile.tickets=balance-count;return result;
}
export function validateTeam(profile:Profile,team:unknown):asserts team is string[]{
  if(!Array.isArray(team)||team.length!==5||new Set(team).size!==5||team.some(id=>typeof id!=='string'||!profile.collection[id]))throw new Error('Выберите пять разных полученных героев');
}
export function rewardStage(profile:Profile,stage:number,isWin:boolean){
  if(!isWin||profile.cleared.includes(stage))return 0;
  normalizeProfile(profile);profile.experience=(profile.experience??0)+stageExperience(stage);
  if(stage%5===0)profile.goldenShards=(profile.goldenShards??0)+1;
  profile.cleared.push(stage);profile.unlocked=Math.min(rules.stageCount,Math.max(profile.unlocked,stage+1));profile.tickets+=rules.reward;return rules.reward;
}
