'use client';
import {useEffect,useRef,useState} from 'react';
import {heroes,type Hero} from '@/lib/autobattler/catalog';
import type {Profile} from '@/lib/autobattler/progression';
import HeroCard from '../components/HeroCard';
import HeroLibrary from './HeroLibrary';
function OwnedGallery({profile,onSelect,onInspect,isOwnedOnly=false,team=[]}:{profile:Profile;onSelect:(hero:Hero)=>void;onInspect?:(hero:Hero)=>void;isOwnedOnly?:boolean;team?:(string|null)[]}){
 const [page,setPage]=useState(0),[rarity,setRarity]=useState('Все');
 const grid=useRef<HTMLDivElement>(null);
 const [columns,setColumns]=useState(3);
 useEffect(()=>{
  if(!isOwnedOnly||!grid.current)return;
  const observer=new ResizeObserver(([entry])=>setColumns(Math.max(3,Math.min(12,Math.floor(entry.contentRect.width/74)))));
  observer.observe(grid.current);
  return ()=>observer.disconnect();
 },[isOwnedOnly]);
 const pageSize=columns*2;
 const pool=heroes.filter(hero=>(rarity==='Все'||hero.rarity===rarity)&&profile.collection[hero.id]);
 const pages=Math.max(1,Math.ceil(pool.length/pageSize)),current=Math.min(page,pages-1);
 return <div className={`ab-gallery ${isOwnedOnly?'ab-roster':'ab-library'}`}>
 <div className="ab-gallery-main"><div className="ab-gallery-tools"><select aria-label="Редкость героя" value={rarity} onChange={event=>{setRarity(event.target.value);setPage(0);}}><option value="Все">Все редкости</option>{['Rare','Epic','Legendary'].map(value=><option key={value}>{value}</option>)}</select><span>{isOwnedOnly?'Ваш отряд':`${Object.keys(profile.collection).length} / ${heroes.length}`}</span></div>
 <div ref={grid} className="ab-grid" style={isOwnedOnly?{gridTemplateColumns:`repeat(${Math.min(columns,Math.max(1,Math.ceil(pool.length/2)))},minmax(0,1fr))`,gridTemplateRows:"repeat(2,minmax(0,1fr))"}:undefined}>{pool.slice(current*pageSize,(current+1)*pageSize).map(hero=><HeroCard key={hero.id} hero={hero} count={profile.collection[hero.id]?.count??0} level={profile.collection[hero.id]?.level??1} isSelected={team.includes(hero.id)} onClick={()=>onSelect(hero)} onInspect={onInspect?()=>onInspect(hero):undefined}/>)}</div>
 {!pool.length&&<p className="ab-empty-collection">Нет героев с такими условиями</p>}
 <div className="ab-pager"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Предыдущие герои">‹</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="Следующие герои">›</button></div></div>
 </div>;
}

export default function HeroGallery(props:Parameters<typeof OwnedGallery>[0]){
 return props.isOwnedOnly?<OwnedGallery {...props}/>:<HeroLibrary profile={props.profile} onSelect={props.onSelect}/>;
}
