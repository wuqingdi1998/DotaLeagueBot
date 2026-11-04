import {starter} from '@/lib/autobattler/catalog';
import {simulateCampaign} from '@/lib/autobattler/campaign';

/** Owner's animation preview uses real combat rules without touching an account or rewards. */
export function combatShowcase(){return simulateCampaign(starter,starter,42,.2);}
