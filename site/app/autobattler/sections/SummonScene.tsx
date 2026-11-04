'use client';
import {useState,type CSSProperties} from 'react';
import {shardDescription} from '@/lib/autobattler/shards';
import {heroById} from '@/lib/autobattler/catalog';
import type {GameResponse} from '../services/client';
import {HeroPortrait,roleNames} from '../components/HeroCard';
import {SummonShrine} from '../components/SummonShrine';
import {SummonResults} from '../components/SummonResults';
import {summonTiming} from '../model/summonSequence';
import {useSummonSequence} from '../hooks/useSummonSequence';

export {pendingKey} from '../model/summonSequence';
const rarityNames={Rare:'Редкий',Epic:'Эпический',Legendary:'Легендарный'};

export default function SummonScene({data,onSummon,onLockChange}:{data:GameResponse;onLockChange:(value:boolean)=>void;onSummon:(input:Record<string,unknown>)=>Promise<GameResponse|undefined>}){
 const {phase,shard,setShard,results,revealed,rarity,isBatch,start,skip,finish}=useSummonSequence(data,onSummon,onLockChange);
 const [inspected,setInspected]=useState<number|null>(null);
 const isComplete=phase==='results';
 const showBoard=isBatch&&(phase==='opening'||isComplete)&&inspected===null;
 const canSkip=phase==='charge'||phase==='opening';
 const hero=isComplete&&(!isBatch||inspected!==null)?heroById[results[inspected??0]]:undefined;
 const balance=shard==='gold'?(data.profile.goldenShards??0):data.profile.tickets;
 const displayRarity=hero?.rarity??(phase==='opening'?rarity:undefined);
 const heading=hero?.name??(showBoard?'Ваши новые союзники':phase==='idle'?'Портал призыва':'Астральный призыв');
 return <section className={`ab-summon-scene ab-summon-${phase} ab-shard-${shard} ${displayRarity?`ab-reveal-${displayRarity}`:''}`} aria-label="Астральный призыв">
  <header className="ab-summon-heading">
   <small key={`${phase}-${revealed}-${inspected}`}>{displayRarity?rarityNames[displayRarity]:'СВЯТИЛИЩЕ ОСКОЛКОВ'}</small>
   <h2>{heading}</h2>
   {showBoard&&<span role="status">Открыто {revealed} из {results.length}</span>}
  </header>
  <div className={`ab-summon-stage ${showBoard?'is-board':''}`} onClick={isBatch&&canSkip?skip:undefined}>
   {phase==='opening'&&<div key={revealed} className={`ab-ritual-atmosphere ab-atmosphere-${rarity}`} style={{'--opening-time':`${summonTiming[rarity??'Rare']}ms`} as CSSProperties}/>}
   {showBoard?<SummonResults results={results} revealed={revealed} profile={data.profile} shouldAnimate={canSkip} shard={shard} onInspect={setInspected}/>:hero?
    <div className="ab-summon-hero-reveal" key={hero.id}><div className="ab-summon-hero-portal"/><div className="ab-summoned-hero"><HeroPortrait hero={hero} full/></div></div>:
    <SummonShrine phase={phase} shard={shard} rarity={displayRarity}/>}
  </div>
  <footer className="ab-summon-controls">
   {phase==='idle'?<>
    <div className="ab-shard-tabs" aria-label="Вид осколка">
     <button aria-pressed={shard==='blue'} onClick={()=>setShard('blue')}>Синий · {data.profile.tickets}</button>
     <button aria-pressed={shard==='gold'} onClick={()=>setShard('gold')}>Золотой · {data.profile.goldenShards??0}</button>
    </div>
    <p>{shardDescription(shard)}</p>
    {shard==='gold'&&<p>Золотой осколок — за первое завершение главы</p>}
    <div>{[1,10].map(count=><button key={count} disabled={balance<count} onClick={()=>void start(count)} className="ab-primary">Призвать {count} · {count} оск.</button>)}</div>
   </>:isComplete?<>
    {hero&&<p>{roleNames[hero.role]} · Копий в коллекции: {data.profile.collection[hero.id]?.count??1}</p>}
    <div><button className="ab-primary" onClick={inspected!==null?()=>setInspected(null):finish}>{inspected!==null?'К результатам':'Продолжить'}</button></div>
   </>:phase==='error'?<>
    <p>Не удалось получить результат. Если призыв состоялся, герои уже в коллекции.</p>
    <div><button onClick={finish}>Закрыть</button></div>
   </>:<>
    <p>{phase==='request'?'Связь со святилищем…':isBatch?'Карточки открываются по очереди':'Осколок пробуждается'}</p>
    <div><button disabled={!canSkip} onClick={skip}>{isBatch?'Пропустить и открыть все':'Пропустить'}</button></div>
   </>}
  </footer>
 </section>;
}
