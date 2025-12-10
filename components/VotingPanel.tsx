
import React from 'react';
import { VoteType } from '../types';
import { Button } from './Button';

interface Props {
  playerName: string;
  totalPlayers: number;
  currentVoteCount: number;
  onVote: (vote: VoteType) => void;
}

export const VotingPanel: React.FC<Props> = ({ playerName, totalPlayers, currentVoteCount, onVote }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="max-w-xl w-full bg-slate-950 border border-blue-600 rounded-lg p-8 shadow-[0_0_50px_rgba(37,99,235,0.2)] flex flex-col items-center">
        
        <h2 className="text-2xl font-bold text-blue-400 mb-2 tracking-[0.2em] uppercase text-center border-b border-blue-900 pb-4 w-full">
          Protocolo de Decisão
        </h2>
        
        <div className="mt-6 mb-8 text-center space-y-2">
           <div className="text-xs text-blue-500 font-mono uppercase tracking-widest">Voto {currentVoteCount} / {totalPlayers}</div>
           <div className="text-3xl text-white font-bold">{playerName}</div>
           <p className="text-slate-400 text-sm">O Sistema aguarda sua escolha.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <Button onClick={() => onVote('EXPLORE')} className="h-24 text-lg flex flex-col items-center justify-center gap-1 border-slate-600 hover:border-white">
            <span>EXPLORAR</span>
            <span className="text-[10px] text-slate-400 font-normal">Risco Médio / XP</span>
          </Button>
          
          <Button onClick={() => onVote('REST')} variant="success" className="h-24 text-lg flex flex-col items-center justify-center gap-1 border-emerald-800 hover:border-emerald-400">
            <span>DESCANSAR</span>
            <span className="text-[10px] text-emerald-300 font-normal">Recuperar HP/MP</span>
          </Button>
          
          <Button onClick={() => onVote('ANALYZE')} variant="system" className="h-24 text-lg flex flex-col items-center justify-center gap-1 border-blue-800 hover:border-blue-400">
            <span>ANALISAR</span>
            <span className="text-[10px] text-blue-300 font-normal">Info / Loot Seguro</span>
          </Button>
          
          <Button onClick={() => onVote('ADVANCE_BOSS')} variant="danger" className="h-24 text-lg flex flex-col items-center justify-center gap-1 border-red-800 hover:border-red-400">
            <span>BOSS</span>
            <span className="text-[10px] text-red-300 font-normal">Combate Mortal</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
