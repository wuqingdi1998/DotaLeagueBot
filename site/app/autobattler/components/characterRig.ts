import type PhaserType from 'phaser';

const segments=20;
/** Continuous skin mesh keeps the original art intact while shoulders, hips and knees articulate. */
export function createCharacterRig(Phaser:typeof PhaserType,scene:PhaserType.Scene,texture:string,size:number){
 const vertices:number[]=[],indices:number[]=[];
 for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++)vertices.push(x/segments*size,y/segments*size,x/segments,y/segments);
 for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
  const a=y*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;
  indices.push(a,b,c,0,b,d,c,0);
 }
 const mesh=new Phaser.GameObjects.Mesh2D(scene,-size/2,-size,texture,vertices,indices,true);
 mesh.setOrigin(0,0).setSize(size,size).setRenderAsTriangles(true);
 scene.add.existing(mesh);
 return mesh;
}
export function poseCharacter(mesh:PhaserType.GameObjects.Mesh2D,stride:number,isWalking:boolean,attack:number){
 const size=mesh.width;
 for(let index=0;index<mesh.vertices.length;index+=4){
  const u=mesh.vertices[index+2],v=mesh.vertices[index+3],side=u<.5?-1:1;
  let x=u,y=v;
  if(v>.64){
   const leg=(v-.64)/.36,step=isWalking?stride*side:0;
   x+=step*.065*leg;y-=Math.max(0,step)*.045*leg;
   x+=Math.sin(leg*Math.PI)*Math.max(0,-step)*.03;
  }else if(v>.3&&v<.7){
   const arm=Math.min(1,Math.abs(u-.5)*4)*Math.sin((v-.3)/.4*Math.PI);
   const swing=(isWalking?-stride*side*.035:0)+attack*side*.08;
   x+=swing*arm;y-=attack*.07*arm;
  }
  mesh.vertices[index]=x*size;mesh.vertices[index+1]=y*size;
 }
}
