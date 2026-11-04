import type Phaser from 'phaser';
export interface RigPose {stride:number;isWalking:boolean;attack:number;cast:number;hit:number;death:number;time:number}

/** Shoulder/elbow and hip/knee chains use overlapping artwork around each pivot. */
export function createHumanoidRig(scene:Phaser.Scene,hero:'bastion'|'iskra'|'selena'|'ruta',size:number){
 const rig=scene.add.container(0,0).setScale(size/150),texture=`${hero}-cutout`,isTank=hero==='bastion',isDual=hero==='selena',isCaster=hero==='ruta';
 const images:Phaser.GameObjects.Image[]=[];
 function part(name:string,x:number,y:number,width:number,height:number,ox=.5,oy=.5){
  const image=scene.add.image(x,y,texture,name).setOrigin(ox,oy).setDisplaySize(width,height);images.push(image);return image;
 }
 function leg(x:number){
  const hip=scene.add.container(x,-43),knee=scene.add.container(0,21);
  hip.add([part('thigh',0,0,isTank?23:18,30,.5,.12),knee]);
  knee.add(part('boot',0,0,isTank?28:23,32,.38,.12));
  return {hip,knee};
 }
 const cape=part('cape',-11,-86,isTank?65:48,isTank?70:55,.12,.08);
 const rear=leg(10),front=leg(-12);
 const weaponArm=scene.add.container(isTank?-18:16,-83),weaponElbow=scene.add.container(0,20);
 const weapon=part('weapon',22,0,isCaster?29:isTank?28:42,isCaster?112:isTank?67:78,.5,.87);
 weaponElbow.add([weapon,part('forearm',0,0,27,16,.12,.5)]);
 weaponArm.add([part('upperArm',0,0,isTank?29:23,33,.5,.15),weaponElbow]);
 const guard=scene.add.container(isTank?19:-16,-83),guardElbow=scene.add.container(0,20);
 guard.add([part('upperArm',0,0,isTank?29:23,33,.5,.15),guardElbow]);
 guardElbow.add(part('forearm',0,0,25,16,.12,.5));
 if(isDual)guardElbow.add(part('accessory',20,0,34,62,.5,.87));
 if(isTank)guardElbow.add(part('accessory',13,-3,49,65,.48,.45));
 const torso=part('torso',0,-68,isTank?58:47,65),neck=scene.add.container(-1,-107);
 const hair=isTank||isDual?undefined:part('accessory',-16,-5,65,77,.88,.12);
 if(hair)neck.add(hair);
 neck.add(part('head',0,0,isTank?59:53,isTank?61:56,.5,.57));
 rig.add([cape,rear.hip,weaponArm,front.hip,torso,neck,guard]);
 if(!isTank){rig.bringToTop(weaponArm);rig.bringToTop(neck);}
 function pose(pose:RigPose){
  const {attack,cast,hit,death,time}=pose,step=pose.isWalking?pose.stride:0;
  for(const [limb,sign] of [[front,1],[rear,-1]] as const){
   limb.hip.rotation=step*sign*.48+death*sign*.65;
   limb.knee.rotation=Math.max(0,-step*sign)*.85+death*.9;
  }
  const breath=Math.sin(time/520)*.018;
  torso.rotation=attack*.06+cast*.045-hit*.08+death*.13;
  weaponArm.rotation=(isCaster?-cast*.6:0)-step*.24-attack*(isTank?.6:1.05)-cast*.55+hit*.22+death*.8;
  weaponElbow.rotation=-.22+attack*.72-cast*.8+death*.6;
  weapon.rotation=isCaster?-.25-cast*.45+attack*.2:.1+attack*(isTank?1.35:1.85)+cast*.4;
  guard.rotation=step*.2+(isTank?-cast*.6-hit*.65:attack*.4)-death*.9;
  guardElbow.rotation=-.2+(isTank?cast*.2:attack*.6)+death*.5;
  if(isDual)guardElbow.rotation=-.3-attack*.9+death*.6;
  neck.rotation=-step*.035+attack*.04+hit*.13+death*.4;
  cape.rotation=breath+step*.12-attack*.15+death*.2;
  if(hair)hair.rotation=breath*2-step*.15-attack*.25+hit*.15;
 }
 function flash(isFlashing:boolean){for(const image of images)if(isFlashing)image.setTint(0xfff0d0).setTintFill();else image.clearTint();}
 return {rig,pose,flash};
}
