'use client';
import { useEffect,useState } from 'react';
import { gameRequest, type GameResponse } from '../services/client';
export function useGame(){
  const [data,setData]=useState<GameResponse>();const [error,setError]=useState('');const [isBusy,setBusy]=useState(false);
  useEffect(()=>{let isActive=true;gameRequest().then(value=>{if(isActive)setData(value);}).catch(error=>{if(isActive)setError(error.message);});return()=>{isActive=false;};},[]);
  async function act(input?:Record<string,unknown>){
    setBusy(true);setError('');try{const next=await gameRequest(input);setData(previous=>({...previous,...next}));return next;}catch(error){setError(error instanceof Error?error.message:'Ошибка запроса');}finally{setBusy(false);}
  }
  return {data,error,isBusy,act};
}
