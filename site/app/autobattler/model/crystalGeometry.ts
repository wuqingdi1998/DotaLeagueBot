import {add,average,cross,dot,multiply,normalize,rotate,subtract,type Vec3} from './crystalMath';

export type CrystalMaterial='glass'|'gold'|'inlay';
export type CrystalFragment={vertices:Vec3[];faces:number[][];center:Vec3;material:CrystalMaterial;index:number;isSurface?:boolean};
const fragments:CrystalFragment[]=[];
const inner={x:0,y:-.2,z:0};
const sides=7;
const rings=[[-.79,.25],[-.13,.43],[.54,.29]] as const;
const skin:Vec3[]=[
 {x:-.06,y:-1.48,z:.02},
 ...rings.flatMap(([y,radius],ring)=>Array.from({length:sides},(_,i)=>{
  const angle=i*Math.PI*2/sides;
  return {x:Math.cos(angle)*radius+ring*.015,y:y+Math.sin(i*3.2)*.025,z:Math.sin(angle)*radius};
 })),
 {x:.055,y:1.02,z:0},
];
function tetrahedron(triangle:number[]){
 const vertices=[...triangle.map(index=>skin[index]),inner];
 fragments.push({vertices,faces:[[0,1,2],[0,3,1],[1,3,2],[2,3,0]],center:average(vertices),index:fragments.length,material:'glass'});
}
for(let i=0;i<sides;i++){
 const a=1+i,b=1+(i+1)%sides;
 tetrahedron([0,a,b]);
 tetrahedron([a,a+sides,b+sides]);tetrahedron([a,b+sides,b]);
 tetrahedron([a+sides,a+2*sides,b+2*sides]);tetrahedron([a+sides,b+2*sides,b+sides]);
 tetrahedron([a+2*sides,skin.length-1,b+2*sides]);
}
function extrudedMetal(points:{x:number;y:number}[],depth:number,material:CrystalMaterial,centerZ=0){
 const middle=average(points.map(point=>({...point,z:0})));
 const inset=points.map(point=>({x:middle.x+(point.x-middle.x)*.87,y:middle.y+(point.y-middle.y)*.87,z:depth+centerZ}));
 const count=points.length;
 const vertices=[...inset,...points.map(point=>({...point,z:depth*.74+centerZ})),...points.map(point=>({...point,z:-depth*.74+centerZ})),...inset.map(point=>({...point,z:-depth+centerZ}))];
 const faces=[Array.from({length:count},(_,index)=>index),Array.from({length:count},(_,index)=>index+3*count).reverse()];
 for(let layer=0;layer<3;layer++)for(let index=0;index<count;index++){
  const next=(index+1)%count;
  faces.push([layer*count+index,layer*count+next,(layer+1)*count+next,(layer+1)*count+index]);
 }
 fragments.push({vertices,faces,center:average(vertices),index:fragments.length,material,isSurface:true});
}
for(const side of [-1,1]){
 for(const direction of [-1,1]){
  extrudedMetal([
   {x:0,y:.98},{x:direction*.42,y:.51},{x:direction*.32,y:.23},
   {x:direction*.245,y:.51},{x:direction*.055,y:.74},
  ],.026,'gold',side*.225);
 }
 extrudedMetal([{x:0,y:.56},{x:.14,y:.71},{x:0,y:.91},{x:-.14,y:.71}],.018,'gold',side*.267);
 extrudedMetal([{x:0,y:.64},{x:.055,y:.71},{x:0,y:.8},{x:-.055,y:.71}],.014,'inlay',side*.294);
}
extrudedMetal([{x:-.035,y:.90},{x:.035,y:.90},{x:.025,y:.98},{x:-.025,y:.98}],.235,'gold');

export const crystalFragments:readonly CrystalFragment[]=fragments;

/** Every component shares one parent transform. Fragments then tumble rigidly around their own centroid. */
export function transformFragment(fragment:CrystalFragment,yaw:number,pitch:number,separation:number,burst:number){
 const delay=fragment.material==='glass'?0:.055;
 const travel=Math.max(0,burst-delay);
 const direction=normalize({...fragment.center,z:fragment.center.z*.8});
 const stagger=.76+(fragment.index%7)*.052;
 const velocity=multiply(direction,travel*(1.65+stagger));
 const gravity={x:0,y:travel*travel*.85,z:0};
 const offset=add(multiply(direction,separation),add(velocity,gravity));
 return fragment.vertices.map(vertex=>{
  const local=subtract(vertex,fragment.center);
  const turned=rotate(local,travel*(fragment.index%2?1.8:-1.3),travel*(.6+fragment.index%5*.21),travel*(fragment.index%3-1)*.9);
  return rotate(add(add(turned,fragment.center),offset),yaw,pitch);
 });
}
export function fragmentFaceNormal(points:Vec3[],center:Vec3){
 let normal=normalize(cross(subtract(points[1],points[0]),subtract(points[2],points[0])));
 if(dot(normal,subtract(average(points),center))<0)normal=multiply(normal,-1);
 return normal;
}
