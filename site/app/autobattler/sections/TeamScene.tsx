'use client';
import {useState,type CSSProperties} from 'react';
import {heroById,stages} from '@/lib/autobattler/catalog';
import {heroStats} from '@/lib/autobattler/abilities';
import type {Profile} from '@/lib/autobattler/progression';
import {assignPosition,type Formation} from '../model/formation';
import {HeroPortrait,roleIcons} from '../components/HeroCard';
import HeroGallery from './HeroGallery';
const positions=[[33,38],[35,73],[13,22],[16,49],[19,78]];
export default function TeamScene({profile,stageId,onSave,onBattle}:{profile:Profile;stageId:number;onSave:(team:string[])=>Promise<unknown>;onBattle:(stage:number)=>void}){
 const [team,setTeam]=useState<Formation>(Array.from({length:5},(_,index)=>profile.team[index]??null));
 const [slot,setSlot]=useState<number|null>(null),[error,setError]=useState(''),[isSaved,setSaved]=useState(false),[isSaving,setSaving]=useState(false);
 const stage=stages.find(item=>item.id===stageId)??stages[0],complete=team.every((id):id is string=>!!id);
 const power=(ids:Formation,isEnemy=false)=>Math.round(ids.reduce((sum,id)=>{if(!id)return sum;const stats=heroStats(heroById[id],isEnemy?1:profile.collection[id]?.level??1);return sum+stats.hp/10+stats.attack+stats.defense;},0)*(isEnemy?stage.scale:1));
 async function save(shouldBattle=false){if(!complete||isSaving)return;setSaving(true);try{const result=await onSave(team);if(result){setSaved(true);if(shouldBattle)onBattle(stage.id);}}finally{setSaving(false);}}
 return <section className="ab-team-scene"><header className="ab-team-heading"><div><small>ПОДГОТОВКА · ЭТАП {stage.id}</small><h2>{stage.name}</h2></div><div className="ab-power"><strong>{power(team)}</strong><span>VS</span><strong>{power(stage.team,true)}</strong></div></header>
 <div className="ab-tactics-field" style={{backgroundImage:`linear-gradient(0deg,#0b153177,transparent 65%),url('/autobattler/${['citadel','forest','temple'][stage.chapter-1]}.webp')`}} aria-label="Поле расстановки команды и противников">
 <span className="ab-field-side ab-side-player">ВАШ ОТРЯД</span><span className="ab-field-side ab-side-enemy">ПРОТИВНИКИ</span>
 {[team,stage.team].map((side,sideIndex)=>side.map((id,index)=>{
 const [x,y]=positions[index],style={'--unit-x':`${sideIndex?100-x:x}%`,'--unit-y':`${y}%`,zIndex:Math.round(y)} as CSSProperties;
 const content=<>{id?<><span className="ab-unit-level">{roleIcons[heroById[id].role]} Ур. {sideIndex?1:profile.collection[id]?.level??1}</span><HeroPortrait hero={heroById[id]} combat/><small>{heroById[id].name}</small></>:<span className="ab-empty-unit">＋</span>}</>;
 return sideIndex?<div key={`enemy-${index}`} style={style} className="ab-field-unit ab-enemy-unit">{content}</div>:<button key={index} style={style} className={`ab-field-unit ab-field-slot ${slot===index?'is-selected':''}`} aria-label={`Позиция ${index+1}, ${index<2?'передняя':'задняя'}`} aria-pressed={slot===index} onClick={()=>{setSlot(index);setSaved(false);setError('');}}>{content}</button>;
 }))}
 </div>
 <div className="ab-team-tools"><span>{slot===null?'Выберите место, затем героя':`Позиция ${slot+1} · ${slot<2?'передний ряд':'задний ряд'}`}</span><button disabled={slot===null||!team[slot]} onClick={()=>{setTeam(team.map((id,index)=>index===slot?null:id));setSaved(false);}}>Убрать героя</button></div>
 <HeroGallery profile={profile} team={team} isOwnedOnly onSelect={hero=>{if(slot===null){setError('Сначала выберите место на поле');return;}setTeam(assignPosition(team,slot,hero.id));setError('');setSaved(false);}}/>
 <footer className="ab-team-actions"><span role="status">{error||(isSaved?'Состав сохранён':`${team.filter(Boolean).length} / 5 героев`)}</span><button disabled={!complete||isSaving} onClick={()=>void save()}>Сохранить</button><button className="ab-primary" disabled={!complete||isSaving} onClick={()=>void save(true)}>Начать бой</button></footer>
 </section>;
}
