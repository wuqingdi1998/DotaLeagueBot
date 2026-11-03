import {useRef,useState,type PointerEvent,type MouseEvent} from 'react';
import {assignPosition,type Formation} from '../model/formation';

/** One pointer flow supports mouse, pen and touch, including returning heroes to the roster. */
export function useFormationDrag(team:Formation,onChange:(next:Formation)=>void){
 const start=useRef<{id:string;x:number;y:number;pointer:number}|null>(null);
 const moved=useRef(false),suppressClick=useRef(false);
 const [drag,setDrag]=useState<{id:string;x:number;y:number}|null>(null);
 function down(event:PointerEvent<HTMLElement>){
  if(event.button!==0)return;
  const source=(event.target as Element).closest<HTMLElement>('[data-formation-hero]');
  const id=source?.dataset.formationHero;if(!id)return;
  start.current={id,x:event.clientX,y:event.clientY,pointer:event.pointerId};moved.current=false;
 }
 function move(event:PointerEvent<HTMLElement>){
  const source=start.current;if(!source||source.pointer!==event.pointerId)return;
  if(!moved.current&&Math.hypot(event.clientX-source.x,event.clientY-source.y)<8)return;
  moved.current=true;event.currentTarget.setPointerCapture(event.pointerId);
  setDrag({id:source.id,x:event.clientX,y:event.clientY});
 }
 function up(event:PointerEvent<HTMLElement>){
  const source=start.current;if(!source)return;
  if(moved.current){
   const target=document.elementFromPoint(event.clientX,event.clientY);
   const slot=target?.closest<HTMLElement>('[data-formation-slot]');
   if(slot)onChange(assignPosition(team,Number(slot.dataset.formationSlot),source.id));
   else if(target?.closest('.ab-roster'))onChange(team.map(id=>id===source.id?null:id));
   suppressClick.current=true;
  }
  start.current=null;setDrag(null);
 }
 function click(event:MouseEvent<HTMLElement>){if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}
 return {drag,handlers:{onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{start.current=null;setDrag(null);},onClickCapture:click}};
}
