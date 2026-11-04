import type {Battle} from '@/lib/autobattler/simulation';
import {formationPoint} from '@/lib/autobattler/formationGeometry';

export type CombatEvent=Battle['events'][number];
export const combatTiming={windup:260,recovery:340,castWindup:420,castRecovery:650,death:1050,opening:850,bossOpening:1400};
export const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};

/** Every swing peaks at the authoritative event time, including replay at a different speed. */
export function attackPose(time:number,impact:number,isCast=false){
 const age=time-impact,windup=isCast?combatTiming.castWindup:combatTiming.windup;
 if(age < -windup||age>(isCast?combatTiming.castRecovery:combatTiming.recovery))return 0;
 if(age<-80)return -.48*smooth((age+windup)/(windup-80));
 if(age<0)return -.48+1.48*smooth((age+80)/80);
 return 1-smooth(age/(isCast?combatTiming.castRecovery:combatTiming.recovery));
}

export function battleFrame(battle:Battle,time:number){
 let low=0,high=battle.frames.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(battle.frames[mid].time<=time)low=mid;else high=mid-1;}
 const current=battle.frames[low],next=battle.frames[Math.min(low+1,battle.frames.length-1)];
 const fraction=clamp((time-current.time)/Math.max(1,next.time-current.time));
 const offset=battle.waves?.findLast(wave=>wave.start<=current.time)?.start??0;
 const units=current.units.map((unit,index)=>({...unit,x:unit.x+(next.units[index].x-unit.x)*fraction,y:unit.y+(next.units[index].y-unit.y)*fraction,
  shieldUntil:unit.shieldUntil?unit.shieldUntil+offset:0,stunnedUntil:unit.stunnedUntil?unit.stunnedUntil+offset:0,
  immuneUntil:unit.immuneUntil?unit.immuneUntil+offset:0,hasteUntil:unit.hasteUntil?unit.hasteUntil+offset:0,
  weakUntil:unit.weakUntil?unit.weakUntil+offset:0,poisonUntil:unit.poisonUntil?unit.poisonUntil+offset:0,
 }));
 for(const event of battle.events){
  if(event.time<=current.time||event.time>time||!['damage','heal'].includes(event.kind))continue;
  const target=units.find(unit=>unit.id===event.target);
  if(target)target.hp=event.health??(event.kind==='heal'?Math.min(target.maxHp,target.hp+event.amount):Math.max(0,target.hp-event.amount));
 }
 return {units,next};
}

export function wavePresentation(battle:Battle,time:number){
 const waves=battle.waves??[{start:0,end:battle.duration}];
 const index=Math.max(0,waves.findLastIndex(wave=>wave.start<=time));
 const wave=waves[index],next=waves[index+1];
 const isMarching=!!next&&time>wave.end;
 const progress=isMarching?clamp((time-wave.end)/(next.start-wave.end)):0;
 const isBoss=index===2;
 const bossId=isBoss?[...battle.frames[0].units].filter(unit=>unit.side===1).sort((a,b)=>b.maxHp-a.maxHp)[0]?.id:undefined;
 return {index,count:battle.waves?3:1,isMarching,progress,isBoss,bossId,
  curtain:isMarching?smooth((progress-.82)/.18):1-smooth((time-wave.start)/420),
  environmentOffset:index*.045+(isMarching?smooth(progress)*.045:0),
 };
}

export function actorAction(events:CombatEvent[],id:string,time:number){
 const cast=events.find(event=>event.actor===id&&['basic','skill'].includes(event.kind)&&event.time>=time-combatTiming.castRecovery&&event.time<=time+combatTiming.castWindup);
 const attack=events.find(event=>event.actor===id&&event.kind==='damage'&&event.delivery==='attack'&&event.time>=time-combatTiming.recovery&&event.time<=time+combatTiming.windup);
 const hit=events.findLast(event=>event.target===id&&event.kind==='damage'&&event.amount>0&&event.time<=time&&event.time>time-220);
 return {attack:attack?attackPose(time,attack.time):0,cast:cast?attackPose(time,cast.time,true):0,
  hit:hit?Math.sin(clamp((time-hit.time)/220)*Math.PI):0,isFlashing:!!hit&&time-hit.time<55,isUltimate:cast?.kind==='skill'};
}

/** Portrait screens spread projected feet to keep silhouettes readable without changing combat. */
export function spreadPortraitFormation(units:Battle['units'],width:number,height:number){
 if(width>=800)return units;
 const points=units.map(unit=>({x:unit.x/1000*width,y:(.27+unit.y/500*.63)*height}));
 for(let pass=0;pass<8;pass++)for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
  if(units[i].hp<=0||units[j].hp<=0)continue;
  const a=points[i],b=points[j],dx=(b.x-a.x)/76,dy=(b.y-a.y)/72,distance=Math.hypot(dx,dy);
  if(distance>=1)continue;
  const angle=distance>.001?Math.atan2(dy,dx):i%2?Math.PI/2:0;
  const push=(1-distance)*.52;
  a.x-=Math.cos(angle)*push*76;b.x+=Math.cos(angle)*push*76;
  a.y-=Math.sin(angle)*push*72;b.y+=Math.sin(angle)*push*72;
  for(const point of [a,b]){point.x=Math.max(55,Math.min(width-55,point.x));point.y=Math.max(height*.34,Math.min(height*.91,point.y));}
 }
 return units.map((unit,index)=>({...unit,x:points[index].x/width*1000,y:(points[index].y/height-.27)/.63*500}));
}

export function marchingFormation(units:Battle['units'],progress:number){
 const survivors=units.filter(unit=>unit.side===0&&unit.hp>0);
 const anchor=Math.min(720,Math.max(315,...survivors.map(unit=>unit.x))),gather=smooth(progress/.65);
 return units.map(unit=>{
  if(unit.side!==0||unit.hp<=0)return unit;
  const slot=formationPoint(Number(unit.id.split('-')[1]),0);
  const targetX=anchor+slot.x-315;
  return {...unit,x:unit.x+(targetX-unit.x)*gather+progress*120,y:unit.y+(slot.y-unit.y)*gather};
 });
}
