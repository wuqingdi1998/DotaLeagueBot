import type PhaserType from 'phaser';
import type {Battle,Unit} from '@/lib/autobattler/simulation';
import {heroById,stages} from '@/lib/autobattler/catalog';
import {heroVisuals,sceneBackground} from '../model/visuals';
type Character={root:PhaserType.GameObjects.Container;body:PhaserType.GameObjects.Image;label:PhaserType.GameObjects.Text;death:number};
export function createArena(Phaser:typeof PhaserType,battle:Battle,control:{current:{isPaused:boolean;speed:number}},onFinish:()=>void){
 return class Arena extends Phaser.Scene{
  elapsed=0;outro=0;graphics!:PhaserType.GameObjects.Graphics;actors:Character[]=[];width=1000;height=700;shown=new Set<string>();hitStop=0;clock!:PhaserType.GameObjects.Text;
  preload(){const stage=stages.find(stage=>stage.team.join(',')===battle.units.filter(unit=>unit.side===1).map(unit=>unit.hero).join(','));this.load.image('arena',battle.chapter||stage?`/autobattler/${['citadel','forest','temple'][(battle.chapter??stage?.chapter??1)-1]}.webp`:sceneBackground);for(const id of new Set(battle.units.map(unit=>unit.hero)))this.load.image(id,heroVisuals[id].texture);}
  create(){
   this.width=this.scale.width;this.height=this.scale.height;
   const environment=this.add.image(this.width/2,this.height/2,'arena');environment.setScale(Math.max(this.width/environment.width,this.height/environment.height));
   this.add.rectangle(this.width/2,this.height/2,this.width,this.height,0x05152a,.22);
   this.actors=battle.units.map(unit=>{
    const root=this.add.container(0,0);const size=this.width<800?102:125;
    const shadow=this.add.ellipse(0,-3,size*.58,20,0x061326,.4);
    const body=this.add.image(0,0,unit.hero).setOrigin(.5,1).setDisplaySize(size,size);
    root.add([shadow,body]);const label=this.add.text(0,0,`${heroById[unit.hero].name} · ${unit.level??1}`,{fontSize:this.width<800?'12px':'13px',fontFamily:'Arial',color:'#fff2d6',stroke:'#071323',strokeThickness:3}).setOrigin(.5);
    return {root,body,label,death:-1};
   });this.graphics=this.add.graphics().setDepth(2000);this.clock=this.add.text(this.width/2,25,'',{fontSize:'24px',color:'#f2dfb4',stroke:'#091626',strokeThickness:4}).setOrigin(.5).setDepth(3000);
  }
  position(unit:Unit){return {x:unit.x/1000*this.width,y:this.height*.27+unit.y/500*this.height*.63};}
  update(_time:number,delta:number){
   if(!control.current.isPaused&&this.hitStop<=0)this.elapsed=Math.min(battle.duration,this.elapsed+Math.min(delta,150)*control.current.speed);
   if(!control.current.isPaused)this.hitStop=Math.max(0,this.hitStop-delta*control.current.speed);
   this.tweens.timeScale=control.current.isPaused||this.hitStop>0?0:control.current.speed;
   if(this.elapsed>=battle.duration&&!control.current.isPaused)this.outro+=delta*control.current.speed;
   this.clock.setText(`${Math.floor(this.elapsed/60000)}:${String(Math.floor(this.elapsed/1000)%60).padStart(2,'0')}`);
   const frameIndex=this.elapsed>=battle.duration?battle.frames.length-1:Math.min(battle.frames.length-1,Math.floor(this.elapsed/200));
   const current=battle.frames[frameIndex],next=battle.frames[Math.min(battle.frames.length-1,frameIndex+1)];
   const fraction=Math.max(0,Math.min(1,(this.elapsed-current.time)/Math.max(1,next.time-current.time)));
   const units=current.units.map((unit,index)=>({...unit,x:Phaser.Math.Linear(unit.x,next.units[index].x,fraction),y:Phaser.Math.Linear(unit.y,next.units[index].y,fraction)}));
   for(const event of battle.events){if(event.time<=current.time||event.time>this.elapsed)continue;const target=units.find(unit=>unit.id===event.target);if(target){if(event.kind==='damage')target.hp=event.health??Math.max(0,target.hp-event.amount);if(event.kind==='heal')target.hp=event.health??Math.min(target.maxHp,target.hp+event.amount);}}
   const g=this.graphics;g.clear();
   const upcoming=battle.events.filter(event=>event.kind==='damage'&&event.delivery!=='dot'&&event.time>this.elapsed&&event.time<=this.elapsed+220);
   for(const event of upcoming){const source=units.find(unit=>unit.id===event.actor)!,target=units.find(unit=>unit.id===event.target)!;if(!['Mage','Marksman','Support'].includes(heroById[source.hero].role)||source.hp<=0)continue;const a=this.position(source),b=this.position(target),flight=1-(event.time-this.elapsed)/220;const x=Phaser.Math.Linear(a.x,b.x,flight),y=Phaser.Math.Linear(a.y,b.y,flight)-65;g.lineStyle(3,heroVisuals[source.hero].color);g.lineBetween(x-12*(source.side?-1:1),y,x,y);g.fillStyle(0xffe7ad);g.fillCircle(x,y,4);}

   const active=battle.events.filter(event=>event.time<=this.elapsed&&event.time>this.elapsed+this.outro-750).slice(-28);
   units.forEach((unit,index)=>{
    const actor=this.actors[index],visual=heroVisuals[unit.hero],position=this.position(unit),time=this.elapsed+this.outro;
    const moving=Math.hypot(unit.x-next.units[index].x,unit.y-next.units[index].y)>1;
    const attack=[...active,...upcoming].findLast(event=>event.actor===unit.id&&event.kind==='damage'&&(event.delivery??'attack')==='attack'&&event.time>time-500);
    const skill=active.findLast(event=>event.actor===unit.id&&['skill','basic'].includes(event.kind));
    const hit=active.findLast(event=>event.target===unit.id&&event.kind==='damage'&&event.amount>0&&event.time>time-220);
    if(unit.hp<=0){if(actor.death<0)actor.death=time;const progress=Math.min(1,(time-actor.death)/650);actor.root.setAlpha(1-progress).setRotation(progress*(unit.side?-.7:.7)).setY(position.y+progress*30);actor.label.setVisible(false);return;}
    const stride=Math.sin(time/95*visual.stride+visual.phase),direction=unit.side?-1:1;
    const role=heroById[unit.hero].role;const isAttacking=!!attack&&unit.stunnedUntil<=time;const amplitude={Tank:.12,Fighter:.24,Assassin:.14,Marksman:.035,Mage:.06,Support:.04}[role];
    const attackPhase=attack?Math.max(0,Math.min(1,(time-attack.time+220)/500)):1;
    actor.root.setPosition(position.x+(isAttacking?Math.sin(attackPhase*Math.PI)*(role==='Assassin'?28:role==='Marksman'?3:12)*direction:0)+(hit?Math.sin((time-hit.time)*.06)*4:0),position.y+(moving?Math.abs(stride)*3:Math.sin(time/700+visual.phase)*2));actor.root.setDepth(position.y).setScale(direction,1);
    actor.body.setRotation(skill&&unit.stunnedUntil<=time?Math.sin((time-skill.time)/800*Math.PI)*(.08+visual.index%5*.025):isAttacking?Math.sin(attackPhase*Math.PI)*amplitude:0);
    if(moving&&!isAttacking&&!skill)actor.body.setRotation(stride*.035);
    actor.body.setTint(hit?0xffb6a6:0xffffff);actor.label.setPosition(position.x,position.y+11).setDepth(1900);
    const size=this.width<800?60:74,barY=position.y-(this.width<800?112:135);
    g.fillStyle(0x050b17,.9);g.fillRoundedRect(position.x-size/2-2,barY-2,size+4,13,3);
    g.fillStyle(unit.side?0xe98193:0x79e0b3);g.fillRect(position.x-size/2,barY,size*unit.hp/unit.maxHp,6);
    g.fillStyle(0xe6ce83);g.fillRect(position.x-size/2,barY+8,size*unit.energy/100,2);
    if(unit.shield>0){g.lineStyle(2,0x9ce8ff,.6);g.strokeEllipse(position.x,position.y-65,100,140);}
    if(unit.stunnedUntil>time){g.lineStyle(2,0xffe49b);g.strokeEllipse(position.x,barY-17,30,9);for(let n=0;n<3;n++){g.fillStyle(0xffe49b);g.fillCircle(position.x+Math.cos(time/200+n*2.1)*18,barY-17+Math.sin(time/200+n*2.1)*5,3);}}
   });
   active.forEach(event=>{
    const source=units.find(unit=>unit.id===event.actor)!,target=units.find(unit=>unit.id===event.target)!;
    const a=this.position(source),b=this.position(target),age=this.elapsed+this.outro-event.time,progress=age/750,visual=heroVisuals[source.hero];
    if(event.kind==='skill'){
     const key=`skill-${event.time}-${event.actor}`;if(!this.shown.has(key)){this.shown.add(key);const rune=this.add.text(a.x,a.y-95,visual.glyph,{fontSize:'68px',color:`#${visual.color.toString(16)}`,stroke:'#06182e',strokeThickness:2}).setOrigin(.5).setDepth(2500);this.tweens.add({targets:rune,scale:1.7,alpha:0,angle:visual.index%2?35:-35,duration:750,onComplete:()=>rune.destroy()});
      const banner=this.add.container(this.width/2,75).setDepth(5000);const plate=this.add.rectangle(0,0,Math.min(520,this.width*.85),58,0x102345,.92).setStrokeStyle(1,visual.color);const title=this.add.text(0,0,`${heroById[source.hero].name} · ${heroById[source.hero].skill.name}`,{fontSize:this.width<800?'17px':'21px',fontFamily:'Arial',color:'#fff0ba'}).setOrigin(.5);banner.add([plate,title]);this.tweens.add({targets:banner,alpha:0,y:60,delay:450,duration:300,onComplete:()=>banner.destroy()});
     }

     const radius=25+progress*(55+visual.index%5*13);g.lineStyle(3,visual.color,1-progress);
     if(visual.index%4===0)g.strokeEllipse(a.x,a.y-40,radius*2,radius);else if(visual.index%4===1){for(let i=0;i<5;i++){const angle=i*Math.PI*.4+progress*4;g.lineBetween(a.x,a.y-50,a.x+Math.cos(angle)*radius,a.y-50+Math.sin(angle)*radius);}}else if(visual.index%4===2)g.strokeCircle(a.x,a.y-65,radius);else{for(let i=0;i<7;i++)g.strokeCircle(a.x+Math.sin(i*2+age/150)*radius,a.y-60+Math.cos(i*2)*radius,5+progress*8);}
    }else if(event.amount>0){
     const color=event.kind==='heal'?0x89ffbd:visual.color;
     if(age<200&&event.delivery!=='dot'){g.lineStyle(3,color,1-age/220);g.lineBetween(a.x,a.y-65,b.x,b.y-65);g.fillStyle(color);g.fillCircle(b.x,b.y-65,6+age/50);}
     for(let i=0;i<5;i++){g.fillStyle(color,1-progress);g.fillCircle(b.x+Math.cos(i*1.3)*progress*36,b.y-65+Math.sin(i*1.3)*progress*36,Math.max(1,4*(1-progress)));}
     const key=`${event.time}-${event.actor}-${event.target}-${event.kind}`;
     if(!this.shown.has(key)){this.shown.add(key);if(event.kind==='damage'&&event.amount>250){this.cameras.main.shake(90,.002);this.hitStop=45;}const number=this.add.text(b.x,b.y-100,String(Math.round(event.amount)),{fontSize:event.amount>250?'26px':'20px',color:event.kind==='heal'?'#98ffd1':'#fff0cd',stroke:'#162039',strokeThickness:4}).setOrigin(.5).setDepth(10000);this.tweens.add({targets:number,y:number.y-35,alpha:0,duration:650,onComplete:()=>number.destroy()});}
    }
   });
   if(this.elapsed>=battle.duration&&this.outro>=750){this.scene.pause();onFinish();}
  }
 };
}
