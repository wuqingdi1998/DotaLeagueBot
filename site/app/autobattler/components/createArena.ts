import type PhaserType from 'phaser';
import type {Battle} from '@/lib/autobattler/simulation';
import {heroById} from '@/lib/autobattler/catalog';
export function createArena(Phaser:typeof PhaserType,battle:Battle,control:{current:{isPaused:boolean;speed:number}},onFinish:()=>void){
      class Arena extends Phaser.Scene{
        elapsed=0; graphics!:import('phaser').GameObjects.Graphics;
        labels:import('phaser').GameObjects.Text[]=[]; timer!:import('phaser').GameObjects.Text;
        create(){
          this.graphics=this.add.graphics();
          this.timer=this.add.text(500,20,'',{fontSize:'20px',color:'#e1ecff'}).setOrigin(.5,0);
          this.labels=battle.units.map(unit=>this.add.text(unit.x,unit.y,heroById[unit.hero].name,{fontSize:'16px',color:'#ffffff'}).setOrigin(.5));
        }
        update(_time:number,delta:number){
          if(!control.current.isPaused)this.elapsed=Math.min(battle.duration,this.elapsed+Math.min(delta,200)*control.current.speed);
          const frameIndex=this.elapsed>=battle.duration?battle.frames.length-1:Math.min(battle.frames.length-1,Math.floor(this.elapsed/200));
          const current=battle.frames[frameIndex];
          const next=battle.frames[Math.min(battle.frames.length-1,frameIndex+1)];
          const fraction=Math.min(1,(this.elapsed-current.time)/200);
          const frame={units:current.units.map((unit,index)=>({...unit,
            x:unit.x+(next.units[index].x-unit.x)*fraction,y:unit.y+(next.units[index].y-unit.y)*fraction}))};
          const g=this.graphics;g.clear();g.fillStyle(0x101e34);g.fillRect(0,0,1000,500);
          g.lineStyle(1,0x30475a);for(let y=100;y<500;y+=70)g.lineBetween(20,y,980,y);
          g.fillStyle(0x57d2c5,.08);g.fillEllipse(500,300,900,330);
          g.fillStyle(0x263c55);for(const x of [40,140,860,960]){g.fillRect(x-18,40,36,80);g.fillTriangle(x-28,40,x,6,x+28,40);}
          g.lineStyle(2,0x9bc6d0,.25);g.strokeEllipse(500,300,880,310);
          this.timer.setText(`${(this.elapsed/1000).toFixed(1)} с / ${(battle.duration/1000).toFixed(1)} с`);
          frame.units.forEach((unit,index)=>{
            const label=this.labels[index];label.setVisible(unit.hp>0);if(unit.hp<=0)return;
            const hero=heroById[unit.hero];const bob=Math.sin(this.elapsed/170+index)*2;
            g.fillStyle(0x000000,.3);g.fillEllipse(unit.x,unit.y+31,48,13);
            g.fillStyle(hero.color);g.fillTriangle(unit.x-18,unit.y+22,unit.x,unit.y-23+bob,unit.x+18,unit.y+22);
            g.lineStyle(6,0x394660);g.lineBetween(unit.x-8,unit.y+16,unit.x-12,unit.y+32+bob);g.lineBetween(unit.x+8,unit.y+16,unit.x+12,unit.y+32-bob);
            g.lineStyle(5,hero.color);g.lineBetween(unit.x-10,unit.y-12,unit.x-25,unit.y+8+bob);g.lineBetween(unit.x+10,unit.y-12,unit.x+22,unit.y+4+bob);
            g.fillStyle(0xefd4bb);g.fillCircle(unit.x,unit.y-25+bob,10);
            g.fillStyle(hero.color);g.fillTriangle(unit.x-12,unit.y-29+bob,unit.x,unit.y-45+bob,unit.x+12,unit.y-29+bob);
            g.lineStyle(4,hero.color);g.lineBetween(unit.x+22,unit.y-25,unit.x+22,unit.y+20);
            if(['Mage','Support'].includes(hero.role)){g.fillStyle(0xc2eaff);g.fillCircle(unit.x+22,unit.y-28,6);}
            if(hero.role==='Tank'){g.fillStyle(0x8aadc4);g.fillRoundedRect(unit.x-30,unit.y-15,17,30,5);}
            if(hero.role==='Marksman'){g.lineStyle(2,0xebd8ab);g.strokeEllipse(unit.x+22,unit.y-5,18,46);}
            if(unit.shield>0){g.lineStyle(2,0x80cfff,.8);g.strokeCircle(unit.x,unit.y,33);}
            if(unit.stunnedUntil>this.elapsed){g.fillStyle(0xffdd62);g.fillCircle(unit.x,unit.y-62,6);}
            g.fillStyle(0x07121f);g.fillRect(unit.x-27,unit.y-49,54,7);
            g.fillStyle(unit.side?0xf28299:0x69e1bb);g.fillRect(unit.x-27,unit.y-49,54*unit.hp/unit.maxHp,7);
            g.fillStyle(0x859bff);g.fillRect(unit.x-27,unit.y-39,54*unit.energy/100,3);
            label.setPosition(unit.x,unit.y+44);
          });
          battle.events.filter(event=>event.time<=this.elapsed&&event.time>this.elapsed-220).slice(-14).forEach(event=>{
            const actor=frame.units.find(unit=>unit.id===event.actor)!;const target=frame.units.find(unit=>unit.id===event.target)!;
            g.lineStyle(event.kind==='skill'?5:2,event.kind==='heal'?0x76e5a5:event.kind==='skill'?0xffdc73:0xffffff,.65);
            g.lineBetween(actor.x,actor.y,target.x,target.y);
            if(event.kind==='skill')g.strokeCircle(actor.x,actor.y,35+(this.elapsed-event.time)/8);
          });
          if(this.elapsed>=battle.duration){this.scene.pause();onFinish();}
        }
      }
return Arena;
}
