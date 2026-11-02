'use client';
import {useState} from 'react';
import {heroes,type Hero} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import HeroCard,{roleNames} from '../components/HeroCard';
export default function HeroGallery({profile,onSelect,isOwnedOnly=false}:{profile:Profile;onSelect:(hero:Hero)=>void;isOwnedOnly?:boolean}){
  const [page,setPage]=useState(0);const [role,setRole]=useState('Все');const [rarity,setRarity]=useState('Все');
  const pool=heroes.filter(hero=>(role==='Все'||hero.role===role)&&(rarity==='Все'||hero.rarity===rarity)&&(!isOwnedOnly||profile.collection[hero.id]));
  const pages=Math.max(1,Math.ceil(pool.length/6));const current=Math.min(page,pages-1);
  return <div className="ab-gallery"><div className="ab-gallery-tools"><select aria-label="Класс героя" value={role} onChange={event=>{setRole(event.target.value);setPage(0);}}><option value="Все">Все классы</option>{Object.entries(roleNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><select aria-label="Редкость героя" value={rarity} onChange={event=>{setRarity(event.target.value);setPage(0);}}><option value="Все">Все редкости</option>{['Rare','Epic','Legendary'].map(value=><option key={value}>{value}</option>)}</select><span>{isOwnedOnly?'Ваши герои':'Коллекция'} · {pool.length}</span></div><div className="ab-grid">{pool.slice(current*6,current*6+6).map(hero=><HeroCard key={hero.id} hero={hero} count={profile.collection[hero.id]?.count??0} onClick={()=>onSelect(hero)}/>)}</div><div className="ab-pager"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Предыдущие герои">‹</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="Следующие герои">›</button></div></div>;
}
