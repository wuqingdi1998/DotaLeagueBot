import type {Rarity} from '@/lib/autobattler/catalog';
import type {ShardColor} from '../model/summonSequence';

type Vertex={x:number;y:number;z:number};
const sides=7;
const rings=[[-.78,.24],[-.18,.43],[.56,.29]] as const;
const vertices:Vertex[]=[
 {x:-.09,y:-1.54,z:.035},
 ...rings.flatMap(([y,radius],ring)=>Array.from({length:sides},(_,i)=>{
  const angle=i*Math.PI*2/sides;
  const variation=1+.09*Math.sin(i*4.7+ring);
  return {x:Math.cos(angle)*radius*variation+.04*ring,y:y+.085*Math.sin(i*3.9),z:Math.sin(angle)*radius*variation};
 })),
 {x:.075,y:1.02,z:0},
];
const faces:number[][]=[];
for(let i=0;i<sides;i++){
 const a=1+i,b=1+(i+1)%sides;
 faces.push([0,a,b],[a,a+sides,b+sides,b],[a+sides,a+2*sides,b+2*sides],[a+sides,b+2*sides,b+sides],[a+2*sides,vertices.length-1,b+2*sides]);
}

function polygon(ctx:CanvasRenderingContext2D,points:{x:number;y:number}[]){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
 ctx.closePath();
}

function halo(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,hue:number,strength:number){
 const light=ctx.createRadialGradient(x,y,0,x,y,radius);
 light.addColorStop(0,`hsla(${hue},95%,75%,${strength})`);
 light.addColorStop(.35,`hsla(${hue},88%,58%,${strength*.48})`);
 light.addColorStop(1,`hsla(${hue},80%,45%,0)`);
 ctx.fillStyle=light;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}

export function drawSummonCrystal(ctx:CanvasRenderingContext2D,width:number,height:number,time:number,progress:number,shard:ShardColor,phase:string,rarity?:Rarity){
 const size=Math.min(width*.30,height*.29);
 const x=width/2,y=height*.49+Math.sin(time*.0018)*size*.04;
 const charging=phase==='charge',opening=phase==='opening';
 const hue=shard==='gold'?40:204;
 const revealHue=rarity==='Legendary'?42:rarity==='Epic'?280:hue;
 const energy=charging?progress*.62:opening?.62+progress*.38:0;
 const fracture=opening?Math.max(0,(progress-.57)/.43):0;
 const spin=time*.00055+energy*.42;
 const turn=Math.cos(spin),side=Math.sin(spin);
 const body=vertices.map(p=>({x:p.x*turn-p.z*side,y:p.y,z:p.x*side+p.z*turn}));
 const project=(p:Vertex)=>{
  const depth=4.2/(4.2-p.z);
  return {x:x+(p.x+p.y*.06)*size*depth,y:y+p.y*size*depth};
 };
 ctx.clearRect(0,0,width,height);
 ctx.save();
 ctx.globalCompositeOperation='screen';
 halo(ctx,x,y+size*.83,size*2.65,revealHue,.12+energy*.22);
 halo(ctx,x,y-size*.26,size*1.8,revealHue,.12+energy*.37);
 ctx.restore();
 if(opening&&rarity!=='Rare')drawRarityPrelude(ctx,x,y,size,progress,rarity);

 const ordered=faces.map((face,index)=>{
  const points=face.map(i=>body[i]);
  return {index,points,z:points.reduce((total,p)=>total+p.z,0)/points.length};
 }).sort((a,b)=>a.z-b.z);
 for(const face of ordered){
  const {index,z}=face;
  const burst=fracture*fracture*(.9+(index%5)*.25);
  const angle=index*2.39996;
  const points=face.points.map(p=>project({x:p.x+Math.cos(angle)*burst,y:p.y+Math.sin(angle)*burst,z:p.z+burst*.35}));
  const light=.5+.5*Math.sin(spin+index*.91);
  const tone=ctx.createLinearGradient(x-size*.4,y-size*1.4,x+size*.58,y+size);
  tone.addColorStop(0,`hsl(${hue-13},82%,${67+light*19}%)`);
  tone.addColorStop(.35,`hsl(${hue+9},70%,${32+light*31}%)`);
  tone.addColorStop(.68,`hsl(${hue-7},92%,${30+light*30+energy*8}%)`);
  tone.addColorStop(1,`hsl(${hue+22},67%,${17+light*13}%)`);
  ctx.globalAlpha=(z<0?.63:.94)*(1-fracture*.82);
  polygon(ctx,points);ctx.fillStyle=tone;ctx.fill();
  ctx.strokeStyle=`hsla(${hue-12},88%,88%,${.21+light*.50+energy*.19})`;ctx.lineWidth=Math.max(.55,size*.009);ctx.stroke();
  ctx.save();ctx.clip();
  const sweep=(Math.sin(time*.0016+index*.73)*.5+.5);
  const reflection=ctx.createLinearGradient(x-size,y-size,x+size,y+size);
  reflection.addColorStop(0,'transparent');
  reflection.addColorStop(Math.max(.015,sweep*.82),'transparent');
  reflection.addColorStop(Math.max(.025,sweep*.82+.06),`hsla(${hue-22},95%,91%,${.27+energy*.3})`);
  reflection.addColorStop(Math.max(.035,sweep*.82+.13),'transparent');
  reflection.addColorStop(1,'transparent');
  ctx.fillStyle=reflection;ctx.fillRect(x-size*3,y-size*3,size*6,size*6);
  ctx.restore();
 }
 ctx.globalAlpha=1;
 if(fracture<.12)drawMount(ctx,x,y+size*.52,size,spin,energy,1-fracture/.12);
 if(energy>.17)drawDischarge(ctx,x,y-size*.22,size,time,revealHue,energy,fracture,rarity);
}

function drawMount(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,turn:number,energy:number,alpha:number){
 const metal=ctx.createLinearGradient(x-size*.45,y-size*.24,x+size*.40,y+size*.44);
 metal.addColorStop(0,'#866348');metal.addColorStop(.27,'#fff1be');metal.addColorStop(.43,'#9b6d40');metal.addColorStop(.71,'#38272c');metal.addColorStop(.88,'#e9be82');metal.addColorStop(1,'#755033');
 ctx.save();ctx.globalAlpha=alpha;
 for(const direction of [-1,1]){
  const shift=Math.sin(turn)*size*.055;
  polygon(ctx,[{x:x+shift,y:y+size*.47},{x:x+direction*size*.41,y:y-size*.03},{x:x+direction*size*.31,y:y-size*.23},{x:x+direction*size*.24,y:y+size*.018},{x:x+shift,y:y+size*.28}]);
  ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#e6bb7c';ctx.lineWidth=size*.012;ctx.stroke();
 }
 polygon(ctx,[{x,y:y-size*.06},{x:x+size*.13,y:y+size*.10},{x,y:y+size*.25},{x:x-size*.13,y:y+size*.10}]);
 ctx.fillStyle=metal;ctx.fill();
 ctx.fillStyle=`rgba(255,242,197,${.62+energy*.38})`;
 polygon(ctx,[{x,y:y+size*.025},{x:x+size*.052,y:y+size*.1},{x,y:y+size*.17},{x:x-size*.052,y:y+size*.1}]);ctx.fill();ctx.restore();
}

function drawDischarge(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,time:number,hue:number,energy:number,fracture:number,rarity?:Rarity){
 ctx.save();ctx.globalCompositeOperation='screen';
 const power=Math.max(0,(energy-.17)/.83);
 ctx.strokeStyle=`hsla(${hue},95%,88%,${power*(1-fracture)})`;ctx.lineWidth=Math.max(1,size*.012);
 for(let i=0;i<5;i++){
  const angle=i*2.4;
  ctx.beginPath();ctx.moveTo(x,y);
  ctx.lineTo(x+Math.cos(angle)*size*.14,y+Math.sin(angle)*size*.22);
  ctx.lineTo(x+Math.cos(angle+.38)*size*.23,y+Math.sin(angle+.15)*size*.43);
  ctx.lineTo(x+Math.cos(angle)*size*.31,y+Math.sin(angle)*size*.65);
  ctx.stroke();
 }
 const rays=rarity==='Legendary'?12:rarity==='Epic'?8:5;
 for(let i=0;i<rays;i++){
  const angle=i*Math.PI*2/rays+Math.sin(time*.001)*.15;
  const length=size*(.45+power*1.75+fracture);
  const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;
  const fade=ctx.createLinearGradient(x,y,ex,ey);
  fade.addColorStop(0,`hsla(${hue},96%,86%,${power*.58*(1-fracture*.7)})`);fade.addColorStop(1,'transparent');
  polygon(ctx,[{x,y},{x:ex-Math.sin(angle)*size*.065,y:ey+Math.cos(angle)*size*.065},{x:ex+Math.sin(angle)*size*.065,y:ey-Math.cos(angle)*size*.065}]);
  ctx.fillStyle=fade;ctx.fill();
 }
 if(fracture>0){
  halo(ctx,x,y,size*(1+fracture*1.4),hue,Math.sin(fracture*Math.PI)*.88);
  for(let i=0;i<28;i++){
   const angle=i*2.39996,travel=size*fracture*(.8+i%6*.28);
   ctx.fillStyle=`hsla(${hue},92%,${i%2?85:58}%,${1-fracture})`;
   ctx.fillRect(x+Math.cos(angle)*travel,y+Math.sin(angle)*travel,size*.024,size*.013);
  }
 }
 ctx.restore();
}

function drawRarityPrelude(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,progress:number,rarity?:Rarity){
 const envelope=Math.sin(Math.PI*Math.min(1,progress*1.15));
 if(envelope<=0)return;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=envelope;
 if(rarity==='Epic'){
  ctx.lineWidth=Math.max(1.5,size*.018);
  for(const side of [-1,1]){
   const drift=progress*5;
   const path=ctx.createLinearGradient(x-size,y-size,x+size,y+size);
   path.addColorStop(0,'transparent');path.addColorStop(.45,'#b455ef');path.addColorStop(.62,'#efd4ff');path.addColorStop(1,'transparent');
   ctx.strokeStyle=path;ctx.beginPath();
   for(let step=0;step<=54;step++){
    const t=step/54,angle=t*7+drift+(side===1?0:Math.PI);
    const px=x+Math.cos(angle)*size*(.9-t*.65);
    const py=y+size*(1.18-t*2.4)+Math.sin(angle)*size*.11;
    if(step===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.stroke();
  }
 }else if(rarity==='Legendary'){
  const column=ctx.createLinearGradient(x,0,x,y+size*.6);
  column.addColorStop(0,'transparent');column.addColorStop(.58,'#ffd18070');column.addColorStop(1,'#fff0ac');
  const width=size*(.03+.15*progress);
  polygon(ctx,[{x:x-width*.44,y:0},{x:x+width*.44,y:0},{x:x+width,y:y+size*.52},{x:x-width,y:y+size*.52}]);
  ctx.fillStyle=column;ctx.fill();
  const floor=y+size*.98;
  ctx.strokeStyle='#f7c779';ctx.lineWidth=size*.011;
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3+progress*.8;
   const sx=x+Math.cos(angle)*size*.98,sy=floor+Math.sin(angle)*size*.22;
   const span=size*.11;
   polygon(ctx,[{x:sx,y:sy-span*.35},{x:sx+span,y:sy},{x:sx,y:sy+span*.35},{x:sx-span,y:sy}]);ctx.stroke();
  }
  halo(ctx,x,floor,size*1.8,41,.38*envelope);
 }
 ctx.restore();
}
