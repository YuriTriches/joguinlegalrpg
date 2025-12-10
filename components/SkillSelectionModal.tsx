
import React, { useState } from 'react';
import { Player, PlayerCombatAction } from '../types';
import { Button } from './Button';
import { SKILL_MANA_COST } from '../constants';

interface Props {
  players: Player[];
  onConfirm: (actions: PlayerCombatAction[]) => void;
  onCancel: () => void;
}

export const SkillSelectionModal: React.FC<Props> = ({ players, onConfirm, onCancel }) => {
  // Initialize with first skill or default attack
  const [selections, setSelections] = useState<{[key: string]: string}>(() => {
    const initial: {[key: string]: string} = {};
    players.forEach(p => {
      if (p.hp > 0) {
        // Check if player has mana for first skill
        if (p.skills.length > 0 && p.mp >= SKILL_MANA_COST) {
            initial[p.name] = p.skills[0];
        } else {
            initial[p.name] = 'Ataque Básico';
        }
      }
    });
    return initial;
  });

  const handleConfirm = () => {
    const actions: PlayerCombatAction[] = Object.entries(selections).map(([name, skill]) => ({
      playerName: name,
      actionType: skill === 'Ataque Básico' ? 'ATTACK' : 'SKILL',
      skillName: skill === 'Ataque Básico' ? undefined : skill
    }));
    onConfirm(actions);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-blue-600 w-full max-w-2xl rounded-lg p-6 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
        <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center tracking-widest uppercase">
          Sincronização de Habilidades
        </h2>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6">
          {players.filter(p => p.hp > 0).map(p => (
            <div key={p.name} className="flex flex-col md:flex-row items-center justify-between bg-slate-800 p-4 rounded border border-slate-700">
              <div className="flex items-center gap-3 mb-2 md:mb-0">
                <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center font-bold text-white border border-blue-500">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-200">{p.name}</div>
                  <div className="text-xs text-blue-300">MP: {p.mp}/{p.maxMp}</div>
                </div>
              </div>

              <select 
                className="bg-slate-950 text-white border border-slate-600 p-2 rounded min-w-[200px] focus:border-blue-500 outline-none"
                value={selections[p.name] || ''}
                onChange={(e) => setSelections(prev => ({ ...prev, [p.name]: e.target.value }))}
              >
                <option value="Ataque Básico">Ataque Básico (0 MP)</option>
                {p.skills.map(s => (
                  <option key={s} value={s} disabled={p.mp < SKILL_MANA_COST}>
                    {s} ({SKILL_MANA_COST} MP)
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-end">
          <Button onClick={onCancel} variant="danger">CANCELAR</Button>
          <Button onClick={handleConfirm} variant="success">EXECUTAR COMBO</Button>
        </div>
      </div>
    </div>
  );
};
