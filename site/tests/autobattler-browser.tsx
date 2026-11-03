import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from '@/app/autobattler/components/Game';
import {newProfile,summon,rewardStage,validateTeam,levelUp} from '@/lib/autobattler/progression';
import {simulate} from '@/lib/autobattler/simulation';
import {stages} from '@/lib/autobattler/catalog';
let profile=newProfile();
const summonRolls=[.995,.8,.3,.1,.86,.25,.44,.6,.8,.51,.93,.1,.5,.12,.2,.7,.88,.6,.1,.9];let rollIndex=0;
window.fetch=async(_input,init)=>{
  const input=init?.body?JSON.parse(String(init.body)):undefined;
  const extra:Record<string,unknown>={};
  if(input?.action==='summon')extra.summoned=summon(profile,input.count,()=>summonRolls[rollIndex++%summonRolls.length]);
  if(input?.action==='team'){validateTeam(profile,input.team);profile.team=input.team;}
  if(input?.action==='level')levelUp(profile,input.hero);
  if(input?.action==='battle'){
    const stage=stages[input.stage-1];validateTeam(profile,profile.team);const battle=simulate(profile.team,stage.team,17,stage.scale,Object.fromEntries(Object.entries(profile.collection).map(([id,copy])=>[id,copy.level??1])));
    const experienceBefore=profile.experience??0;extra.battle=battle;extra.reward=rewardStage(profile,stage.id,battle.winner===0);extra.experienceReward=(profile.experience??0)-experienceBefore;
  }
  profile=structuredClone(profile);
  return new Response(JSON.stringify({profile,isAdmin:true,...extra}),{headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<Game/>);
