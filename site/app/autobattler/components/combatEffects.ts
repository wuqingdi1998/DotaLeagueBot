import {gameTypography} from '../model/typography';
import type Phaser from 'phaser';
import {heroById} from '@/lib/autobattler/catalog';
import {basicSkill} from '@/lib/autobattler/abilities';
import type {Unit} from '@/lib/autobattler/simulation';
import {heroVisuals} from '../model/visuals';
import {clamp,type CombatEvent} from '../model/combatPresentation';
import type {CombatAudio} from '../services/combatAudio';
import {screenPosition} from './combatActors';

export function createCombatEffects(scene:Phaser.Scene,width:number,height:number,audio:CombatAudio){
 const graphics=scene.add.graphics().setDepth(2200),numbers=scene.add.container(0,0).setDepth(2500);
 const banner=scene.add.text(width/2,105,'',{fontFamily:gameTypography.interface,fontSize:width<800?'17px':'22px',color:'#ffe4a4',stroke:'#091725',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(3000);
 const labels:{text:Phaser.GameObjects.Text;start:number;x:number;y:number}[]=[],lanes=new Map<string,number>();
 const windups=new Set<string>();
 let previous=-1,bannerTime=-2000;
 function announce(text:string,time:number){if(time-bannerTime<650)return;banner.setText(text);bannerTime=time;}
 function draw(events:CombatEvent[],units:Unit[],time:number,canPlay:boolean){
  const g=graphics;g.clear();
  const active=events.filter(event=>event.time<=time&&event.time>time-900);
  const upcoming=events.filter(event=>event.time>time&&event.time<time+260&&event.kind==='damage'&&event.delivery!=='dot');
  for(const event of upcoming){
   const source=units.find(unit=>unit.id===event.actor),target=units.find(unit=>unit.id===event.target);
   if(!source||!target||source.hp<=0||target.hp<=0)continue;
   const a=screenPosition(source,width,height),b=screenPosition(target,width,height),progress=1-(event.time-time)/260;
   const isRanged=heroById[source.hero].range>=100;
   const windupKey=`${event.time}-${event.actor}`;
   if(!isRanged&&!windups.has(windupKey)){windups.add(windupKey);if(canPlay)audio.play('swing');}
   if(isRanged){
    const startX=a.x+(source.hero==='ruta'?(source.side?-27:27):0),startY=a.y-(source.hero==='ruta'?145:75);
    const x=startX+(b.x-startX)*progress,y=startY+(b.y-75-startY)*progress-Math.sin(progress*Math.PI)*18;
    g.lineStyle(2,heroVisuals[source.hero].color,.65);g.lineBetween(x-(b.x-a.x)*.07,y-(b.y-a.y)*.07,x,y);
    g.fillStyle(0xffe8ae);g.fillCircle(x,y,3);
   }
  }
  for(const event of active){
   const source=units.find(unit=>unit.id===event.actor),target=units.find(unit=>unit.id===event.target);
   if(!source||!target)continue;
   const a=screenPosition(source,width,height),b=screenPosition(target,width,height),age=time-event.time,progress=clamp(age/700),isNew=event.time>previous;
   const hero=heroById[source.hero],visual=heroVisuals[source.hero];
   if(event.kind==='skill'||event.kind==='basic'){
    const isUltimate=event.kind==='skill',skill=isUltimate?hero.skill:basicSkill(hero);
    if(isNew){
     if(isUltimate)announce(`${hero.name} · ${skill.name}`,time);
     if(canPlay)audio.play(isUltimate?'ultimate':skill.effect==='heal'?'heal':skill.effect==='shield'?'shield':source.hero==='iskra'?'fire':'magic');
    }
    const opacity=(1-progress)*(isUltimate?.8:.4),radius=25+progress*(isUltimate?100:55);
    g.lineStyle(isUltimate?3:1.5,visual.color,opacity);g.strokeEllipse(a.x,a.y-6,radius*2,radius*.5);
    if(skill.effect==='shield'){
     for(let i=0;i<6;i++){
      const angle=i*Math.PI/3+Math.PI/6,angle2=(i+1)*Math.PI/3+Math.PI/6;
      g.lineStyle(2,0xb8edff,opacity);g.lineBetween(a.x+Math.cos(angle)*radius,a.y-65+Math.sin(angle)*radius,a.x+Math.cos(angle2)*radius,a.y-65+Math.sin(angle2)*radius);
     }
    }
    if(source.hero==='iskra'){
     for(let i=0;i<3;i++){
      g.lineStyle(8-i*2,i===0?0xe84b27:i===1?0xffa83c:0xfff0a4,opacity);
      g.beginPath();g.arc(a.x+(source.side?-24:24),a.y-65,radius*.65+i*4,-1.7+progress,1.7+progress);g.strokePath();
     }
    }
   }
   if(event.kind!=='damage'&&event.kind!=='heal')continue;
   const isHeal=event.kind==='heal',isBlocked=!isHeal&&event.amount===0,isDot=event.delivery==='dot';
   const color=isHeal?0x86efb6:isBlocked?0xa2ddff:isDot?0xb5d875:source.hero==='iskra'?0xffb65a:0xffe6b2;
   if(age<180&&!isDot){
    const impact=1-age/180;
    g.fillStyle(color,impact*.55);g.fillCircle(b.x,b.y-75,6+age*.025);
    g.lineStyle(2,color,impact);g.strokeCircle(b.x,b.y-75,8+age*.12);
   }
   if(isHeal){
    g.lineStyle(2,0x85ffc4,(1-progress)*.4);g.lineBetween(a.x,a.y-70,b.x,b.y-70);
    for(let i=0;i<4;i++){
     const x=b.x+Math.sin(i*2.2)*24,y=b.y-25-progress*85-i*9;
     g.lineStyle(2,0xaaffd3,1-progress);g.lineBetween(x-3,y,x+3,y);g.lineBetween(x,y-3,x,y+3);
    }
   }else if(!isDot&&hero.range<100&&age<250){
    const direction=source.side?-1:1;
    if(source.hero==='orion'){g.lineStyle(3,color,1-age/250);g.lineBetween(b.x-direction*45,b.y-75,b.x+direction*9,b.y-75);}
    else {g.lineStyle(source.hero==='iskra'?6:3,color,(1-age/250)*.8);g.beginPath();g.arc(b.x-direction*12,b.y-75,26+progress*20,-1.1+(direction<0?Math.PI:0),1.1+(direction<0?Math.PI:0));g.strokePath();}
   }
   if(!isDot)for(let i=0;i<5;i++){
    const angle=i*1.9+event.time*.01,x=b.x+Math.cos(angle)*progress*45,y=b.y-75+Math.sin(angle)*progress*35+progress*progress*20;
    g.fillStyle(color,1-progress);g.fillCircle(x,y,Math.max(1,3*(1-progress)));
   }
   if(isNew){
    if(canPlay&&event.kind==='damage')audio.play(isBlocked?'shield':isDot?'magic':source.hero==='iskra'?'fire':hero.role==='Tank'?'heavy':hero.range<100?'sword':'magic');
    const lane=lanes.get(target.id)??0;lanes.set(target.id,(lane+1)%3);
    const x=b.x+(lane-1)*22,y=b.y-(width<800?128:158)-lane*14;
    const text=scene.add.text(x,y,isBlocked?'ЩИТ':`${isHeal?'+':''}${Math.round(event.amount)}`,{fontFamily:gameTypography.interface,fontSize:isBlocked?'13px':event.amount>target.maxHp*.12?'25px':'19px',fontStyle:'bold',color:isHeal?'#a6ffd2':isBlocked?'#a3e6ff':isDot?'#c5e69c':'#fff0d0',stroke:'#101a29',strokeThickness:4}).setOrigin(.5);
    numbers.add(text);labels.push({text,start:time,x,y});
   }
  }
  for(let index=labels.length-1;index>=0;index--){
   const label=labels[index],progress=(time-label.start)/850;
   if(progress>=1){label.text.destroy();labels.splice(index,1);continue;}
   label.text.setPosition(label.x,label.y-progress*35).setAlpha(1-clamp((progress-.5)*2));
  }
  banner.setAlpha(1-clamp((time-bannerTime-700)/350));
  previous=time;
 }
 return {draw,announce};
}
