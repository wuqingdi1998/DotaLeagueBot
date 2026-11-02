'use client';
import {useEffect,useState} from 'react';
import {heroById,rules} from '@/lib/autobattler/catalog';
import type {GameResponse} from '../services/client';
import {HeroPortrait,roleNames} from '../components/HeroCard';
export const pendingKey='lse-autobattler-summon';
function beginSummon(){return {id:crypto.randomUUID(),started:Date.now()};}
export default function SummonScene({data,onSummon,onLockChange}:{data:GameResponse;onLockChange:(value:boolean)=>void;onSummon:(input:Record<string,unknown>)=>Promise<GameResponse|undefined>}){
  const [phase,setPhase]=useState(0);const [results,setResults]=useState<string[]>([]);const [index,setIndex]=useState(0);const [isWaiting,setWaiting]=useState(false);
  useEffect(()=>{
    const pending=localStorage.getItem(pendingKey);if(!pending)return;
    let saved:{id:string;started:number};try{saved=JSON.parse(pending);}catch{return;}
    const operation=data.history?.find(operation=>operation.operation_id===saved.id);
    const restored=operation?.result.summoned;
    if(data.history&&!operation){localStorage.removeItem(pendingKey);const timer=setTimeout(()=>setPhase(0),0);return()=>clearTimeout(timer);}
    if(restored?.length){const timer=setTimeout(()=>{setResults(restored);setPhase(Date.now()-saved.started>=5600?4:1);},0);return()=>clearTimeout(timer);}
  },[data.history]);
  useEffect(()=>{onLockChange(phase>0);},[phase,onLockChange]);
  useEffect(()=>{if(phase<1||phase>=4)return;const timer=setTimeout(()=>setPhase(phase+1),phase===1?1800:phase===2?2200:1600);return()=>clearTimeout(timer);},[phase]);
  async function start(count:number){
    const pending=beginSummon();const operationId=pending.id;localStorage.setItem(pendingKey,JSON.stringify(pending));setResults([]);setIndex(0);setWaiting(true);setPhase(1);
    const result=await onSummon({action:'summon',count,operationId});setWaiting(false);
    if(result?.summoned)setResults(result.summoned);else setPhase(4);
  }
  const id=phase>=4?results[index]:undefined;const hero=id?heroById[id]:undefined;
  return <section className={`ab-summon-scene ab-summon-phase-${phase} ${hero?`ab-reveal-${hero.rarity}`:''}`}>
    <div className="ab-scene-heading"><small>АСТРАЛЬНЫЙ ПРИЗЫВ</small><h2>{phase===0?'Кто ответит на зов?':phase<4?'Пробуждение сферы':hero?.name??'Закрепляем результат…'}</h2></div>
    <div className="ab-portal"><div className="ab-ring"/><div className="ab-ring ab-ring-two"/>{hero?<div className="ab-summoned-hero" key={`${id}-${index}`}><HeroPortrait hero={hero}/></div>:<div className="ab-crystal" role="img" aria-label="Астральная сфера призыва"/>}<div className="ab-portal-motes"/></div>
    {phase===0?<div className="ab-summon-controls"><p>Rare 80% · Epic 18% · Legendary 2%</p><small>До Epic+: {rules.epicPity-data.profile.epic} · До Legendary: {rules.legendaryPity-data.profile.legendary}</small><div>{[1,10].map(count=><button key={count} disabled={data.profile.tickets<count*rules.summonCost} onClick={()=>void start(count)} className="ab-primary">Призвать {count} · {count*rules.summonCost} бил.</button>)}</div></div>:phase<4?<div className="ab-summon-controls"><p>{['','Сфера пробуждается','Энергия нарастает','Граница миров открывается'][phase]}</p><button disabled={phase===1||isWaiting} onClick={()=>setPhase(4)}>Пропустить</button></div>:hero?<div className="ab-summon-controls"><strong>{hero.rarity} · {roleNames[hero.role]}</strong><p>{(data.profile.collection[hero.id]?.count??0)-results.filter(id=>id===hero.id).length+results.slice(0,index).filter(id=>id===hero.id).length===0?'Новый союзник':`Копий в коллекции: ${data.profile.collection[hero.id]?.count}`}</p><button className="ab-primary" onClick={()=>{if(index+1<results.length)setIndex(index+1);else{setPhase(0);setResults([]);localStorage.removeItem(pendingKey);}}}>{index+1<results.length?`Следующий · ${index+1}/${results.length}`:'Продолжить'}</button></div>:<p>Ожидаем подтверждение сервера…</p>}
  </section>;
}
