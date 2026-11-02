import { notFound } from 'next/navigation';
import { isDevelopmentSite } from '@/lib/development/environment';
import Game from './components/Game';
export default function Page(){
  if(!isDevelopmentSite())notFound();
  return <Game/>;
}
