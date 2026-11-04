import orionAtlas from '@/public/autobattler/orion-cutout.json';
import bastionAtlas from '@/public/autobattler/bastion-cutout.json';
import iskraAtlas from '@/public/autobattler/iskra-cutout.json';
import type PhaserType from 'phaser';
import type {Battle} from '@/lib/autobattler/simulation';
import {heroById,stages} from '@/lib/autobattler/catalog';
import {heroVisuals,sceneBackground} from '../model/visuals';
import {battleFrame,clamp,combatTiming,marchingFormation,smooth,spreadPortraitFormation,wavePresentation} from '../model/combatPresentation';
import type {CombatAudio} from '../services/combatAudio';
import {createCombatActor,drawCombatActor,type CombatActor} from './combatActors';
import {createCombatEffects} from './combatEffects';

export interface CombatControl {isPaused:boolean;speed:number;isMuted:boolean}
export interface BattleProgress {wave:number;count:number;phase:'entry'|'fight'|'march'|'boss'}
export function createArena(Phaser:typeof PhaserType,battle:Battle,control:{current:CombatControl},onFinish:()=>void,audio:CombatAudio,onProgress:(progress:BattleProgress)=>void){
 return class Arena extends Phaser.Scene{
  elapsed=0;outro=0;hitStop=0;entryElapsed=0;entryWave=-1;lastCue='';lastTime=-1;lastStep=0;isPreviouslyPaused=false;
  actors:CombatActor[]=[];width=1000;height=700;
  environment!:PhaserType.GameObjects.Image;hud!:PhaserType.GameObjects.Graphics;actorHud!:PhaserType.GameObjects.Graphics;floor!:PhaserType.GameObjects.Graphics;
  clock!:PhaserType.GameObjects.Text;caption!:PhaserType.GameObjects.Text;bossTitle!:PhaserType.GameObjects.Text;
  effects!:ReturnType<typeof createCombatEffects>;
  preload(){
   const atlases={'orion':orionAtlas,'bastion':bastionAtlas,'iskra':iskraAtlas};
   for(const [id,atlas] of Object.entries(atlases))if(battle.units.some(unit=>unit.hero===id))this.load.atlas(`${id}-cutout`,`/autobattler/${id}-cutout.webp`,atlas);
   const stage=stages.find(stage=>stage.team.join(',')===battle.units.filter(unit=>unit.side===1).map(unit=>unit.hero).join(','));
   this.load.image('arena',battle.chapter||stage?`/autobattler/chapter-${battle.chapter??stage?.chapter??1}.webp`:sceneBackground);
   for(const id of new Set(battle.units.map(unit=>unit.hero)))this.load.image(id,heroVisuals[id].texture);
  }
  create(){
   this.width=this.scale.width;this.height=this.scale.height;
   const environment=this.environment=this.add.image(this.width/2,this.height/2,'arena');
   environment.setScale(Math.max(this.width/environment.width,this.height/environment.height)*1.4);
   this.add.rectangle(this.width/2,this.height/2,this.width,this.height,0x05121f,.18);
   this.floor=this.add.graphics().setDepth(1);
   this.actors=battle.units.map(unit=>createCombatActor(Phaser,this,unit,this.width));
   this.actorHud=this.add.graphics().setDepth(2000);
   this.hud=this.add.graphics().setDepth(4000);
   this.effects=createCombatEffects(this,this.width,this.height,audio);
   this.clock=this.add.text(this.width/2,24,'',{fontFamily:'Arial',fontSize:'20px',color:'#f2dfb4',stroke:'#091626',strokeThickness:4}).setOrigin(.5).setDepth(4500);
   this.bossTitle=this.add.text(this.width/2,49,'',{fontFamily:'Arial',fontSize:'15px',color:'#ffdba4',stroke:'#081323',strokeThickness:4}).setOrigin(.5).setDepth(4500);
   this.caption=this.add.text(this.width/2,this.height*.29,'',{fontFamily:'Georgia',fontSize:this.width<800?'29px':'38px',color:'#fff1cf',stroke:'#091626',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(5000);
   void audio.resume();
   this.input.on('pointerdown',()=>void audio.resume());
  }
  update(_time:number,delta:number){
   const settings=control.current,step=Math.min(delta,80)*settings.speed;
   audio.setEnabled(!settings.isMuted&&!settings.isPaused);
   if(settings.isPaused&&!this.isPreviouslyPaused)audio.stop();
   this.isPreviouslyPaused=settings.isPaused;
   let phase=wavePresentation(battle,this.elapsed);
   if(this.entryWave!==phase.index){
    this.entryWave=phase.index;this.entryElapsed=0;
    if(phase.isBoss&&!settings.isMuted)audio.play('boss');
   }
   const opening=phase.isBoss?combatTiming.bossOpening:combatTiming.opening;
   if(!settings.isPaused){
    if(this.entryElapsed<opening)this.entryElapsed+=step;
    else if(this.hitStop>0)this.hitStop=Math.max(0,this.hitStop-step);
    else this.elapsed=Math.min(battle.duration,this.elapsed+step);
    if(this.elapsed>=battle.duration)this.outro+=step;
   }
   phase=wavePresentation(battle,this.elapsed);
   if(this.entryWave!==phase.index){this.entryWave=phase.index;this.entryElapsed=0;if(phase.isBoss&&!settings.isMuted)audio.play('boss');}
   const entry=clamp(this.entryElapsed/(phase.isBoss?combatTiming.bossOpening:combatTiming.opening));
   const progress:BattleProgress={wave:phase.index+1,count:phase.count,phase:phase.isMarching?'march':entry<1?(phase.isBoss?'boss':'entry'):'fight'};
   const cue=`${progress.wave}-${progress.phase}`;
   if(this.lastCue!==cue){this.lastCue=cue;onProgress(progress);}
   this.clock.setText(`${battle.waves?`Волна ${phase.index+1}/${phase.count} · `:''}${Math.floor(this.elapsed/60000)}:${String(Math.floor(this.elapsed/1000)%60).padStart(2,'0')}`);
   const frame=battleFrame(battle,phase.isMarching?battle.waves![phase.index].end:this.elapsed);
   const raw=phase.isMarching?marchingFormation(frame.units,phase.progress):frame.units;
   const next=spreadPortraitFormation(frame.next.units,this.width,this.height),units=spreadPortraitFormation(raw,this.width,this.height),time=this.elapsed+this.outro;
   this.environment.x=this.width/2-phase.environmentOffset*this.width;
   this.floor.clear();
   if(phase.isMarching){
    for(let i=0;i<16;i++){
     const x=((i*137-phase.progress*this.width*.4)%this.width+this.width)%this.width,y=this.height*(.64+(i%4)*.075);
     this.floor.fillStyle(0xdabf92,.12*(1-phase.progress));this.floor.fillEllipse(x,y,14,3);
    }
    if(!settings.isPaused&&!settings.isMuted&&this.elapsed-this.lastStep>340){audio.play('step');this.lastStep=this.elapsed;}
   }
   this.actorHud.clear();
   units.forEach((unit,index)=>drawCombatActor(this.actors[index],unit,next[index],this,this.actorHud,battle.events,time,{width:this.width,height:this.height,isMarching:phase.isMarching,marchProgress:phase.progress,isBoss:unit.id===phase.bossId,entry:smooth(entry),poseTime:time+this.entryElapsed}));
   this.effects.draw(battle.events,units,time,!settings.isMuted&&!settings.isPaused);
   if(battle.events.some(event=>event.time>this.lastTime&&event.time<=this.elapsed&&event.kind==='skill'))this.hitStop=70;
   this.lastTime=this.elapsed;
   this.hud.clear();
   const boss=phase.bossId?units.find(unit=>unit.id===phase.bossId):undefined;
   this.bossTitle.setVisible(!!boss&&boss.hp>0);
   if(boss&&boss.hp>0){
    this.bossTitle.setText(`БОСС · ${heroById[boss.hero].name}`);
    const width=Math.min(380,this.width*.6),x=this.width/2-width/2;
    this.hud.fillStyle(0x06101c,.94);this.hud.fillRoundedRect(x-2,62,width+4,12,3);
    this.hud.fillStyle(0xb85d48);this.hud.fillRect(x,64,width*boss.hp/boss.maxHp,7);
    this.hud.lineStyle(1,0xe0b578,.8);this.hud.strokeRoundedRect(x-2,62,width+4,12,3);
   }
   this.hud.fillStyle(0x081321,(phase.isMarching?phase.curtain:1-smooth(entry/.7))*.85);this.hud.fillRect(0,0,this.width,this.height);
   const isIntro=entry<1;
   this.caption.setVisible(isIntro||phase.isMarching);
   this.caption.setText(phase.isMarching?'Волна пройдена\nОтряд движется дальше':phase.isBoss?`ТРЕТЬЯ ВОЛНА\n${boss?heroById[boss.hero].name:'Босс'}`:`ВОЛНА ${phase.index+1}`);
   this.caption.setAlpha(phase.isMarching?Math.sin(phase.progress*Math.PI)*.9:Math.sin(entry*Math.PI));
   if(phase.isBoss&&isIntro){
    const actor=this.actors[units.findIndex(unit=>unit.id===phase.bossId)];
    if(actor){this.hud.lineStyle(2,0xf0be6f,(1-entry)*.5);this.hud.strokeEllipse(actor.root.x,actor.root.y,80+entry*170,20+entry*40);}
   }
   if(this.elapsed>=battle.duration&&this.outro>=1100){this.scene.pause();audio.stop();onFinish();}
  }
 };
}
