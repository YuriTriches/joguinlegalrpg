

import React, { useState, useEffect } from 'react';
import { Player, Trait } from '../types';
import { POSITIVE_TRAITS, NEGATIVE_TRAITS, INITIAL_STATS, BASIC_POTION, RUSTY_DAGGER, HP_PER_LEVEL, MP_PER_LEVEL, HP_PER_RES, MP_PER_INT } from '../constants';
import { Button } from './Button';

interface Props {
  onComplete: (player: Player) => void;
  playerIndex?: number;
  totalPlayers?: number;
}

export const CharacterCreation: React.FC<Props> = ({ onComplete, playerIndex = 1, totalPlayers = 1 }) => {
  const [name, setName] = useState('');
  const [selectedPositives, setSelectedPositives] = useState<Trait[]>([]);
  const [selectedNegatives, setSelectedNegatives] = useState<Trait[]>([]);

  // Reset state when player index changes (for multiplayer loop)
  useEffect(() => {
    setName('');
    setSelectedPositives([]);
    setSelectedNegatives([]);
  }, [playerIndex]);

  const handleTraitToggle = (trait: Trait) => {
    const isPositive = trait.type === 'POSITIVE';
    const currentList = isPositive ? selectedPositives : selectedNegatives;
    const setList = isPositive ? setSelectedPositives : setSelectedNegatives;

    if (currentList.find(t => t.id === trait.id)) {
      setList(currentList.filter(t => t.id !== trait.id));
      return;
    }

    if (currentList.length >= 3) return; // Max 3

    const conflictList = isPositive ? selectedNegatives : selectedPositives;
    if (trait.conflictsWith && conflictList.some(t => trait.conflictsWith?.includes(t.id))) {
      alert(`Este traço entra em conflito com um traço ${isPositive ? 'negativo' : 'positivo'} escolhido.`);
      return;
    }

    setList([...currentList, trait]);
  };

  const handleSubmit = () => {
    if (!name || selectedPositives.length !== 3 || selectedNegatives.length !== 3) {
      alert("Preencha o nome e escolha 3 traços de cada tipo.");
      return;
    }

    let baseStats = { ...INITIAL_STATS };
    
    // Apply trait stat bonuses
    [...selectedPositives, ...selectedNegatives].forEach(t => {
       if (t.statBonus) {
         if (t.statBonus.strength) baseStats.strength += t.statBonus.strength;
         if (t.statBonus.resistance) baseStats.resistance += t.statBonus.resistance;
         if (t.statBonus.perception) baseStats.perception += t.statBonus.perception;
         if (t.statBonus.intelligence) baseStats.intelligence += t.statBonus.intelligence;
       }
    });

    // Calculate Derived Stats
    let maxHp = (1 * HP_PER_LEVEL) + (baseStats.resistance * HP_PER_RES);
    let maxMp = (1 * MP_PER_LEVEL) + (baseStats.intelligence * MP_PER_INT);

    // Apply flat trait HP/MP bonuses
    [...selectedPositives, ...selectedNegatives].forEach(t => {
       if (t.id === 'immortal') maxHp += 50;
       if (t.id === 'frail') maxHp -= 30;
       if (t.id === 'genius') maxMp += 20;
       if (t.id === 'dumb') maxMp -= 10;
    });

    const newPlayer: Player = {
      name,
      level: 1,
      currentXp: 0,
      maxXp: 100,
      hp: maxHp,
      maxHp: maxHp,
      mp: maxMp,
      maxMp: maxMp,
      gold: 100, // Starting gold
      baseStats: baseStats,
      stats: baseStats, // Initially same as base
      statPoints: 0,
      traits: [...selectedPositives, ...selectedNegatives],
      skills: ['Corte Básico'],
      inventory: [{ ...BASIC_POTION, quantity: 2 }, { ...RUSTY_DAGGER }],
      equipment: {
        mainHand: null,
        armor: null,
        accessory: null
      },
      companions: [],
      alignment: 0,
      isMonarchCandidate: false
    };

    onComplete(newPlayer);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900/80 border border-slate-700 rounded-lg shadow-2xl overflow-y-auto max-h-[90vh]">
      <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-500 animate-pulse-glow">PROCESSO DE DESPERTAR</h1>
          {totalPlayers > 1 && (
            <p className="text-yellow-400 font-bold tracking-widest mt-2">CRIANDO JOGADOR {playerIndex} DE {totalPlayers}</p>
          )}
      </div>
      
      <div className="mb-6">
        <label className="block text-slate-400 mb-2">Nome do Caçador</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-950 border border-blue-900 p-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="Digite seu nome..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-emerald-400 font-bold mb-3">Pontos Fortes ({selectedPositives.length}/3)</h3>
          <div className="space-y-2">
            {POSITIVE_TRAITS.map(trait => (
              <div 
                key={trait.id}
                onClick={() => handleTraitToggle(trait)}
                className={`p-3 border cursor-pointer transition-colors ${selectedPositives.find(t => t.id === trait.id) ? 'bg-emerald-900/40 border-emerald-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
              >
                <div className="font-bold text-sm">{trait.name}</div>
                <div className="text-xs text-slate-400">{trait.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-red-400 font-bold mb-3">Pontos Fracos ({selectedNegatives.length}/3)</h3>
          <div className="space-y-2">
            {NEGATIVE_TRAITS.map(trait => (
              <div 
                key={trait.id}
                onClick={() => handleTraitToggle(trait)}
                className={`p-3 border cursor-pointer transition-colors ${selectedNegatives.find(t => t.id === trait.id) ? 'bg-red-900/40 border-red-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
              >
                <div className="font-bold text-sm">{trait.name}</div>
                <div className="text-xs text-slate-400">{trait.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} fullWidth variant="system" disabled={!name || selectedPositives.length < 3 || selectedNegatives.length < 3}>
        {playerIndex === totalPlayers ? 'INICIAR DUNGEON' : 'PRÓXIMO JOGADOR'}
      </Button>
    </div>
  );
};