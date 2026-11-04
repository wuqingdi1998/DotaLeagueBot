export type Formation=(string|null)[];
export const workshopSlots=[
 {x:66,y:50,mobileX:36,mobileY:33},{x:84,y:62,mobileX:68,mobileY:33},
 {x:16,y:52,mobileX:18,mobileY:78},{x:32,y:66,mobileX:50,mobileY:78},{x:48,y:52,mobileX:82,mobileY:78},
] as const;
export const preparationSlots=workshopSlots.map((point,index)=>({x:point.mobileX/2,y:index<2?36:78}));
export function assignPosition(team:Formation,position:number,hero:string):Formation{
  if(position<0||position>4)throw new Error('Неизвестная позиция');
  const next=Array.from({length:5},(_,index)=>team[index]??null);
  const previous=next.findIndex((id,index)=>id===hero&&index!==position);
  if(previous>=0)next[previous]=next[position];
  next[position]=hero;
  return next;
}
