'use client';
import {useState,type CSSProperties} from 'react';
import {heroById,stages,type Hero} from '@/lib/autobattler/catalog';
import {heroStats} from '@/lib/autobattler/abilities';
import type {Profile} from '@/lib/autobattler/progression';
import {assignPosition,workshopSlots,type Formation} from '../model/formation';
import {HeroPortrait,roleIcons} from '../components/HeroCard';
import {useFormationDrag} from '../hooks/useFormationDrag';
import HeroGallery from './HeroGallery';
import {formationPoint,projectFormation} from '@/lib/autobattler/formationGeometry';
export default function TeamScene({profile,stageId,onSave,onBattle,onInspect}:{profile:Profile;stageId?:number;onInspect:(hero:Hero)=>void;onSave:(team:string[])=>Promise<unknown>;onBattle:(stage:number)=>void}){
 const [team,setTeam]=useState<Formation>(Array.from({length:5},(_,index)=>profile.team[index]??null));
 const [slot,setSlot]=useState<number|null>(null),[isSaved,setSaved]=useState(false),[isSaving,setSaving]=useState(false);
 const {drag,handlers}=useFormationDrag(team,next=>{setTeam(next);setSaved(false);setSlot(null);},id=>onInspect(heroById[id]));
 const stage=stages.find(item=>item.id===stageId)??stages[0],complete=team.every((id):id is string=>!!id);
 const power=(ids:Formation,isEnemy=false)=>Math.round(ids.reduce((sum,id)=>{if(!id)return sum;const stats=heroStats(heroById[id],isEnemy?1:profile.collection[id]?.level??1);return sum+stats.hp/10+stats.attack+stats.defense;},0)*(isEnemy?stage.scale:1));
 async function save(shouldBattle=false){if(!complete||isSaving)return;setSaving(true);try{const result=await onSave(team);if(result){setSaved(true);if(shouldBattle)onBattle(stage.id);}}finally{setSaving(false);}}
 return <section className={`ab-team-scene ${drag?"is-dragging":""}`} {...handlers}>{drag&&<div className="ab-drag-hero" style={{left:drag.x,top:drag.y}}><HeroPortrait hero={heroById[drag.id]} combat/></div>}<header className="ab-team-heading"><div><small>{stageId?`ПОДГОТОВКА · ЭТАП ${stage.id}`:"ВАШ ОТРЯД"}</small><h2>{stageId?stage.name:"Команда"}</h2></div><div className="ab-power"><strong>{power(team)}</strong>{stageId&&<><span>VS</span><strong>{power(stage.team,true)}</strong></>}</div></header>
 <div className={`ab-tactics-field ${stageId?"":"ab-team-workshop"}`} style={stageId?{backgroundImage:`linear-gradient(0deg,#07162577,#07162511),url("/autobattler/chapter-${stage.chapter}.webp")`}:undefined} aria-label="Поле расстановки">
 <span className="ab-field-side ab-side-player">ВАШ ОТРЯД{!stageId&&" · 2 ПЕРЕДНИХ / 3 ЗАДНИХ ПОЗИЦИИ"}</span>{stageId&&<span className="ab-field-side ab-side-enemy">ПРОТИВНИКИ</span>}
 {(stageId?[team,stage.team]:[team]).map((side,sideIndex)=>side.map((id,index)=>{
 const point=formationPoint(index,sideIndex),{x}=projectFormation(point),position=stageId?{x,y:10+point.y/500*90}:workshopSlots[index],style={'--unit-x':`${position.x}%`,'--unit-y':`${position.y}%`,'--mobile-unit-x':`${workshopSlots[index].mobileX}%`,'--mobile-unit-y':`${workshopSlots[index].mobileY}%`,zIndex:Math.round(position.y)} as CSSProperties;
 const content=<>{id?<><span className="ab-unit-level">{roleIcons[heroById[id].role]} Ур. {sideIndex?1:profile.collection[id]?.level??1}</span><HeroPortrait hero={heroById[id]} combat/><small>{heroById[id].name}</small></>:<span className="ab-empty-unit">＋</span>}</>;
 return sideIndex?<div key={`enemy-${index}`} style={style} className="ab-field-unit ab-enemy-unit">{content}</div>:<button key={index} data-formation-slot={index} data-formation-hero={id??undefined} style={style} className={`ab-field-unit ab-field-slot ${slot===index?'is-selected':''}`} aria-label={`Позиция ${index+1}, ${index<2?'передняя':'задняя'}`} aria-pressed={slot===index} onClick={()=>{setSlot(slot===index?null:index);setSaved(false);}}>{content}</button>;
 }))}
 </div>
 <HeroGallery profile={profile} team={team} isOwnedOnly onSelect={hero=>{const position=slot??team.findIndex(id=>!id);if(position<0)return;setTeam(assignPosition(team,position,hero.id));setSlot(null);setSaved(false);}}/>
 <footer className="ab-team-actions"><span role="status">{isSaved?'Состав сохранён':''}</span><button disabled={!complete||isSaving} onClick={()=>void save()}>Сохранить</button>{stageId&&<button className="ab-primary" disabled={!complete||isSaving} onClick={()=>void save(true)}>Начать бой</button>}</footer>
 </section>;
}
