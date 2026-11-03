'use client';
import {useEffect,useRef,useState} from 'react';
import {heroById} from '@/lib/autobattler/catalog';
import type {GameResponse} from '../services/client';
import {pendingKey,readPendingSummon,summonTiming,type PendingSummon,type ShardColor} from '../model/summonSequence';

type Phase='idle'|'request'|'charge'|'opening'|'results'|'error';
export function useSummonSequence(data:GameResponse,onSummon:(input:Record<string,unknown>)=>Promise<GameResponse|undefined>,onLockChange:(value:boolean)=>void){
 const [phase,setPhase]=useState<Phase>('idle');
 const [shard,setShard]=useState<ShardColor>('blue');
 const [results,setResults]=useState<string[]>([]);
 const [revealed,setRevealed]=useState(0);
 const operation=useRef<PendingSummon|undefined>(undefined);
 const current=results[revealed];
 const rarity=current?heroById[current].rarity:undefined;
 const isBatch=results.length>1;
 useEffect(()=>{
  if(!data.history||operation.current)return;
  const saved=readPendingSummon();if(!saved)return;
  const restored=data.history.find(entry=>entry.operation_id===saved.id)?.result.summoned;
  if(!restored?.length){localStorage.removeItem(pendingKey);return;}
  const count=Math.max(0,Math.min(restored.length,Math.floor(saved.revealed??restored.length)));
  const timer=setTimeout(()=>{
   operation.current=saved;
   setShard(saved.shard==='gold'?'gold':'blue');
   setResults(restored);setRevealed(count);setPhase(count===restored.length?'results':'opening');
  },0);
  return ()=>clearTimeout(timer);
 },[data.history]);
 useEffect(()=>{onLockChange(phase!=='idle');},[phase,onLockChange]);
 useEffect(()=>{
  if(!operation.current||!results.length)return;
  localStorage.setItem(pendingKey,JSON.stringify({...operation.current,revealed}));
 },[results,revealed]);
 useEffect(()=>{
  if(phase==='charge'){
   const timer=setTimeout(()=>setPhase('opening'),isBatch?920:2200);
   return ()=>clearTimeout(timer);
  }
  if(phase==='opening'&&rarity){
   const timer=setTimeout(()=>{
    setRevealed(revealed+1);
    if(revealed+1===results.length)setPhase('results');
   },summonTiming[rarity]);
   return ()=>clearTimeout(timer);
  }
 },[phase,rarity,revealed,results.length,isBatch]);
 async function start(count:number){
  if(phase!=='idle'||operation.current)return;
  const pending:PendingSummon={id:crypto.randomUUID(),started:Date.now(),shard,revealed:0};
  operation.current=pending;localStorage.setItem(pendingKey,JSON.stringify(pending));
  setResults([]);setRevealed(0);setPhase('request');
  const result=await onSummon({action:'summon',count,operationId:pending.id,shard});
  if(result?.summoned?.length){setResults(result.summoned);setPhase('charge');}
  else setPhase('error');
 }
 function skip(){
  if(!results.length||phase==='results')return;
  setRevealed(results.length);setPhase('results');
 }
 function finish(){
  operation.current=undefined;localStorage.removeItem(pendingKey);
  setResults([]);setRevealed(0);setPhase('idle');
 }
 return {phase,shard,setShard,results,revealed,rarity,isBatch,start,skip,finish};
}
