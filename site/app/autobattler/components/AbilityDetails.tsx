import {heroAbilities} from '@/lib/autobattler/abilities';
import type {Hero} from '@/lib/autobattler/catalog';
export default function AbilityDetails({hero,level,index,onClose,onPreview}:{hero:Hero;level:number;index:number;onClose:()=>void;onPreview:()=>void}){
 const ability=heroAbilities(hero,level)[index];
 return <div className="ab-ability-shade" onClick={onClose}><section className="ab-ability-dialog" role="dialog" aria-modal="true" aria-label={ability.type} onClick={event=>event.stopPropagation()}><button className="ab-close" aria-label="Закрыть умение" onClick={onClose}>×</button><h3>{ability.type}</h3><div className={`ab-ability-emblem ab-ability-${index}`}>{ability.glyph}</div><span className="ab-ability-tag">{ability.tag}</span><h2>{ability.name}</h2><p>{ability.description}</p><small>{ability.detail}</small>{index!==2&&<button className="ab-primary" onClick={()=>{onPreview();onClose();}}>Показать способность</button>}</section></div>;
}
