
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameRoom, GameState, Team, User, Question } from './types';
import { INITIAL_QUESTIONS } from './constants';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import AdminPanel from './components/AdminPanel';
import SoundService from './services/SoundService';

const SESSION_KEY = 'famille_dz_session_v3';
const ROOM_KEY = 'famille_dz_room_v3';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const isLoggingOut = useRef(false);

  useEffect(() => {
    const savedUser = localStorage.getItem(SESSION_KEY);
    const savedRoom = localStorage.getItem(ROOM_KEY);
    
    if (savedRoom) {
      try {
        const parsedRoom = JSON.parse(savedRoom);
        setRoom(parsedRoom);
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          const userExists = parsedRoom.users.find((u: User) => u.id === parsedUser.id);
          if (userExists) setUser(userExists);
        }
      } catch (e) {
        console.error("Storage load error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggingOut.current) return;
    if (room) localStorage.setItem(ROOM_KEY, JSON.stringify(room));
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }, [user, room]);

  const handleLogout = useCallback(() => {
    if (!window.confirm("Voulez-vous vraiment quitter la partie ?")) return;

    isLoggingOut.current = true;

    if (user && room && !user.isHost) {
      const updatedUsers = room.users.filter(u => u.id !== user.id);
      const updatedRoom = { ...room, users: updatedUsers };
      localStorage.setItem(ROOM_KEY, JSON.stringify(updatedRoom));
    }

    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRoom(null);
    setError(null);
    
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 200);
  }, [user, room]);

  const createRoom = (nickname: string) => {
    const code = "DZ-OR";
    const hostId = "host-" + Math.random().toString(36).substr(2, 9);
    const host: User = { id: hostId, nickname, team: Team.NONE, isCaptain: false, isHost: true, score: 0 };
    const freshQuestions = JSON.parse(JSON.stringify(INITIAL_QUESTIONS)).map((q: Question) => ({
      ...q,
      answers: q.answers.map(a => ({ ...a, revealed: false }))
    }));

    const newRoom: GameRoom = {
      code, state: GameState.LOBBY, hostId, teamAName: "Famille A", teamBName: "Famille B",
      teamAScore: 0, teamBScore: 0, roundScore: 0, strikes: 0, currentQuestionId: 1,
      activeTeam: Team.NONE, diceResults: {}, users: [host], activeQuestions: freshQuestions
    };
    setRoom(newRoom);
    setUser(host);
    SoundService.play('tada');
  };

  const joinRoom = (nickname: string, code: string) => {
    const savedRoom = localStorage.getItem(ROOM_KEY);
    if (!savedRoom) { setError("L'animateur n'a pas encore lancé le salon."); return; }
    
    const existingRoom = JSON.parse(savedRoom) as GameRoom;
    if (existingRoom.code !== code.toUpperCase()) { setError("Code de salon invalide."); return; }

    const newUser: User = { id: "user-" + Math.random().toString(36).substr(2, 9), nickname, team: Team.NONE, isCaptain: false, isHost: false, score: 0 };
    const updatedRoom = { ...existingRoom, users: [...existingRoom.users, newUser] };
    setRoom(updatedRoom);
    setUser(newUser);
    setError(null);
  };

  const handleAction = useCallback((type: string, payload: any) => {
    if (!room || isPaused) return;
    let next = JSON.parse(JSON.stringify(room)) as GameRoom;

    switch (type) {
      case 'DISCONNECT_USER':
        next.users = next.users.filter(u => u.id !== payload.userId);
        break;
      case 'JOIN_TEAM':
        next.users = next.users.map(u => u.id === payload.userId ? { ...u, team: payload.team, isCaptain: payload.isCaptain ?? u.isCaptain } : u);
        break;
      case 'START_DUEL':
        next.state = GameState.DUEL;
        next.diceResults = {};
        next.activeTeam = Team.NONE;
        break;
      case 'SET_ACTIVE_TEAM':
        next.activeTeam = payload.team;
        SoundService.play('ding');
        break;
      case 'ROLL_DICE':
        next.diceResults[payload.rollerId] = payload.value;
        SoundService.play('dice_roll');
        const captains = next.users.filter(u => u.isCaptain && u.team !== Team.NONE);
        if (captains.every(c => next.diceResults[c.id])) {
          const resA = next.diceResults[captains.find(c => c.team === Team.A)?.id || ''];
          const resB = next.diceResults[captains.find(c => c.team === Team.B)?.id || ''];
          if (resA && resB && resA !== resB) next.activeTeam = resA > resB ? Team.A : Team.B;
        }
        break;
      case 'START_ROUND':
        next.state = GameState.ROUND;
        next.strikes = 0;
        next.roundScore = 0;
        break;
      case 'REVEAL_ANSWER':
        const qIdx = next.activeQuestions.findIndex(q => q.id === next.currentQuestionId);
        const aIdx = next.activeQuestions[qIdx].answers.findIndex(a => a.id === payload.answerId);
        if (!next.activeQuestions[qIdx].answers[aIdx].revealed) {
          next.activeQuestions[qIdx].answers[aIdx].revealed = true;
          next.roundScore += next.activeQuestions[qIdx].answers[aIdx].points;
          SoundService.play('ding');
          if (next.state === GameState.STEAL) {
             handleAction('END_ROUND', { winnerTeam: next.activeTeam === Team.A ? Team.B : Team.A });
             return;
          }
        }
        break;
      case 'ADD_STRIKE':
        next.strikes = Math.min(3, next.strikes + 1);
        SoundService.play('buzzer');
        if (next.strikes === 3) handleAction('TRIGGER_STEAL', {});
        break;
      case 'TRIGGER_STEAL':
        next.state = GameState.STEAL;
        break;
      case 'END_ROUND':
        if (payload.winnerTeam === Team.A) next.teamAScore += next.roundScore;
        else if (payload.winnerTeam === Team.B) next.teamBScore += next.roundScore;
        next.state = GameState.LOBBY;
        next.currentQuestionId++;
        next.roundScore = 0;
        next.strikes = 0;
        next.activeTeam = Team.NONE;
        if (next.currentQuestionId > next.activeQuestions.length) next.state = GameState.FINISHED;
        SoundService.play('tada');
        break;
      case 'RESET_GAME':
        localStorage.removeItem(ROOM_KEY);
        window.location.reload();
        return;
    }
    setRoom(next);
  }, [room, isPaused]);

  if (!user || !room) return <Lobby onJoin={joinRoom} onCreate={createRoom} error={error} />;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-hidden">
      <div className={`md:w-1/3 lg:w-1/4 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto ${user.isHost ? 'block' : 'hidden md:block'}`}>
        {user.isHost ? (
          <AdminPanel room={room} onAction={handleAction} isPaused={isPaused} onTogglePause={() => setIsPaused(!isPaused)} onLogout={handleLogout} />
        ) : (
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-yellow-500 font-game text-xl">MON PROFIL</span>
              <button onClick={handleLogout} className="w-10 h-10 bg-red-900/20 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                <i className="fas fa-power-off"></i>
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold text-lg">{user.nickname}</p>
              <p className="text-slate-500 text-[10px] uppercase font-black">Salon: {room.code}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center overflow-y-auto">
        <GameBoard room={room} user={user} onRoll={(v) => handleAction('ROLL_DICE', { rollerId: user.id, value: v })} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default App;
