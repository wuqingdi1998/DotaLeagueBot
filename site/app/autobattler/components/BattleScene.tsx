'use client';
import { useEffect,useRef,useState } from 'react';
import type { Battle } from '@/lib/autobattler/simulation';
import {createArena,type BattleProgress} from './createArena';
import {createCombatAudio,type CombatAudio} from '../services/combatAudio';
export default function BattleScene({battle,onFinish}:{battle:Battle;onFinish:()=>void}){
  const host=useRef<HTMLDivElement>(null);const control=useRef({isPaused:false,speed:1,isMuted:false});
  const audio=useRef<CombatAudio|undefined>(undefined);
  const [isMuted,setMuted]=useState(false);
  const [progress,setProgress]=useState<BattleProgress>({wave:1,count:battle.waves?3:1,phase:'entry'});
  const [isPaused,setPaused]=useState(false);const [speed,setSpeed]=useState(1);const [error,setError]=useState('');
  useEffect(()=>{control.current={isPaused,speed,isMuted};},[isPaused,speed,isMuted]);
  useEffect(()=>{const timer=setTimeout(()=>setMuted(localStorage.getItem('ab-combat-muted')==='true'),0);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{
    let isDisposed=false;let game:import('phaser').Game|undefined;let observer:ResizeObserver|undefined;
    import('phaser').then(({default:Phaser})=>{
      if(isDisposed||!host.current)return;
      audio.current=createCombatAudio();
      const Arena=createArena(Phaser,battle,control,onFinish,audio.current,setProgress);
      const isPortrait=host.current.clientWidth<650;
      const height=isPortrait?800:600;
      const width=Math.round(host.current.clientWidth/Math.max(1,host.current.clientHeight)*height);
      game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:Math.max(320,width),height,backgroundColor:'#101e34',
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Arena,audio:{noAudio:true},render:{antialias:true}});
      observer=new ResizeObserver(()=>game?.scale.refresh());observer.observe(host.current);
    }).catch(()=>setError('Не удалось загрузить арену. Обновите страницу.'));
    return()=>{isDisposed=true;observer?.disconnect();game?.destroy(true);audio.current?.dispose();};
  },[battle,onFinish]);
  const phaseName={entry:'Отряд готовится',fight:'Сражение',march:'Переход к следующей волне',boss:'Появление босса'}[progress.phase];
  return <section><div className="ab-toolbar"><button onClick={()=>{setPaused(!isPaused);if(isPaused)void audio.current?.resume();}}>{isPaused?'Продолжить':'Пауза'}</button><button onClick={()=>setSpeed(speed===1?2:1)}>Скорость ×{speed}</button><button aria-pressed={!isMuted} onClick={()=>{setMuted(!isMuted);localStorage.setItem('ab-combat-muted',String(!isMuted));if(isMuted)void audio.current?.resume();}}>{isMuted?'Звук выключен':'Звук включён'}</button><strong aria-live="polite">{battle.waves?`Волна ${progress.wave}/${progress.count}`:'Автобой'} · {phaseName}</strong></div><div ref={host} className="ab-arena" data-battle-wave={progress.wave} data-battle-phase={progress.phase}/>{error&&<p role="alert">{error}</p>}</section>;
}
