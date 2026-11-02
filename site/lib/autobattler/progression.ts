import { heroes, rules, starter, type Rarity } from './catalog';
export interface Copy { count:number; first:string; last:string }
export interface Profile { version:number; tickets:number; collection:Record<string,Copy>; team:string[];
  cleared:number[]; unlocked:number; epic:number; legendary:number; summons:{hero:string; at:string}[] }
export function newProfile(now=new Date().toISOString()):Profile {
  return {version:rules.version,tickets:rules.initialTickets,collection:Object.fromEntries(starter.map(id=>[id,{count:1,first:now,last:now}])),
    team:[...starter],cleared:[],unlocked:1,epic:0,legendary:0,summons:[]};
}
export function grantHero(profile:Profile,id:string,now:string){
  const copy=profile.collection[id];profile.collection[id]={count:(copy?.count??0)+1,first:copy?.first??now,last:now};
}
export function summon(profile:Profile,count:number,random:()=>number,now=new Date().toISOString()):string[]{
  if(![1,10].includes(count)||profile.tickets<count*rules.summonCost)throw new Error('Недостаточно билетов или неверное количество');
  const result:string[]=[];
  for(let i=0;i<count;i++){
    const roll=random();let rarity:Rarity=roll<rules.rareChance?'Rare':roll<rules.rareChance+rules.epicChance?'Epic':'Legendary';
    if(profile.legendary>=rules.legendaryPity-1)rarity='Legendary';
    else if(profile.epic>=rules.epicPity-1 && rarity==='Rare')rarity='Epic';
    const pool=heroes.filter(hero=>hero.rarity===rarity);const hero=pool[Math.floor(random()*pool.length)];
    profile.epic=rarity==='Rare'?profile.epic+1:0;profile.legendary=rarity==='Legendary'?0:profile.legendary+1;
    grantHero(profile,hero.id,now);profile.summons.push({hero:hero.id,at:now});result.push(hero.id);
  }
  profile.tickets-=count*rules.summonCost;return result;
}
export function validateTeam(profile:Profile,team:unknown):asserts team is string[]{
  if(!Array.isArray(team)||team.length!==5||new Set(team).size!==5||team.some(id=>typeof id!=='string'||!profile.collection[id]))throw new Error('Выберите пять разных полученных героев');
}
export function rewardStage(profile:Profile,stage:number,isWin:boolean){
  if(!isWin||profile.cleared.includes(stage))return 0;
  profile.cleared.push(stage);profile.unlocked=Math.min(rules.stageCount,Math.max(profile.unlocked,stage+1));profile.tickets+=rules.reward;return rules.reward;
}
