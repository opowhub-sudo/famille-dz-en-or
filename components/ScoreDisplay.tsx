
import React from 'react';
import { Team } from '../types';

interface ScoreDisplayProps {
  name: string;
  score: number;
  team: Team;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ name, score, team }) => {
  const isTeamA = team === Team.A;
  
  return (
    <div className={`flex flex-col ${isTeamA ? 'items-start' : 'items-end'} w-32 md:w-48`}>
      <div className={`text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ${isTeamA ? 'text-left' : 'text-right'}`}>
        {name}
      </div>
      <div className={`relative w-full h-16 md:h-20 bg-slate-950 border-4 ${isTeamA ? 'border-green-600' : 'border-red-600'} rounded-2xl flex items-center justify-center overflow-hidden shadow-xl`}>
        <div className={`absolute inset-0 opacity-20 ${isTeamA ? 'bg-green-600' : 'bg-red-600'}`}></div>
        <span className="relative font-game text-4xl md:text-5xl text-white gold-glow">{score}</span>
      </div>
    </div>
  );
};

export default ScoreDisplay;
