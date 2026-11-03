'use client';
import {useState} from 'react';
import {heroes,type Hero} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import HeroCard,{roleNames,roleIcons} from '../components/HeroCard';
export default function HeroGallery({profile,onSelect,onInspect,isOwnedOnly=false,team=[]}:{profile:Profile;onSelect:(hero:Hero)=>void;onInspect?:(hero:Hero)=>void;isOwnedOnly?:boolean;team?:(string|null)[]}){
 const [page,setPage]=useState(0),[role,setRole]=useState('Все'),[rarity,setRarity]=useState('Все'),[mode,setMode]=useState('Галерея');
 const pool=heroes.filter(hero=>(role==='Все'||hero.role===role)&&(rarity==='Все'||hero.rarity===rarity)&&(!(isOwnedOnly||mode==='Список')||profile.collection[hero.id]));
 const pages=Math.max(1,Math.ceil(pool.length/6)),current=Math.min(page,pages-1);
 return <div className={`ab-gallery ${isOwnedOnly?'ab-roster':'ab-library'}`}>
 {!isOwnedOnly&&<nav className="ab-class-rail" aria-label="Класс героя">{[['Все','Все','✦'],...Object.entries(roleNames).map(([id,name])=>[id,name,roleIcons[id as keyof typeof roleIcons]])].map(([id,name,icon])=><button key={id} aria-pressed={role===id} onClick={()=>{setRole(id);setPage(0);}}><span>{icon}</span>{name}</button>)}</nav>}
 <div className="ab-gallery-main"><div className="ab-gallery-tools"><select aria-label="Редкость героя" value={rarity} onChange={event=>{setRarity(event.target.value);setPage(0);}}><option value="Все">Все редкости</option>{['Rare','Epic','Legendary'].map(value=><option key={value}>{value}</option>)}</select><span>{isOwnedOnly?'Ваш отряд':`${Object.keys(profile.collection).length} / ${heroes.length}`}</span>{!isOwnedOnly&&<div className="ab-list-tabs">{['Список','Галерея'].map(name=><button key={name} aria-pressed={mode===name} onClick={()=>{setMode(name);setPage(0);}}>{name}</button>)}</div>}</div>
 <div className="ab-grid">{pool.slice(current*6,current*6+6).map(hero=><HeroCard key={hero.id} hero={hero} count={profile.collection[hero.id]?.count??0} level={profile.collection[hero.id]?.level??1} isSelected={team.includes(hero.id)} onClick={()=>onSelect(hero)} onInspect={onInspect?()=>onInspect(hero):undefined}/>)}</div>
 {!pool.length&&<p className="ab-empty-collection">Нет героев с такими условиями</p>}
 <div className="ab-pager"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Предыдущие герои">‹</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="Следующие герои">›</button></div></div>
 </div>;
}
