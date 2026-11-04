import {useEffect,useRef,useState,type PointerEvent,type MouseEvent,type KeyboardEvent} from 'react';
import {assignPosition,type Formation} from '../model/formation';

/** One pointer flow supports mouse, pen and touch, including returning heroes to the roster. */
export function useFormationDrag(team:Formation,onChange:(next:Formation)=>void,onInspect:(id:string)=>void){
 const start=useRef<{id:string;x:number;y:number;pointer:number;isOnField:boolean}|null>(null);
 const moved=useRef(false),suppressClick=useRef(false),hold=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [drag,setDrag]=useState<{id:string;x:number;y:number}|null>(null);
 function clearHold(){clearTimeout(hold.current);hold.current=undefined;}
 useEffect(()=>()=>clearTimeout(hold.current),[]);
 function down(event:PointerEvent<HTMLElement>){
  if(event.button!==0)return;
  suppressClick.current=false;
  const source=(event.target as Element).closest<HTMLElement>('[data-formation-hero]');
  const id=source?.dataset.formationHero;if(!id)return;
  clearHold();start.current={id,x:event.clientX,y:event.clientY,pointer:event.pointerId,isOnField:source.dataset.formationSlot!==undefined};moved.current=false;
  hold.current=setTimeout(()=>{start.current=null;suppressClick.current=true;onInspect(id);},550);
 }
 function move(event:PointerEvent<HTMLElement>){
  const source=start.current;if(!source||source.pointer!==event.pointerId)return;
  if(!moved.current&&Math.hypot(event.clientX-source.x,event.clientY-source.y)<8)return;
  clearHold();moved.current=true;event.currentTarget.setPointerCapture(event.pointerId);
  setDrag({id:source.id,x:event.clientX,y:event.clientY});
 }
 function up(event:PointerEvent<HTMLElement>){
  clearHold();const source=start.current;if(!source||source.pointer!==event.pointerId)return;
  if(moved.current){
   const target=document.elementFromPoint(event.clientX,event.clientY);
   const slot=target?.closest<HTMLElement>('[data-formation-slot]');
   if(slot)onChange(assignPosition(team,Number(slot.dataset.formationSlot),source.id));
   else if(source.isOnField&&target?.closest('.ab-roster'))onChange(team.map(id=>id===source.id?null:id));
   suppressClick.current=true;
  }
  start.current=null;setDrag(null);
 }
 function click(event:MouseEvent<HTMLElement>){if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}
 function inspectKey(event:KeyboardEvent<HTMLElement>){if(event.key!=='F2')return;const id=(event.target as Element).closest<HTMLElement>('[data-formation-hero]')?.dataset.formationHero;if(id){event.preventDefault();onInspect(id);}}
 return {drag,handlers:{onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerLeave:()=>{if(!moved.current){clearHold();start.current=null;}},onPointerCancel:()=>{clearHold();start.current=null;setDrag(null);},onClickCapture:click,onKeyDown:inspectKey}};
}
