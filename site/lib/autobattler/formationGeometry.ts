const slots = [
  {x:315,y:142},{x:275,y:329},
  {x:185,y:104},{x:145,y:245},{x:125,y:386},
] as const;

export function formationPoint(index:number,side:number){
  const point=slots[index];
  return {x:side===0?point.x:1000-point.x,y:point.y};
}

export function projectFormation(point:{x:number;y:number}){
  return {x:point.x/10,y:27+point.y/500*63};
}
