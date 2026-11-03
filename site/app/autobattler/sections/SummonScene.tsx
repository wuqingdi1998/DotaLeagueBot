'use client';
import {useEffect,useState} from 'react';
import {shardDescription} from '@/lib/autobattler/shards';
import {heroById} from '@/lib/autobattler/catalog';
import type {GameResponse} from '../services/client';
import HeroCard,{HeroPortrait,roleNames} from '../components/HeroCard';
import {SummonShrine} from '../components/SummonShrine';
export const pendingKey='lse-autobattler-summon';
function beginSummon(){return {id:crypto.randomUUID(),started:Date.now()};}
export default function SummonScene({data,onSummon,onLockChange}:{data:GameResponse;onLockChange:(value:boolean)=>void;onSummon:(input:Record<string,unknown>)=>Promise<GameResponse|undefined>}){
  const [shard,setShard]=useState<"blue"|"gold">("blue");
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
    const result=await onSummon({action:'summon',count,operationId,shard});setWaiting(false);
    if(result?.summoned)setResults(result.summoned);else setPhase(4);
  }
  function finish(){setPhase(0);setResults([]);localStorage.removeItem(pendingKey);}
  const id=phase===4?results[index]:undefined;const hero=id?heroById[id]:undefined;
  if(phase===5)return <section className="ab-summon-scene"><div className="ab-summon-summary"><h2>Ваши новые союзники</h2><div className="ab-summon-ribbons">{results.map((id,index)=><HeroCard key={`${id}-${index}`} hero={heroById[id]} count={data.profile.collection[id]?.count??1} level={data.profile.collection[id]?.level??1} onClick={()=>{setIndex(index);setPhase(4);}}/>)}</div><button className="ab-primary" onClick={finish}>Продолжить</button></div></section>;
  return <section className={`ab-summon-scene ab-summon-phase-${phase} ab-shard-${shard} ${hero?`ab-reveal-${hero.rarity}`:''}`}>
    <div className="ab-scene-heading"><small>АСТРАЛЬНЫЙ ПРИЗЫВ</small><h2>{phase===0?'Кто ответит на зов?':phase<4?'Пробуждение сферы':hero?.name??'Закрепляем результат…'}</h2></div>
    <div className="ab-portal"><SummonShrine phase={phase}/>{hero&&<><div className="ab-summoned-hero" key={`${id}-${index}`}><HeroPortrait hero={hero} full/></div><strong className="ab-reveal-rarity">{hero.rarity}</strong><div className="ab-reveal-banner">{hero.name}</div></>}</div>
    {phase===0?<div className="ab-summon-controls"><div className="ab-shard-tabs"><button aria-pressed={shard==="blue"} onClick={()=>setShard("blue")}>Синий · {data.profile.tickets}</button><button aria-pressed={shard==="gold"} onClick={()=>setShard("gold")}>Золотой · {data.profile.goldenShards??0}</button></div><p>{shardDescription(shard)}</p><small>Золотой осколок — за первое завершение главы</small><div>{[1,10].map(count=><button key={count} disabled={(shard==="gold"?(data.profile.goldenShards??0):data.profile.tickets)<count} onClick={()=>void start(count)} className="ab-primary">Призвать {count} · {count} оск.</button>)}</div></div>:phase<4?<div className="ab-summon-controls"><p>{['','Сфера пробуждается','Энергия нарастает','Граница миров открывается'][phase]}</p><button disabled={phase===1||isWaiting} onClick={()=>setPhase(4)}>Пропустить</button></div>:hero?<div className="ab-summon-controls"><strong>{roleNames[hero.role]}</strong><p>{(data.profile.collection[hero.id]?.count??0)-results.filter(id=>id===hero.id).length+results.slice(0,index).filter(id=>id===hero.id).length===0?'Новый союзник':`Копий в коллекции: ${data.profile.collection[hero.id]?.count}`}</p><button className="ab-primary" onClick={()=>{if(index+1<results.length)setIndex(index+1);else if(results.length>1)setPhase(5);else finish();}}>{index+1<results.length?`Следующий · ${index+1}/${results.length}`:results.length>1?'Все результаты':'Продолжить'}</button></div>:<div className="ab-summon-controls"><p>Результат пока не получен. Проверьте соединение и обновите данные.</p><button onClick={finish}>Закрыть</button></div>}
  </section>;
}
