'use client';
import {useEffect,useRef} from 'react';
import type {Rarity} from '@/lib/autobattler/catalog';
import {summonTiming,type ShardColor} from '../model/summonSequence';
import {drawSummonCrystal} from './summonCrystalArt';

export function SummonShrine({phase,shard,rarity,compact=false}:{phase:string;shard:ShardColor;rarity?:Rarity;compact?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const surface=canvas.current,ctx=surface?.getContext('2d');
  if(!surface||!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const environment=new Image();environment.src='/autobattler/summon-shrine.webp';
  const started=performance.now();let frame=0;
  function draw(time:number){
   const bounds=surface!.getBoundingClientRect(),density=Math.min(devicePixelRatio||1,2);
   const width=Math.max(1,Math.round(bounds.width*density)),height=Math.max(1,Math.round(bounds.height*density));
   if(surface!.width!==width||surface!.height!==height){surface!.width=width;surface!.height=height;}
   const duration=phase==='opening'&&rarity?summonTiming[rarity]:2200;
   drawSummonCrystal(ctx!,width,height,reduced?0:time,reduced?0:Math.min(1,(time-started)/duration),shard,phase,rarity,environment.complete&&environment.naturalWidth?environment:undefined);
   if(!reduced)frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  return ()=>cancelAnimationFrame(frame);
 },[phase,shard,rarity]);
 return <div className={`ab-shrine-stage ab-shrine-${phase} ${compact?'is-compact':''}`} aria-hidden="true"><canvas ref={canvas}/></div>;
}
