import { heroById, heroes, rules } from './catalog';
import { grantHero, newProfile, type Profile } from './progression';
export function adminChange(profile:Profile,input:Record<string,unknown>){
  const now=new Date().toISOString();
  const value=Number(input.value);
  switch(input.command){
    case 'tickets':
      if(!Number.isSafeInteger(value)||value<1||value>100000)throw new Error('Укажите от 1 до 100000 билетов');
      profile.tickets=Math.min(1000000,profile.tickets+value);break;
    case 'zero':profile.tickets=0;break;
    case 'all':heroes.forEach(hero=>grantHero(profile,hero.id,now));break;
    case 'hero':if(typeof input.hero!=='string'||!heroById[input.hero])throw new Error('Неизвестный герой');grantHero(profile,input.hero,now);break;
    case 'remove':if(typeof input.hero!=='string')throw new Error('Выберите героя');delete profile.collection[input.hero];profile.team=profile.team.filter(id=>id!==input.hero);break;
    case 'copies':if(typeof input.hero!=='string'||!profile.collection[input.hero]||!Number.isSafeInteger(value)||value<1||value>100000)throw new Error('Проверьте героя и количество');profile.collection[input.hero].count=value;break;
    case 'collection':profile.collection=newProfile().collection;profile.team=newProfile().team;break;
    case 'unlock':if(!Number.isInteger(value)||value<1||value>rules.stageCount)throw new Error(`Этап от 1 до ${rules.stageCount}`);profile.unlocked=value;break;
    case 'campaign':profile.cleared=[];profile.unlocked=1;break;
    case 'clear':if(!Number.isInteger(value)||value<1||value>rules.stageCount)throw new Error(`Этап от 1 до ${rules.stageCount}`);if(!profile.cleared.includes(value))profile.cleared.push(value);profile.unlocked=Math.max(profile.unlocked,Math.min(rules.stageCount,value+1));break;
    case 'rewards':profile.cleared=[];break;
    case 'pity':profile.epic=0;profile.legendary=0;break;
    case 'reset':if(input.confirmation!=='СБРОСИТЬ')throw new Error('Введите СБРОСИТЬ для подтверждения');Object.assign(profile,newProfile());break;
    default:throw new Error('Неизвестное действие');
  }
}
