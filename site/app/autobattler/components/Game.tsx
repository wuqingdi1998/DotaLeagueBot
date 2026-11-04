'use client';
import {useCallback,useState,useEffect} from 'react';
import {type Hero} from '@/lib/autobattler/catalog';
import {useGame} from '../hooks/useGame';
import HeroProfile from './HeroProfile';
import HeroGallery from '../sections/HeroGallery';
import TeamScene from '../sections/TeamScene';
import CampaignMap from '../sections/CampaignMap';
import SummonScene,{pendingKey} from '../sections/SummonScene';
import BattleScene from './BattleScene';
import DeveloperPanel from '../admin/DeveloperPanel';
import type {GameResponse} from '../services/client';
const navigation=[['Кампания','⚑'],['Герои','♜'],['Команда','♟'],['Призыв','✦']];
export default function Game(){
 const {data,error,isBusy,act}=useGame();const profile=data?.profile;const [tab,setTab]=useState('Кампания');const [selected,setSelected]=useState<Hero>();const [isFinished,setFinished]=useState(false);const [battleData,setBattleData]=useState<GameResponse>();const [replay,setReplay]=useState(0);const [preparedStage,setPreparedStage]=useState<number>();
 const [isPreview,setPreview]=useState(false);
 const [isRevealing,setRevealing]=useState(false);
 useEffect(()=>{if(localStorage.getItem(pendingKey)){const timer=setTimeout(()=>{setTab('Призыв');setRevealing(true);},0);return()=>clearTimeout(timer);}},[]);
 const finish=useCallback(()=>setFinished(true),[]);
 async function run(input:Record<string,unknown>){const result=await act(input);if(result?.battle){setPreview(false);setBattleData(result);setFinished(false);setReplay(value=>value+1);setTab('Бой');}return result;}
 return <main className="ab-game" onContextMenu={event=>event.preventDefault()}><div className="ab-world"/><header className="ab-header"><button className="ab-brand" disabled={isRevealing} onClick={()=>setTab('Кампания')}><small>LINKEN’S SPHERE</small><strong>HEROES <span>COMPENDIUM</span></strong></button><div className="ab-header-actions"><strong className="ab-tickets">✦ {profile?.tickets??'…'} синих · {profile?.goldenShards??0} золотых</strong>{data?.isAdmin&&<button aria-label="Разработчик" disabled={isRevealing} onClick={()=>setTab('Разработчик')}>⚙</button>}<a href="/" aria-label="Вернуться на сайт LSE">×</a></div></header>
 {error&&<div className="ab-error" role="alert">{error}<button onClick={()=>void act()}>Обновить данные</button></div>}
 <div className={`ab-scene ab-scene-${tab}`} key={tab}>
 {!profile?<div className="ab-loading">✦<p>Открываем врата мира…</p></div>:<>
 {tab==='Герои'&&<section className="ab-collection"><HeroGallery profile={profile} onSelect={setSelected}/></section>}
 {tab==='Команда'&&<TeamScene profile={profile} stageId={preparedStage} onInspect={setSelected} onSave={team=>run({action:'team',team})} onBattle={stage=>void run({action:'battle',stage})}/>}
 {tab==='Кампания'&&<CampaignMap profile={profile} onBattle={stage=>{setPreparedStage(stage);setTab('Команда');}}/>}
 {tab==='Призыв'&&<SummonScene data={data} onSummon={run} onLockChange={setRevealing}/>}
 {tab==='Бой'&&battleData?.battle&&<section className="ab-battle-scene"><BattleScene key={replay} battle={battleData.battle} onFinish={finish}/>{isFinished&&<div className={`ab-battle-result ${battleData.battle.winner===0?'is-victory':'is-defeat'}`}><small>СРАЖЕНИЕ ЗАВЕРШЕНО</small><h2>{battleData.battle.winner===0?'ПОБЕДА':battleData.battle.winner===1?'ПОРАЖЕНИЕ':'НИЧЬЯ'}</h2><p>{isPreview?'Образец анимаций · награды не начисляются':`✦ ${battleData.reward??0} синих осколков · ❋ ${battleData.experienceReward??0} опыта`}</p><button className="ab-primary" onClick={()=>setTab('Кампания')}>К кампании</button><button onClick={()=>{setFinished(false);setReplay(value=>value+1);}}>Повторить запись</button></div>}</section>}
 {tab==='Разработчик'&&data.isAdmin&&<div className="ab-admin-scene"><DeveloperPanel profile={profile} data={data} act={input=>void run(input)} onPreview={battle=>{setPreview(true);setBattleData({profile,battle});setFinished(false);setReplay(value=>value+1);setTab('Бой');}} onReplay={entry=>{setPreview(false);setBattleData({profile,...entry.result});setFinished(false);setReplay(value=>value+1);setTab('Бой');}}/></div>}
 </>}
 </div><nav className="ab-navigation" aria-label="Разделы игры">{navigation.map(([name,icon])=><button key={name} aria-label={name} disabled={isRevealing} aria-current={tab===name?'page':undefined} onClick={()=>{setPreparedStage(undefined);setTab(name);}}><span>{icon}</span>{name}</button>)}</nav>
 {selected&&profile&&<HeroProfile hero={selected} profile={profile} isBusy={isBusy} onLevel={()=>void run({action:'level',hero:selected.id})} onChange={setSelected} onClose={()=>setSelected(undefined)}/>}{isBusy&&<div className="ab-saving" role="status">Связь со сферой…</div>}
 </main>;
}
