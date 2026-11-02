'use client';
import {useState} from 'react';
import {heroById,stages} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import {assignPosition,type Formation} from '../model/formation';
import {HeroPortrait} from '../components/HeroCard';
import HeroGallery from './HeroGallery';
export default function TeamScene({profile,stageId,onSave,onBattle}:{profile:Profile;stageId:number;onSave:(team:string[])=>Promise<unknown>;onBattle:(stage:number)=>void}){
  const [team,setTeam]=useState<Formation>(Array.from({length:5},(_,index)=>profile.team[index]??null));
  const [slot,setSlot]=useState<number|null>(null);const [error,setError]=useState('');const [isSaved,setSaved]=useState(false);const stage=stages.find(item=>item.id===stageId)??stages[0];
  const complete=team.every((id):id is string=>!!id);
  return <section className="ab-team-scene"><header className="ab-team-heading"><div><small>ПОДГОТОВКА К БОЮ · ЭТАП {stage.id}</small><h2>{stage.name}</h2></div><span>СОСТАВ {team.filter(Boolean).length}/5</span></header>
    <div className="ab-tactics-field" aria-label="Поле расстановки команды и противников"><div className="ab-side-label">ПРОТИВНИКИ</div><div className="ab-field-row ab-enemy-row">{stage.team.map((id,index)=><div key={`${id}-${index}`} className="ab-field-unit"><HeroPortrait hero={heroById[id]} full/><small>{heroById[id].name}</small></div>)}</div><div className="ab-field-divider"><span>АРЕНА · ВАША КОМАНДА</span></div><div className="ab-field-row ab-player-row">{team.map((id,index)=><button key={index} className={`ab-field-unit ab-field-slot ${slot===index?'is-selected':''} ${index<2?'ab-front':'ab-back'}`} aria-label={`Позиция ${index+1}, ${index<2?'передняя':'задняя'}`} aria-pressed={slot===index} onClick={()=>{setSlot(index);setSaved(false);setError('');}}>{id?<HeroPortrait hero={heroById[id]} full/>:<span className="ab-empty-unit">+</span>}<small>{id?heroById[id].name:`${index<2?'Передняя':'Задняя'} · ${index+1}`}</small></button>)}</div></div>
    <div className="ab-team-tools"><span>{slot===null?'Выберите место на поле':`Выбрана позиция ${slot+1} · ${slot<2?'передний ряд':'задний ряд'}`}</span><button disabled={slot===null||!team[slot]} onClick={()=>{setTeam(team.map((id,index)=>index===slot?null:id));setSaved(false);}}>Убрать героя</button></div>
    <HeroGallery profile={profile} isOwnedOnly onSelect={hero=>{if(slot===null){setError('Сначала выберите место на поле');return;}setTeam(assignPosition(team,slot,hero.id));setError('');setSaved(false);}}/>
    <footer className="ab-team-actions"><span role="status">{error|| (isSaved?'Состав сохранён':`${team.filter(Boolean).length} из 5 · выбор героя заменяет персонажа или меняет его позицию`)}</span><button disabled={!complete} onClick={async()=>{if(complete){const result=await onSave(team);if(result)setSaved(true);}}}>Сохранить</button><button className="ab-primary" disabled={!complete} onClick={async()=>{if(!complete)return;const result=await onSave(team);if(result)onBattle(stage.id);}}>Начать бой</button></footer>
  </section>;
}
