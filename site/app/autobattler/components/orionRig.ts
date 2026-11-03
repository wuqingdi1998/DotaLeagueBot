import type PhaserType from 'phaser';

export function createOrionRig(scene:PhaserType.Scene,size:number){
 const rig=scene.add.container(0,0).setScale(size/150);
 const part=(name:string,x:number,y:number,width:number,height:number,ox=.5,oy=.5)=>
  scene.add.image(x,y,'orion-cutout',name).setOrigin(ox,oy).setDisplaySize(width,height);
 const cape=part('cape',-10,-82,61,51,.21,.14);
 const leg=(x:number,y:number)=>{
  const hip=scene.add.container(x,y);
  const knee=scene.add.container(0,18);
  hip.add([part('thigh',0,0,23,27,.5,.16),knee]);
  knee.add(part('boot',0,0,24,34,.4,.12));
  return {hip,knee};
 };
 const rear=leg(9,-41),front=leg(-12,-41);
 const upper=scene.add.container(16,-72),elbow=scene.add.container(7,19);
 const spear=part('spear',20,3,65,76,.36,.64);
 elbow.add([spear,part('forearm',0,0,26,17,.12,.5)]);
 upper.add([part('upperArm',0,0,25,31,.45,.18),elbow]);
 const guard=scene.add.container(-16,-69),guardElbow=scene.add.container(0,19);
 guard.add([part('upperArm',0,0,25,31,.45,.18),guardElbow]);
 guardElbow.add([part('forearm',0,0,26,17,.12,.5),part('shield',-11,1,49,54)]);
 const torso=part('torso',-3,-62,54,58),head=part('head',-7,-99,66,64,.55,.55);
 rig.add([cape,rear.hip,front.hip,upper,torso,head,guard]);
 function pose(stride:number,isWalking:boolean,attack:number,cast:number){
  const step=isWalking?stride:0;
  for(const [limb,direction] of [[front,1],[rear,-1]] as const){
   limb.hip.rotation=step*direction*.42;
   limb.knee.rotation=Math.max(0,-step*direction)*.62;
  }
  upper.rotation=-step*.2-attack*.95-cast*.55;
  elbow.rotation=-.25+attack*.57;
  spear.rotation=attack*.18;
  guard.rotation=step*.13+attack*.26-cast*.3;
  guardElbow.rotation=-attack*.28;
  head.rotation=-step*.045+attack*.06;
  cape.rotation=step*.13+attack*.2;
 }
 return {rig,pose};
}
