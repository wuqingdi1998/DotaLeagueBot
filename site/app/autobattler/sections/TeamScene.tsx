'use client';
import {useState} from 'react';
import {heroById} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import {assignPosition,type Formation} from '../model/formation';
import {HeroPortrait} from '../components/HeroCard';
import HeroGallery from './HeroGallery';
export default function TeamScene({profile,onSave}:{profile:Profile;onSave:(team:string[])=>Promise<unknown>}){
  const [team,setTeam]=useState<Formation>(Array.from({length:5},(_,index)=>profile.team[index]??null));
  const [slot,setSlot]=useState<number|null>(null);const [error,setError]=useState('');const [isSaved,setSaved]=useState(false);
  return <section className="ab-team-scene"><h2>Ваш боевой отряд</h2><div className="ab-formation">{team.map((id,index)=><button key={index} className={`ab-slot ab-slot-${index} ${slot===index?'is-selected':''}`} aria-label={`Позиция ${index+1}`} onClick={()=>{setSlot(index);setSaved(false);}}><span>{index+1} · {index<2?'Передняя':'Задняя'}</span>{id?<HeroPortrait hero={heroById[id]}/>:<strong>+</strong>}<small>{id?heroById[id].name:'Выбрать героя'}</small></button>)}</div><div className="ab-team-actions"><button disabled={slot===null} onClick={()=>{setTeam(team.map((id,index)=>index===slot?null:id));setSaved(false);}}>Освободить место</button><button className="ab-primary" disabled={team.some(id=>!id)} onClick={async()=>{if(team.every((id):id is string=>!!id)){const result=await onSave(team);if(result)setSaved(true);}}}>Сохранить состав</button></div><p role="status">{error|| (isSaved?'Состав сохранён':slot===null?'Выберите позицию на поле':`Выберите героя для позиции ${slot+1}`)}</p><HeroGallery profile={profile} isOwnedOnly onSelect={hero=>{if(slot===null){setError('Сначала выберите позицию');return;}try{setTeam(assignPosition(team,slot,hero.id));setError('');setSaved(false);}catch(error){setError((error as Error).message);}}}/></section>;
}
