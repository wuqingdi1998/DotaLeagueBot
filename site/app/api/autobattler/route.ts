import { randomInt } from 'node:crypto';
import { gameUser } from '@/lib/autobattler/access';
import { mutateProfile, readProfile, gameHistory } from '@/lib/autobattler/storage';
import { rewardStage, summon, validateTeam, levelUp } from '@/lib/autobattler/progression';
import { stages, heroById } from '@/lib/autobattler/catalog';
import { simulate } from '@/lib/autobattler/simulation';
import { adminChange } from '@/lib/autobattler/admin';
import {summonStatistics} from '@/lib/autobattler/statistics';
const random=()=>randomInt(0,0x100000000)/0x100000000;
function failure(error:unknown){
  if(error instanceof Response)return error;
  console.error('Autobattler request failed',error);
  return Response.json({error:error instanceof Error && !('code' in error)?error.message:'Не удалось сохранить игру'},{status:400});
}
export async function GET(){
  try{const user=await gameUser();return Response.json({profile:await readProfile(user.discordId),history:await gameHistory(user.discordId),isAdmin:user.isAdmin},{headers:{'Cache-Control':'no-store'}});}catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    const user=await gameUser(); const input:Record<string,unknown>=await request.json();
    if(typeof input.operationId!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(input.operationId))throw new Error('Нужен номер операции');
    if(typeof input.action!=='string'||!['team','summon','battle','level','admin','test','statistics'].includes(input.action))throw new Error('Неизвестное действие');
    if(['admin','test','statistics'].includes(input.action)&&!user.isAdmin)throw new Response(null,{status:403});
    const action=input.action;
    const result=await mutateProfile(user.discordId,input.operationId,JSON.stringify(input),profile=>{
      let extra:Record<string,unknown>={};
      if(action==='statistics')extra={statistics:summonStatistics()};
      if(action==='team'){validateTeam(profile,input.team);profile.team=input.team;}
      if(action==='level')levelUp(profile,input.hero);
      if(action==='summon')extra={summoned:summon(profile,Number(input.count),random)};
      if(action==='admin')adminChange(profile,input);
      if(action==='battle'||action==='test'){
        validateTeam(profile,profile.team);
        const stage=stages.find(stage=>stage.id===input.stage);
        if(!stage||stage.id>profile.unlocked)throw new Error('Этап ещё не открыт');
        let enemies=stage.team;
        if(action==='test'){
          if(input.mirror===true)enemies=profile.team;
          else if(Array.isArray(input.enemies)&&input.enemies.length===5&&input.enemies.every(id=>typeof id==='string'&&heroById[id]))enemies=input.enemies;
          else throw new Error('Выберите пять противников');
        }
        const levels=Object.fromEntries(Object.entries(profile.collection).map(([id,copy])=>[id,copy.level??1]));
        const battle=simulate(profile.team,enemies,randomInt(0,0x100000000),action==='test'?1:stage.scale,levels,action==='test'&&input.mirror===true?levels:{});
        battle.chapter=stage.chapter;
        const experienceBefore=profile.experience??0;
        extra={battle,reward:action==='battle'?rewardStage(profile,stage.id,battle.winner===0):0,experienceReward:(profile.experience??0)-experienceBefore};
      }
      return {profile,...extra};
    });
    return Response.json(result);
  }catch(error){return failure(error);}
}
