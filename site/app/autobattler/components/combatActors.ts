import {gameTypography} from '../model/typography';
import type Phaser from 'phaser';
import type {Unit} from '@/lib/autobattler/simulation';
import {heroById} from '@/lib/autobattler/catalog';
import {projectFormation} from '@/lib/autobattler/formationGeometry';
import {battleEffects,visibleBattleEffects} from '@/lib/autobattler/battleEffects';
import {heroVisuals} from '../model/visuals';
import {actorAction,clamp,smooth,type CombatEvent} from '../model/combatPresentation';
import {createHumanoidRig,type RigPose} from './humanoidRig';
import {createOrionRig} from './orionRig';
import {createCharacterRig,poseCharacter} from './characterRig';
import {deathMotion} from '../model/deathMotion';

export function screenPosition(unit:Pick<Unit,'x'|'y'>,width:number,height:number){const point=projectFormation(unit);return {x:point.x/100*width,y:point.y/100*height};}

export function createCombatActor(Phaser:typeof import('phaser'),scene:Phaser.Scene,unit:Unit,width:number){
 const size=width<800?114:145,root=scene.add.container(0,0);
 const shadow=scene.add.ellipse(0,-2,size*.55,15,0x030d18,.42);
 const articulated=unit.hero==='bastion'||unit.hero==='iskra'||unit.hero==='selena'||unit.hero==='ruta'?createHumanoidRig(scene,unit.hero,size):undefined;
 const orion=unit.hero==='orion'?createOrionRig(scene,size):undefined;
 const mesh=articulated||orion?undefined:createCharacterRig(Phaser,scene,unit.hero,size);
 const body=articulated?.rig??orion?.rig??mesh!;
 const pose=(pose:RigPose)=>{
  if(articulated)articulated.pose(pose);
  else if(orion)orion.pose(pose.stride,pose.isWalking,pose.attack,pose.cast,pose.death,pose.hit,Math.abs(root.rotation));
  else poseCharacter(mesh!,pose.stride,pose.isWalking,pose.attack||pose.cast);
 };
 root.add([shadow,body]);
 const label=scene.add.text(0,0,`${heroById[unit.hero].name} · ${unit.level??1}`,{fontSize:width<800?'12px':'13px',fontFamily:gameTypography.interface,color:'#fff2d6',stroke:'#071323',strokeThickness:3}).setOrigin(.5).setDepth(2100);
 const icons=battleEffects.map(effect=>scene.add.text(0,0,effect.icon,{fontFamily:gameTypography.interface,fontSize:'12px',color:'#ffffff'}).setOrigin(.5).setDepth(2100).setVisible(false));
 return {root,body,shadow,label,icons,pose,flash:articulated?.flash,deathTime:-1,size};
}
export type CombatActor=ReturnType<typeof createCombatActor>;

export function drawCombatActor(actor:CombatActor,unit:Unit,next:Unit,scene:Phaser.Scene,g:Phaser.GameObjects.Graphics,events:CombatEvent[],time:number,options:{width:number;height:number;isMarching:boolean;marchProgress:number;isBoss:boolean;entry:number;poseTime:number}){
 const {width,height,isMarching,marchProgress,isBoss,entry}=options,position=screenPosition(unit,width,height),direction=unit.side?-1:1;
 const motion=actorAction(events,unit.id,time),visual=heroVisuals[unit.hero];
 const isMoving=isMarching||Math.hypot(unit.x-next.x,unit.y-next.y)>.15||entry<1;
 const stride=Math.sin(options.poseTime/105*visual.stride+visual.phase),isDead=unit.hp<=0;
 actor.icons.forEach(icon=>icon.setVisible(false));
 if(isDead&&actor.deathTime<0)actor.deathTime=time;
 if(!isDead)actor.deathTime=-1;
 const dying=deathMotion(isDead?time-actor.deathTime:0),death=isDead?dying.collapse:0;
 const isActing=!isMarching&&entry>=1&&unit.stunnedUntil<=time&&!isDead;
 const attack=isActing?motion.attack:0,cast=isActing?motion.cast:0;
 const walk=isMoving&&!isDead&&unit.stunnedUntil<=time&&Math.abs(attack)<.05&&Math.abs(cast)<.05;
 const lunge=Math.max(0,attack)*(heroById[unit.hero].range<100?18:3)*direction;
 const entryX=unit.side===1?(1-entry)*width*.2:-(1-entry)*width*.08;
 const marchX=isMarching?smooth(marchProgress)*width*(isDead?-.045:.07):0;
 const x=position.x+lunge+entryX+marchX-motion.hit*direction*5,y=position.y+(isDead?dying.vertical:walk?Math.abs(stride)*2.2:Math.sin(time/650+visual.phase)*1.2);
 actor.root.setPosition(x,y).setDepth(position.y).setScale(direction*(isBoss?1.22:1),isBoss?1.22:1).setRotation((isDead?dying.fall:0)*direction*1.48).setAlpha(isDead?dying.alpha:1);
 actor.shadow.setAlpha(isDead?dying.alpha*.25:1).setRotation(-actor.root.rotation*direction);
 actor.pose({stride,isWalking:walk,attack,cast,hit:motion.hit,death,time:options.poseTime});
 actor.flash?.(motion.isFlashing);
 actor.body.setRotation(isDead?0:cast*.045+attack*.065-motion.hit*.065);
 actor.label.setVisible(!isDead).setPosition(x,y+12);
 if(isDead){if(dying.dust>0){g.fillStyle(0xcfb38e,dying.dust*.16);g.fillEllipse(position.x+direction*actor.size*.35,position.y,actor.size*(.5+dying.dust*.35),9);}return;}
 const size=width<800?66:82,barY=y-actor.size*(isBoss?1.25:1)-12;
 g.fillStyle(0x06101c,.94);g.fillRoundedRect(x-size/2-2,barY-2,size+4,16,3);
 g.fillStyle(unit.side?0xe68487:0x78dcb1);g.fillRect(x-size/2,barY,size*clamp(unit.hp/unit.maxHp),7);
 if(unit.shield>0){g.fillStyle(0x8bdcff,.9);g.fillRect(x-size/2,barY+5,size*clamp(unit.shield/unit.maxHp),2);}
 g.fillStyle(0xf1ce7e);g.fillRect(x-size/2,barY+11,size*unit.energy/100,2);
 visibleBattleEffects(unit,time).forEach((effect,index,all)=>{
  const iconX=x+(index-(all.length-1)/2)*18,iconY=barY-14;
  g.fillStyle(effect.isBuff?0x174a72:0x823146,.95);g.fillRoundedRect(iconX-8,iconY-8,16,16,3);
  g.fillStyle(0xffffff,.8);g.fillRect(iconX-6,iconY+6,12*effect.progress,1);
  actor.icons[index].setText(effect.icon).setPosition(iconX,iconY-1).setVisible(true);
 });
 if(unit.shield>0){
  const pulse=.35+Math.sin(time/300)*.1;g.lineStyle(1.5,0x83dcff,pulse);g.strokeEllipse(x,y-actor.size*.48,actor.size*.83,actor.size*1.04);
  g.lineStyle(4,0xa6e9ff,.12);g.strokeEllipse(x,y-actor.size*.48,actor.size*.86,actor.size*1.06);
 }
 if(isBoss){g.lineStyle(2,0xe2ad5c,.65);g.strokeEllipse(x,y,95,22);}
}
