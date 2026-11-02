import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from '@/app/autobattler/components/Game';
import {newProfile,summon,rewardStage,validateTeam} from '@/lib/autobattler/progression';
import {simulate} from '@/lib/autobattler/simulation';
import {stages} from '@/lib/autobattler/catalog';
let profile=newProfile();
window.fetch=async(_input,init)=>{
  const input=init?.body?JSON.parse(String(init.body)):undefined;
  const extra:Record<string,unknown>={};
  if(input?.action==='summon')extra.summoned=summon(profile,input.count,()=>.9);
  if(input?.action==='team'){validateTeam(profile,input.team);profile.team=input.team;}
  if(input?.action==='battle'){
    const stage=stages[input.stage-1];validateTeam(profile,profile.team);const battle=simulate(profile.team,stage.team,17,stage.scale);
    extra.battle=battle;extra.reward=rewardStage(profile,stage.id,battle.winner===0);
  }
  profile=structuredClone(profile);
  return new Response(JSON.stringify({profile,isAdmin:true,...extra}),{headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<Game/>);
