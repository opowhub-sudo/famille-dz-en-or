
import React from 'react';
import { Answer } from '../types';

interface AnswerCardProps {
  index: number;
  answer: Answer;
  revealed: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ index, answer, revealed }) => {
  return (
    <div className="relative w-full h-16 md:h-20 perspective-1000">
      <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${revealed ? 'rotate-x-180' : ''}`}>
        {/* Face Cachée (Côté Joueur) */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 rounded-xl flex items-center px-4 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-yellow-500/50 flex items-center justify-center text-yellow-500 font-game text-2xl shadow-inner">
            {index}
          </div>
          <div className="flex-1 flex justify-center items-center px-4">
             <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full w-1/4 bg-yellow-500/20 animate-pulse"></div>
             </div>
          </div>
        </div>

        {/* Face Révélée */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-b from-yellow-400 to-yellow-600 border-2 border-yellow-300 rounded-xl flex items-center justify-between px-6 shadow-2xl rotate-x-180">
          <span className="font-game text-2xl md:text-3xl text-slate-900 uppercase truncate pr-4 drop-shadow-sm">
            {revealed ? answer.text : ""}
          </span>
          <div className="h-full flex items-center justify-center border-l-2 border-slate-900/20 pl-4">
            <span className="font-game text-4xl text-slate-950">{revealed ? answer.points : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnswerCard;
