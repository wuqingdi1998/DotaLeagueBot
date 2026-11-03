import {simulate} from '@/lib/autobattler/simulation';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from '@/app/autobattler/components/Game';
import {newProfile,grantHero,summon,rewardStage,validateTeam,levelUp} from '@/lib/autobattler/progression';
import {simulateCampaign} from '@/lib/autobattler/campaign';
import type {GameResponse} from '@/app/autobattler/services/client';
import {heroes,stages} from '@/lib/autobattler/catalog';
const fixtureKey='heroes-summon-fixture';
const saved=JSON.parse(sessionStorage.getItem(fixtureKey)??'null') as {profile:GameResponse['profile'];history:NonNullable<GameResponse['history']>;rollIndex:number}|null;
let profile=saved?.profile??newProfile();
const history=saved?.history??[];
const isEpic=new URLSearchParams(location.search).has('epic');
if(new URLSearchParams(location.search).has("all"))for(const hero of heroes)if(!profile.collection[hero.id])grantHero(profile,hero.id,new Date().toISOString());
const summonRolls=[isEpic?.93:.995,.8,.93,.1,.86,.25,.44,.6,.8,.51,.93,.1,.5,.12,.2,.7,.88,.6,.1,.9];let rollIndex=saved?.rollIndex??0;
window.fetch=async(_input,init)=>{
  const input=init?.body?JSON.parse(String(init.body)):undefined;
  const extra:Record<string,unknown>={};
  if(input?.action==='summon'){
    const existing=history.find(entry=>entry.operation_id===input.operationId);
    const summoned=existing?.result.summoned??summon(profile,input.count,()=>summonRolls[rollIndex++%summonRolls.length],undefined,input.shard??'blue');
    extra.summoned=summoned;
    if(!existing)history.unshift({operation_id:input.operationId,action:'summon',created_at:new Date().toISOString(),result:{summoned}});
    sessionStorage.setItem(fixtureKey,JSON.stringify({profile,history,rollIndex}));
  }
  if(input?.action==='team'){validateTeam(profile,input.team);profile.team=input.team;}
  if(input?.action==='level')levelUp(profile,input.hero);
  if(input?.action==='test')extra.battle=simulate(profile.team.filter((id):id is string=>!!id),input.enemies,17);
  if(input?.action==='battle'){
    const stage=stages[input.stage-1];validateTeam(profile,profile.team);const battle=simulateCampaign(profile.team,stage.team,17,stage.scale,Object.fromEntries(Object.entries(profile.collection).map(([id,copy])=>[id,copy.level??1])));
    const experienceBefore=profile.experience??0;extra.battle=battle;extra.reward=rewardStage(profile,stage.id,battle.winner===0);extra.experienceReward=(profile.experience??0)-experienceBefore;
  }
  profile=structuredClone(profile);
  return new Response(JSON.stringify({profile,isAdmin:true,history,...extra}),{headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<Game/>);
