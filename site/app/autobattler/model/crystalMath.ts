export type Vec3={x:number;y:number;z:number};
export const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const subtract=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
export const multiply=(a:Vec3,value:number):Vec3=>({x:a.x*value,y:a.y*value,z:a.z*value});
export const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a:Vec3,b:Vec3):Vec3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export const normalize=(a:Vec3)=>multiply(a,1/(Math.hypot(a.x,a.y,a.z)||1));
export const average=(points:Vec3[])=>multiply(points.reduce(add,{x:0,y:0,z:0}),1/points.length);
export function rotate(point:Vec3,yaw:number,pitch:number,roll=0):Vec3{
 const x=point.x*Math.cos(yaw)+point.z*Math.sin(yaw);
 const depth=-point.x*Math.sin(yaw)+point.z*Math.cos(yaw);
 const y=point.y*Math.cos(pitch)-depth*Math.sin(pitch);
 const z=point.y*Math.sin(pitch)+depth*Math.cos(pitch);
 return {x:x*Math.cos(roll)-y*Math.sin(roll),y:x*Math.sin(roll)+y*Math.cos(roll),z};
}
export function smoothstep(start:number,end:number,value:number){
 const t=Math.max(0,Math.min(1,(value-start)/(end-start)));
 return t*t*(3-2*t);
}
