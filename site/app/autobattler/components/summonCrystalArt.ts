import type {Rarity} from '@/lib/autobattler/catalog';
import type {ShardColor} from '../model/summonSequence';
import {add,average,dot,normalize,rotate,smoothstep,subtract,type Vec3} from '../model/crystalMath';
import {crystalFragments,fragmentFaceNormal,transformFragment,type CrystalMaterial} from '../model/crystalGeometry';
import {ritualFrame} from '../model/ritualFrame';

type Projected={x:number;y:number};
function polygon(ctx:CanvasRenderingContext2D,points:Projected[]){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(const point of points.slice(1))ctx.lineTo(point.x,point.y);
 ctx.closePath();
}
function halo(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,hue:number,alpha:number){
 if(alpha<=0)return;
 const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
 gradient.addColorStop(0,`hsla(${hue},92%,81%,${alpha})`);
 gradient.addColorStop(.24,`hsla(${hue},90%,62%,${alpha*.51})`);
 gradient.addColorStop(1,`hsla(${hue},82%,44%,0)`);
 ctx.fillStyle=gradient;ctx.fillRect(x-radius,y-radius,2*radius,2*radius);
}
function materialColor(material:CrystalMaterial,shard:ShardColor,light:number,specular:number,edge:number,energy:number,cut:boolean){
 const palette=material==='gold'?[.91,.63,.28]:material==='inlay'?[1,.89,.59]:shard==='gold'?[1,.68,.22]:[.14,.57,.84];
 return palette.map((channel,index)=>{
  const env=[.15,.23,.35][index];
  const highlight=specular*(material==='gold'?1.1:.76);
  const reflection=edge*(material==='glass'?.34:.18);
  const emission=material==='glass'?energy*(cut?.23:.025):0;
  return Math.round(Math.min(1,channel*(.18+light*.64)+env*.25+highlight+reflection+emission)*255);
 }).join(',');
}

export function drawSummonCrystal(ctx:CanvasRenderingContext2D,width:number,height:number,time:number,progress:number,shard:ShardColor,phase:string,rarity?:Rarity,environment?:CanvasImageSource){
 const frame=ritualFrame(phase,progress,shard,rarity);
 const size=Math.min(width*.30,height*.29),x=width/2,y=height*.49+Math.sin(time*.0014)*size*.025;
 const yaw=time*.00031+frame.energy*.12;
 const pitch=.055+Math.sin(time*.0005)*.028;
 const project=(point:Vec3)=>{
  const depth=4.8/(4.8-point.z);
  return {x:x+point.x*size*depth,y:y+point.y*size*depth};
 };
 ctx.clearRect(0,0,width,height);
 // The ground reflection and neutral core accumulate before the rarity tint arrives.
 ctx.save();ctx.globalCompositeOperation='screen';
 halo(ctx,x,y+size*.96,size*1.85,frame.baseHue,.05+frame.energy*.13);
 halo(ctx,x,y-size*.18,size*1.65,frame.baseHue,(.04+frame.energy*.2)*(1-frame.rarityBlend));
 halo(ctx,x,y-size*.18,size*(1.7+frame.glow*.45),frame.rareHue,frame.rarityBlend*frame.glow*.28);
 ctx.restore();
 const camera={x:0,y:0,z:4.8};
 const light=normalize({x:-.72,y:-.88,z:1.4});
 const surfaces=crystalFragments.flatMap(fragment=>{
  const vertices=transformFragment(fragment,yaw,pitch,frame.separation,frame.burst);
  const center=average(vertices);
  return fragment.faces.flatMap((face,index)=>{
   const cut=fragment.material==='glass'&&index>0;
   if(cut&&frame.separation===0&&frame.burst===0)return [];
   const points=face.map(i=>vertices[i]);
   const normal=fragmentFaceNormal(points,center);
   const facing=dot(normal,normalize(subtract(camera,average(points))));
   if(facing<=0)return [];
   return [{points,normal,depth:average(points).z,material:fragment.material,cut,facing}];
  });
 }).sort((a,b)=>a.depth-b.depth);
 const opacity=1-smoothstep(.82,1,frame.burst);
 for(const surface of surfaces){
  const center=average(surface.points);
  const diffuse=Math.max(0,dot(surface.normal,light));
  const view=normalize(subtract(camera,center));
  const half=normalize(add(light,view));
  const specular=Math.pow(Math.max(0,dot(surface.normal,half)),surface.material==='gold'?32:70);
  const edge=Math.pow(1-surface.facing,3);
  const points=surface.points.map(project);
  polygon(ctx,points);
  const tone=ctx.createLinearGradient(x-size,y-size*1.5,x+size*.9,y+size);
  tone.addColorStop(0,`rgb(${materialColor(surface.material,shard,diffuse+.12,specular,edge,frame.energy,surface.cut)})`);
  tone.addColorStop(1,`rgb(${materialColor(surface.material,shard,diffuse*.72,specular*.68,edge,frame.energy,surface.cut)})`);
  ctx.globalAlpha=opacity;ctx.fillStyle=tone;ctx.fill();
  if(environment&&surface.material==='glass'){
   ctx.save();ctx.clip();ctx.globalAlpha=opacity*.20;
   const offsetX=surface.normal.x*size*.45,offsetY=surface.normal.y*size*.25;
   ctx.drawImage(environment,offsetX-size*.24,offsetY-size*.18,width+size*.48,height+size*.36);
   ctx.restore();
  }
  if(surface.material==='gold'){
   ctx.save();ctx.clip();ctx.globalCompositeOperation='screen';
   const highlight=ctx.createLinearGradient(x-size*.7,y-size*.9,x+size*.8,y+size);
   highlight.addColorStop(0,'#76553300');highlight.addColorStop(.24,'#f9edb52b');
   highlight.addColorStop(.4,'#fff4d46b');highlight.addColorStop(.5,'#80562b00');
   highlight.addColorStop(.8,'#f7ca6e44');highlight.addColorStop(1,'#60442b00');
   ctx.fillStyle=highlight;ctx.fillRect(x-size*3,y-size*3,size*6,size*6);ctx.restore();
  }
  if(surface.material==='glass'){
   ctx.lineWidth=Math.max(.55,size*.004);
   ctx.strokeStyle=`rgba(184,231,255,${Math.min(.45,.08+specular*.48+edge*.3)})`;ctx.stroke();
   ctx.save();ctx.clip();ctx.globalCompositeOperation='screen';
   const reflection=ctx.createLinearGradient(x-size*.55,y-size,x+size*.72,y+size);
   reflection.addColorStop(0,'transparent');reflection.addColorStop(.39,'transparent');
   reflection.addColorStop(.48,`rgba(213,243,255,${.04+specular*.39+edge*.13})`);
   reflection.addColorStop(.56,'transparent');reflection.addColorStop(1,'transparent');
   ctx.fillStyle=reflection;ctx.fillRect(x-size*4,y-size*4,size*8,size*8);ctx.restore();
  }
 }
 ctx.globalAlpha=1;
 if(phase==='opening')drawRelease(ctx,x,y-size*.13,size,time,progress,frame);
 if(phase==='opening'&&rarity!=='Rare')drawRarityPrelude(ctx,x,y,size,progress,rarity,frame.rarityBlend);
 // A shared parent rotation applies to the glass, metal claws and the inlay.
 const tip=project(rotate({x:0,y:1.02,z:0},yaw,pitch));
 ctx.save();ctx.globalCompositeOperation='screen';
 halo(ctx,tip.x,tip.y,size*.23,frame.baseHue,frame.flash*.24);ctx.restore();
}

function drawRelease(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,time:number,progress:number,frame:ReturnType<typeof ritualFrame>){
 ctx.save();ctx.globalCompositeOperation='screen';
 const aperture=smoothstep(.20,.68,progress);
 for(let index=0;index<9;index++){
  const angle=index*2.39996+Math.sin(time*.0005)*.1;
  const length=size*(.44+aperture*1.7);
  const end={x:x+Math.cos(angle)*length,y:y+Math.sin(angle)*length};
  const gradient=ctx.createLinearGradient(x,y,end.x,end.y);
  gradient.addColorStop(0,`rgba(213,241,255,${aperture*(1-frame.burst)*.36})`);
  gradient.addColorStop(1,'transparent');ctx.fillStyle=gradient;
  polygon(ctx,[{x,y},{x:end.x-Math.sin(angle)*size*.024,y:end.y+Math.cos(angle)*size*.024},{x:end.x+Math.sin(angle)*size*.024,y:end.y-Math.cos(angle)*size*.024}]);ctx.fill();
 }
 halo(ctx,x,y,size*(.28+frame.flash*.9),202,frame.flash*.76);
 if(frame.burst>.05){
  for(let index=0;index<26;index++){
   const angle=index*2.39996,travel=size*frame.burst*(.8+index%6*.31);
   const px=x+Math.cos(angle)*travel,py=y+Math.sin(angle)*travel+size*frame.burst*frame.burst*.3;
   ctx.fillStyle=`rgba(220,246,255,${(1-frame.burst)*.64})`;
   polygon(ctx,[{x:px,y:py-size*.013},{x:px+size*.02,y:py+size*.011},{x:px-size*.018,y:py+size*.014}]);ctx.fill();
  }
 }
 ctx.restore();
}

function drawRarityPrelude(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,progress:number,rarity:Rarity|undefined,blend:number){
 const envelope=blend*(1-smoothstep(.84,1,progress));
 if(envelope<=0)return;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=envelope;
 if(rarity==='Epic'){
  ctx.lineWidth=Math.max(1.4,size*.012);
  for(const side of [-1,1]){
   const gradient=ctx.createLinearGradient(x-size,y-size,x+size,y+size);
   gradient.addColorStop(0,'transparent');gradient.addColorStop(.45,'#a45ce1');gradient.addColorStop(.62,'#ebd7ff');gradient.addColorStop(1,'transparent');
   ctx.strokeStyle=gradient;ctx.beginPath();
   for(let step=0;step<=64;step++){
    const t=step/64,angle=t*7+progress*4+(side===1?0:Math.PI);
    const point={x:x+Math.cos(angle)*size*(.8-t*.5),y:y+size*(1.1-t*2.2)+Math.sin(angle)*size*.11};
    if(step===0)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
   }
   ctx.stroke();
  }
 }else{
  const column=ctx.createLinearGradient(x,0,x,y+size*.6);
  column.addColorStop(0,'transparent');column.addColorStop(.58,'#ffd18060');column.addColorStop(1,'#fff0ac');
  const width=size*(.02+.16*smoothstep(.23,.67,progress));
  polygon(ctx,[{x:x-width*.44,y:0},{x:x+width*.44,y:0},{x:x+width,y:y+size*.52},{x:x-width,y:y+size*.52}]);ctx.fillStyle=column;ctx.fill();
  const floor=y+size*.98;
  ctx.strokeStyle='#f7c779';ctx.lineWidth=size*.009;
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3+progress*.5;
   const sx=x+Math.cos(angle)*size*.98,sy=floor+Math.sin(angle)*size*.22,span=size*.09;
   polygon(ctx,[{x:sx,y:sy-span*.35},{x:sx+span,y:sy},{x:sx,y:sy+span*.35},{x:sx-span,y:sy}]);ctx.stroke();
  }
  halo(ctx,x,floor,size*1.8,41,.3*envelope);
 }
 ctx.restore();
}
