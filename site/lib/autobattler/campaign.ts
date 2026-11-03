import {rules} from './catalog';
import {simulate,type Battle,type Unit} from './simulation';

/** Three authoritative encounters preserve survivors and award the stage only after the last wave. */
export function simulateCampaign(team:string[],enemies:string[],seed:number,scale:number,levels:Record<string,number>={}):Battle{
 const result:Battle={version:rules.version,seed,frames:[],events:[],winner:1,duration:0,units:[],waves:[]};
 let offset=0,survivors:Unit[]|undefined;
 for(let wave=0;wave<3;wave++){
  const fight=simulate(team,enemies,seed+wave,scale*(.8+wave*.1),levels,{},survivors);
  if(fight.winner===0&&fight.units.some(unit=>unit.side===1&&unit.hp>0))fight.winner=-1;
  result.waves!.push({start:offset,end:offset+fight.duration});
  result.frames.push(...fight.frames.map(frame=>({...frame,time:frame.time+offset})));
  result.events.push(...fight.events.map(event=>({...event,time:event.time+offset})));
  result.units=fight.units;result.duration=offset+fight.duration;result.winner=fight.winner;
  if(fight.winner!==0||wave===2)break;
  survivors=fight.units;
  const nextStart=Math.ceil(result.duration/200)*200+3200;
  for(let time=Math.ceil((result.duration+1)/200)*200;time<nextStart;time+=200){
   const progress=(time-result.duration)/(nextStart-result.duration);
   result.frames.push({time,units:survivors.map(unit=>({...unit,x:unit.side?unit.x:unit.x+progress*160}))});
  }
  offset=nextStart;
 }
 return result;
}
