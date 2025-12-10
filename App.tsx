

import React, { useState, useEffect, useRef } from 'react';
import { Player, GamePhase, LogEntry, Stats, Item, Equipment, CraftingRecipe, GameMode, DilemmaChoice, PlayerCombatAction, Vote, VoteType, BossInteractiveEvent, BossInteractiveOption } from './types';
import { CharacterCreation } from './components/CharacterCreation';
import { Button } from './components/Button';
import { InventoryModal } from './components/InventoryModal';
import { SkillSelectionModal } from './components/SkillSelectionModal';
import { VotingPanel } from './components/VotingPanel';
import { ShopModal } from './components/ShopModal';
import { generateDungeonEvent, generateBossTurn } from './services/geminiService';
import { audio } from './services/audioService';
import { XP_TABLE, SKILL_MANA_COST, HP_PER_LEVEL, MP_PER_LEVEL, HP_PER_RES, MP_PER_INT } from './constants';

function App() {
  const [phase, setPhase] = useState<GamePhase>('MODE_SELECT');
  const [gameMode, setGameMode] = useState<GameMode>('SOLO');
  const [targetPlayerCount, setTargetPlayerCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Players State
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0); 
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [floor, setFloor] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bossCombat, setBossCombat] = useState<{name: string, hp: number, maxHp: number, isBoss: boolean} | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showShop, setShowShop] = useState(false);
  
  // Features
  const [pendingDilemma, setPendingDilemma] = useState<DilemmaChoice[] | null>(null);
  const [showSkillSelection, setShowSkillSelection] = useState(false);
  const [bossEvent, setBossEvent] = useState<BossInteractiveEvent | null>(null);

  // Voting State
  const [votingState, setVotingState] = useState<{
    votes: Vote[];
    currentPlayerIndex: number;
    isActive: boolean;
  }>({ votes: [], currentPlayerIndex: 0, isActive: false });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const activePlayer = players[activePlayerIndex];

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Audio BGM Logic based on Phase
  useEffect(() => {
    if (phase === 'EXPLORATION' || phase === 'EVENT_CHOICE') {
      audio.playBGM('EXPLORATION');
    } else if (phase === 'BOSS_COMBAT' || phase === 'BOSS_EVENT_RESOLVE') {
      if (bossCombat?.isBoss) {
        audio.playBGM('BOSS');
      } else {
        audio.playBGM('COMBAT');
      }
    } else if (phase === 'CREATION' || phase === 'MODE_SELECT') {
       // Maybe silence or intro? Keep silence for now or exploration
       audio.playBGM('REST');
    }
  }, [phase, bossCombat]);

  const toggleMute = () => {
    const muted = audio.toggleMute();
    if (muted !== undefined) setIsMuted(muted);
  };

  const addLog = (text: string, type: LogEntry['type'] = 'SYSTEM') => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), type, text }]);
  };

  // Centralized Logic to Recalculate Stats based on Equip + Base + Traits + Level
  const recalculatePlayerStats = (player: Player): Player => {
      // 1. Calculate Total Attributes from Base + Equipment
      const newStats = { ...player.baseStats };
      const equip = player.equipment;
      
      [equip.mainHand, equip.armor, equip.accessory].forEach(item => {
        if (item && item.stats) {
          if (item.stats.strength) newStats.strength += item.stats.strength;
          if (item.stats.resistance) newStats.resistance += item.stats.resistance;
          if (item.stats.perception) newStats.perception += item.stats.perception;
          if (item.stats.intelligence) newStats.intelligence += item.stats.intelligence;
        }
      });

      // 2. Calculate Max HP/MP based on Total Stats
      let newMaxHp = (player.level * HP_PER_LEVEL) + (newStats.resistance * HP_PER_RES);
      let newMaxMp = (player.level * MP_PER_LEVEL) + (newStats.intelligence * MP_PER_INT);

      // 3. Apply Flat Trait Bonuses
      player.traits.forEach(t => {
          if(t.id === 'immortal') newMaxHp += 50;
          if(t.id === 'frail') newMaxHp -= 30;
          if(t.id === 'genius') newMaxMp += 20;
          if(t.id === 'dumb') newMaxMp -= 10;
      });

      const currentHp = Math.min(player.hp, newMaxHp);
      const currentMp = Math.min(player.mp, newMaxMp);

      return {
          ...player,
          stats: newStats,
          maxHp: newMaxHp,
          maxMp: newMaxMp,
          hp: currentHp, 
          mp: currentMp
      };
  };

  const updatePlayer = (index: number, updates: Partial<Player>) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      let updatedPlayer = { ...newPlayers[index], ...updates };

      // If anything that affects stats changed, recalculate
      if (updates.baseStats || updates.equipment || updates.level || updates.traits) {
         updatedPlayer = recalculatePlayerStats(updatedPlayer);
      }
      
      newPlayers[index] = updatedPlayer;
      return newPlayers;
    });
  };

  const handleModeSelect = (mode: GameMode) => {
    audio.init(); // Init audio engine on first gesture
    setGameMode(mode);
    if (mode === 'SOLO') {
      setTargetPlayerCount(1);
      setPhase('CREATION');
    } else {
      setPhase('PLAYER_COUNT');
    }
  };

  const startCreation = (count: number) => {
    setTargetPlayerCount(count);
    setPhase('CREATION');
  };

  const handleCharacterCreated = (createdPlayer: Player) => {
    setPlayers(prev => [...prev, createdPlayer]);
    
    if (players.length + 1 < targetPlayerCount) {
      addLog(`Jogador ${createdPlayer.name} registrado. Próximo...`, 'SYSTEM');
    } else {
      setPhase('EXPLORATION');
      addLog(`Grupo formado. O Sistema escolheu vocês.`, 'SYSTEM');
      addLog(`Entrando no Andar ${floor}...`, 'NARRATIVE');
      setActivePlayerIndex(0);
    }
  };

  // --- Inventory & Shop ---

  const handleEquipItem = (item: Item) => {
    if (!activePlayer) return;
    let slot: keyof Equipment | null = null;
    if (item.type === 'WEAPON') slot = 'mainHand';
    else if (item.type === 'ARMOR') slot = 'armor';
    else if (item.type === 'ACCESSORY') slot = 'accessory';

    if (!slot) return;

    audio.playClick();
    const currentEquip = activePlayer.equipment[slot];
    const newInventory = activePlayer.inventory.filter(i => i !== item);
    
    if (currentEquip) {
      newInventory.push(currentEquip);
    }

    updatePlayer(activePlayerIndex, {
      inventory: newInventory,
      equipment: {
        ...activePlayer.equipment,
        [slot]: item
      }
    });
    addLog(`${activePlayer.name} equipou ${item.name}.`, 'SYSTEM');
  };

  const handleUnequipItem = (slot: keyof Equipment) => {
    if (!activePlayer || !activePlayer.equipment[slot]) return;
    const item = activePlayer.equipment[slot]!;
    
    audio.playClick();
    updatePlayer(activePlayerIndex, {
      inventory: [...activePlayer.inventory, item],
      equipment: {
        ...activePlayer.equipment,
        [slot]: null
      }
    });
    addLog(`${activePlayer.name} desequipou ${item.name}.`, 'SYSTEM');
  };

  const handleUseItem = (item: Item) => {
    if (!activePlayer || item.type !== 'CONSUMABLE') return;

    let newInventory = [...activePlayer.inventory];
    const index = newInventory.findIndex(i => i.id === item.id);
    if (index === -1) return;

    if (newInventory[index].quantity && newInventory[index].quantity! > 1) {
      newInventory[index] = { ...newInventory[index], quantity: newInventory[index].quantity! - 1 };
    } else {
      newInventory.splice(index, 1);
    }

    updatePlayer(activePlayerIndex, { inventory: newInventory });

    if (item.healAmount) {
      const heal = item.healAmount;
      const newHp = Math.min(activePlayer.maxHp, activePlayer.hp + heal);
      updatePlayer(activePlayerIndex, { hp: newHp });
      addLog(`${activePlayer.name} usou ${item.name}. Recuperou ${heal} HP.`, 'GAIN');
      audio.playItemFound(); // Sound reuse for potion
    }

    if (item.id.includes('mana')) {
        const newMp = Math.min(activePlayer.maxMp, activePlayer.mp + 30);
        updatePlayer(activePlayerIndex, { mp: newMp });
        addLog(`${activePlayer.name} usou ${item.name}. Recuperou 30 MP.`, 'GAIN');
        audio.playItemFound();
    }
  };

  const handleCraftItem = (recipe: CraftingRecipe) => {
    if (!activePlayer) return;
    
    let newInventory = [...activePlayer.inventory];
    
    for (const mat of recipe.materials) {
       const invItemIndex = newInventory.findIndex(i => i.name === mat.itemName);
       if (invItemIndex === -1) return; 
       
       const item = newInventory[invItemIndex];
       if ((item.quantity || 1) === mat.count) {
          newInventory.splice(invItemIndex, 1);
       } else {
          newInventory[invItemIndex] = { ...item, quantity: (item.quantity || 1) - mat.count };
       }
    }

    newInventory.push(recipe.result);
    updatePlayer(activePlayerIndex, { inventory: newInventory });
    addLog(`${activePlayer.name} forjou: ${recipe.result.name}!`, 'GAIN');
    audio.playLevelUp(); // Victory-like sound for crafting
  };

  const handleBuyItem = (item: Item) => {
      if (!activePlayer) return;
      if (activePlayer.gold < (item.cost || 9999)) {
          addLog("Ouro insuficiente.", 'SYSTEM');
          return;
      }

      updatePlayer(activePlayerIndex, {
          gold: activePlayer.gold - (item.cost || 0),
          inventory: [...activePlayer.inventory, item]
      });
      addLog(`${activePlayer.name} comprou ${item.name} por ${item.cost} G.`, 'GAIN');
      audio.playItemFound();
  };

  const handleRenameCompanion = (playerIdx: number, compIdx: number) => {
    const p = players[playerIdx];
    const companion = p.companions[compIdx];
    const newName = window.prompt(`Renomear ${companion.name} para:`, companion.name);
    
    if (newName && newName.trim() !== "") {
      const newCompanions = [...p.companions];
      newCompanions[compIdx] = { ...companion, name: newName.trim() };
      updatePlayer(playerIdx, { companions: newCompanions });
      addLog(`Companheiro renomeado para ${newName}.`, 'SYSTEM');
    }
  };

  // --- XP & Level Up ---
  const gainXp = (playerIdx: number, amount: number) => {
    const p = players[playerIdx];
    let newXp = p.currentXp + amount;
    let newLevel = p.level;
    let leveledUp = false;
    let pointsToAdd = 0;

    while (newXp >= p.maxXp) {
      newXp -= p.maxXp;
      newLevel++;
      leveledUp = true;
      pointsToAdd += 4;
    }

    if (leveledUp) {
      updatePlayer(playerIdx, { 
        currentXp: newXp, 
        level: newLevel, 
        maxXp: XP_TABLE[newLevel - 1] || 100000, 
        statPoints: p.statPoints + pointsToAdd,
      });
      // Force heal after level up
      setPlayers(prev => {
         const pl = prev[playerIdx];
         return prev.map((curr, i) => i === playerIdx ? { ...curr, hp: curr.maxHp, mp: curr.maxMp } : curr);
      });

      addLog(`${p.name} SUBIU PARA O NÍVEL ${newLevel}!`, 'GAIN');
      audio.playLevelUp();
    } else {
      updatePlayer(playerIdx, { currentXp: newXp });
    }
  };

  const handleStatUpgrade = (stat: keyof Stats) => {
    if (!activePlayer || activePlayer.statPoints <= 0) return;
    updatePlayer(activePlayerIndex, {
      baseStats: { ...activePlayer.baseStats, [stat]: activePlayer.baseStats[stat] + 1 },
      statPoints: activePlayer.statPoints - 1
    });
    audio.playClick();
  };

  // --- Multiplayer Voting System ---
  const startVote = () => {
    setVotingState({
      votes: [],
      currentPlayerIndex: 0,
      isActive: true
    });
  };

  const handleVote = (voteType: VoteType) => {
    const currentPlayer = players[votingState.currentPlayerIndex];
    const newVotes = [...votingState.votes, { playerName: currentPlayer.name, choice: voteType }];
    
    if (newVotes.length === players.length) {
      // Voting finished
      setVotingState({ ...votingState, votes: newVotes, isActive: false });
      resolveVotes(newVotes);
    } else {
      setVotingState({ ...votingState, votes: newVotes, currentPlayerIndex: votingState.currentPlayerIndex + 1 });
    }
  };

  const resolveVotes = (votes: Vote[]) => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.choice] = (counts[v.choice] || 0) + 1;
    });

    // Find winner
    let maxVotes = 0;
    let winningAction: VoteType | null = null;
    let isTie = false;

    Object.entries(counts).forEach(([action, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningAction = action as VoteType;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    if (isTie || !winningAction) {
       const options: VoteType[] = ['EXPLORE', 'REST', 'ANALYZE']; 
       const systemPick = options[Math.floor(Math.random() * options.length)];
       addLog(`Empate na votação. O Sistema impõe sua vontade: ${systemPick}.`, 'SYSTEM');
       handleDungeonAction(systemPick);
    } else {
       addLog(`Decisão do Grupo: ${winningAction}.`, 'SYSTEM');
       handleDungeonAction(winningAction);
    }
  };

  // --- Gameplay Actions ---
  const handleDungeonAction = async (action: 'EXPLORE' | 'REST' | 'ANALYZE' | 'ADVANCE_BOSS', choiceText?: string) => {
    if (players.every(p => p.hp <= 0) || isLoading) return;
    setIsLoading(true);
    setPendingDilemma(null); 

    if (action === 'REST') {
       audio.playBGM('REST');
    }

    try {
      const livingPlayers = players.filter(p => p.hp > 0);
      const result = await generateDungeonEvent(livingPlayers, floor, action, gameMode, choiceText);
      
      addLog(result.narrative, 'NARRATIVE');
      
      // LOGIC FIX: Only set EVENT_CHOICE if there are new choices.
      // If we provided a context (resolution), we assume the event is concluding.
      if (result.choices && result.choices.length > 0) {
        setPendingDilemma(result.choices);
        setPhase('EVENT_CHOICE');
        setIsLoading(false);
        return; 
      } else {
        // Return to normal exploration if no more choices
        setPhase('EXPLORATION');
      }

      let someoneHurt = false;

      result.outcomes.forEach(outcome => {
          const idx = players.findIndex(p => p.name === outcome.playerName);
          if (idx === -1) return;

          const p = players[idx];
          
          if (outcome.hpChange !== 0) {
              const newHp = Math.min(p.maxHp, Math.max(0, p.hp + outcome.hpChange));
              updatePlayer(idx, { hp: newHp });
              addLog(`${p.name}: ${outcome.hpChange > 0 ? `+${outcome.hpChange} HP` : `${outcome.hpChange} HP`}`, outcome.hpChange > 0 ? 'GAIN' : 'LOSS');
              if (outcome.hpChange < 0) someoneHurt = true;
          }

           if (outcome.mpChange && outcome.mpChange !== 0) {
              const newMp = Math.min(p.maxMp, Math.max(0, p.mp + outcome.mpChange));
              updatePlayer(idx, { mp: newMp });
          }

          if (outcome.xpChange > 0) gainXp(idx, outcome.xpChange);
          
          if (outcome.goldChange) {
              updatePlayer(idx, { gold: p.gold + outcome.goldChange });
              addLog(`${p.name} ganhou ${outcome.goldChange} G.`, 'GAIN');
          }

          if (outcome.foundItem) {
             const existingItemIndex = p.inventory.findIndex(i => i.name === outcome.foundItem!.name && i.type === outcome.foundItem!.type);
             let newInv = [...p.inventory];
             if (existingItemIndex > -1 && outcome.foundItem.quantity) {
                 newInv[existingItemIndex].quantity = (newInv[existingItemIndex].quantity || 1) + (outcome.foundItem.quantity || 1);
             } else {
                 newInv.push(outcome.foundItem);
             }
             updatePlayer(idx, { inventory: newInv });
             addLog(`${p.name} encontrou: ${outcome.foundItem.name}`, 'GAIN');
             audio.playItemFound();
          }

          if (outcome.newSkill) {
             updatePlayer(idx, { skills: [...p.skills, outcome.newSkill] });
             addLog(`${p.name} aprendeu: ${outcome.newSkill}`, 'GAIN');
          }
      });

      if (someoneHurt) audio.playDamage();
      else if (action === 'EXPLORE') audio.playCombatSlash(); // Generic exploration sound

      if (players.every(p => p.hp <= 0)) {
           setPhase('GAME_OVER');
           setIsLoading(false);
           return;
      }

      if (result.companionEvent && result.companionEvent.action === 'JOIN') {
          let targetIdx = 0;
          if (result.companionEvent.targetPlayerName) {
            const foundIdx = players.findIndex(p => p.name === result.companionEvent.targetPlayerName);
            if (foundIdx > -1) targetIdx = foundIdx;
          }
          const p = players[targetIdx];
          updatePlayer(targetIdx, { companions: [...p.companions, { 
            name: result.companionEvent.name, 
            role: result.companionEvent.role, 
            isTraitor: Math.random() < 0.2, 
            power: Math.floor(p.level * 1.5)
          }]});
          addLog(`${result.companionEvent.name} se juntou ao grupo (Líder: ${p.name}).`, 'GAIN');
      }

      // HANDLE SPECIAL COMBAT OR BOSS
      if ((result.isBossEncounter || result.isCombatEncounter) && result.enemyDetails) {
        setBossCombat({
          name: result.enemyDetails.name,
          hp: result.enemyDetails.hp,
          maxHp: result.enemyDetails.hp,
          isBoss: !!result.enemyDetails.isBoss
        });
        setPhase('BOSS_COMBAT'); // Reusing BOSS_COMBAT phase for all turn-based fights
        addLog(`ALERTA: INIMIGO HOSTIL ${result.enemyDetails.name} DETECTADO!`, 'COMBAT');
        audio.playDamage(); 
      } else if (action === 'ADVANCE_BOSS' && !result.isBossEncounter) {
         // Fallback manual trigger
         setBossCombat({ name: `Guardião do Andar ${floor}`, hp: floor * 1000 * players.length, maxHp: floor * 1000 * players.length, isBoss: true });
         setPhase('BOSS_COMBAT');
         audio.playDamage();
      }

    } catch (e) {
      addLog("Erro de conexão com o Sistema.", 'SYSTEM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveDilemma = (choice: DilemmaChoice) => {
    addLog(`Decisão: ${choice.text}`, 'SYSTEM');
    // Pass the context of the choice to Gemini so it resolves it
    handleDungeonAction('EXPLORE', choice.text);
  };

  const handleResolveBossEvent = async (option: BossInteractiveOption) => {
    if (!bossCombat) return;
    setPhase('BOSS_COMBAT');
    setBossEvent(null);
    addLog(`O grupo escolheu: ${option.text}`, 'SYSTEM');
    // We send this as a special turn to the boss logic
    await handleBossCombatTurn('EVENT_RESOLUTION', option.text);
  };

  const handleBossCombatTurn = async (actions: PlayerCombatAction[] | 'FLEE' | 'EVENT_RESOLUTION', eventContext?: string) => {
    if (!bossCombat) return;
    setIsLoading(true);
    setShowSkillSelection(false);
    
    let finalActions = actions;
    if (typeof actions !== 'string' && actions.length === 0) {
        finalActions = players.filter(p => p.hp > 0).map(p => ({
            playerName: p.name,
            actionType: 'ATTACK'
        }));
    }

    // Deduct MP if Skills used
    if (Array.isArray(finalActions)) {
        finalActions.forEach(action => {
            if (action.actionType === 'SKILL') {
                const pIndex = players.findIndex(p => p.name === action.playerName);
                if (pIndex > -1) {
                    const p = players[pIndex];
                    if (p.mp >= SKILL_MANA_COST) {
                        updatePlayer(pIndex, { mp: p.mp - SKILL_MANA_COST });
                    } else {
                        action.actionType = 'ATTACK';
                        action.skillName = undefined;
                        addLog(`${p.name} sem mana! Usou ataque básico.`, 'SYSTEM');
                    }
                }
            }
        });
    }

    const livingPlayers = players.filter(p => p.hp > 0);
    const result = await generateBossTurn(livingPlayers, bossCombat.name, bossCombat.hp, finalActions, eventContext);
    addLog(result.narrative, 'COMBAT');
    
    audio.playCombatSlash();

    if (result.escapeSuccess && actions === 'FLEE') {
      setPhase('EXPLORATION');
      addLog("O grupo conseguiu fugir.", 'SYSTEM');
      setBossCombat(null);
      setIsLoading(false);
      return;
    }

    const newBossHp = bossCombat.hp - result.playersDmgToBoss;
    setBossCombat(prev => prev ? { ...prev, hp: newBossHp } : null);

    result.bossDmgToPlayers.forEach(dmgEntry => {
        const idx = players.findIndex(p => p.name === dmgEntry.playerName);
        if (idx > -1) {
            const newHp = players[idx].hp - dmgEntry.damage;
            updatePlayer(idx, { hp: newHp });
            if (newHp <= 0) addLog(`${players[idx].name} caiu inconsciente!`, 'LOSS');
        }
    });
    
    if (result.bossDmgToPlayers.length > 0) {
        setTimeout(() => audio.playDamage(), 200);
    }

    if (players.every(p => p.hp <= 0)) {
      setPhase('GAME_OVER');
    } else if (newBossHp <= 0) {
      addLog(`${bossCombat.isBoss ? 'BOSS' : 'INIMIGO'} DERROTADO!`, 'VICTORY');
      players.forEach((p, i) => {
          if (p.hp > 0) {
              const xpGain = bossCombat.isBoss ? 2000 * floor : 500 * floor;
              const goldGain = bossCombat.isBoss ? 500 * floor : 100 * floor;
              gainXp(i, xpGain);
              updatePlayer(i, { gold: p.gold + goldGain });
          }
      });
      addLog(`Recompensa: ${bossCombat.isBoss ? 500 * floor : 100 * floor} Ouro.`, 'GAIN');
      audio.playLevelUp();
      
      if (bossCombat.isBoss && floor >= 3) {
        setPhase('VICTORY');
      } else if (bossCombat.isBoss) {
        setFloor(prev => prev + 1);
        setPhase('EXPLORATION');
        setBossCombat(null);
        addLog(`Avançando para o Andar ${floor + 1}...`, 'SYSTEM');
      } else {
        setPhase('EXPLORATION');
        setBossCombat(null);
      }
    } else {
        // Enemy is still alive, check for interactive event
        if (result.interactiveEvent) {
            setBossEvent(result.interactiveEvent);
            setPhase('BOSS_EVENT_RESOLVE');
            audio.playDamage(); // Alert
        }
    }
    setIsLoading(false);
  };

  const openSkillSelection = () => {
    setShowSkillSelection(true);
  };

  const triggerAction = (action: VoteType) => {
    if (gameMode === 'MULTIPLAYER') {
      startVote();
    } else {
      handleDungeonAction(action);
    }
  };

  const renderStatBar = (label: string, val: number, max: number, color: string) => (
    <div className="w-full mb-2">
      <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
        <span>{label}</span>
        <span>{Math.floor(val)}/{max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${color}`} 
          style={{ width: `${Math.max(0, Math.min(100, (val / max) * 100))}%` }}
        ></div>
      </div>
    </div>
  );

  if (phase === 'MODE_SELECT') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 gap-6">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-700 tracking-widest animate-pulse-glow text-center">
            JOGUIN LEGAL RPG
            </h1>
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
                <Button onClick={() => handleModeSelect('SOLO')} className="flex-1 py-8 text-xl" variant="system">SOLO</Button>
                <Button onClick={() => handleModeSelect('MULTIPLAYER')} className="flex-1 py-8 text-xl" variant="primary">PARTY</Button>
            </div>
        </div>
    );
  }

  if (phase === 'PLAYER_COUNT') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
              <h2 className="text-2xl text-blue-400 mb-6">QUANTOS JOGADORES?</h2>
              <div className="flex gap-4">
                  {[2, 3, 4].map(n => (
                      <Button key={n} onClick={() => startCreation(n)} className="px-8 py-4 text-2xl">{n}</Button>
                  ))}
              </div>
          </div>
      )
  }

  if (phase === 'CREATION') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <CharacterCreation 
            onComplete={handleCharacterCreated} 
            playerIndex={players.length + 1}
            totalPlayers={targetPlayerCount}
        />
      </div>
    );
  }

  if (phase === 'GAME_OVER' || phase === 'VICTORY') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-center p-4">
            <h1 className={`text-6xl font-bold mb-4 ${phase === 'VICTORY' ? 'text-blue-500' : 'text-red-600'}`}>
                {phase === 'VICTORY' ? 'O GRUPO CONQUISTOU A DUNGEON' : 'O GRUPO FOI ELIMINADO'}
            </h1>
            <Button onClick={() => window.location.reload()}>REINICIAR SISTEMA</Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row max-w-7xl mx-auto p-2 gap-2 md:gap-4 md:p-6 overflow-hidden max-h-screen relative">
      
      <button 
        onClick={toggleMute}
        className="fixed bottom-4 right-4 z-50 p-2 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-400 hover:text-white"
      >
        {isMuted ? 'SOM DESLIGADO' : 'SOM LIGADO'}
      </button>

      {(phase === 'EXPLORATION' || phase === 'COMBAT' || phase === 'BOSS_COMBAT' || phase === 'EVENT_CHOICE' || phase === 'BOSS_EVENT_RESOLVE') && (
        <div className="absolute top-0 right-0 m-4 z-40 bg-blue-950/80 px-4 py-2 border border-blue-500 rounded-bl-xl text-blue-300 font-rajdhani font-bold text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          ANDAR {floor}
        </div>
      )}

      {showInventory && activePlayer && (
        <InventoryModal 
          player={activePlayer} 
          onClose={() => setShowInventory(false)} 
          onEquip={handleEquipItem}
          onUnequip={handleUnequipItem}
          onUse={handleUseItem}
          onCraft={handleCraftItem}
        />
      )}

      {showShop && activePlayer && (
          <ShopModal
            player={activePlayer}
            onClose={() => setShowShop(false)}
            onBuy={handleBuyItem}
          />
      )}

      {showSkillSelection && (
        <SkillSelectionModal 
          players={players}
          onConfirm={handleBossCombatTurn}
          onCancel={() => setShowSkillSelection(false)}
        />
      )}

      {/* LEFT: Players List & Active Player Stats */}
      <div className="w-full md:w-1/4 bg-slate-900/90 border border-slate-700 flex flex-col rounded shadow-lg overflow-y-auto">
        <div className="p-2 bg-slate-950 border-b border-slate-800 flex gap-2 overflow-x-auto">
             {players.map((p, idx) => (
                 <button 
                    key={idx}
                    onClick={() => setActivePlayerIndex(idx)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
                        ${idx === activePlayerIndex ? 'border-blue-500 bg-blue-900 text-white' : 'border-slate-700 bg-slate-800 text-slate-500'}
                        ${p.hp <= 0 ? 'opacity-50 grayscale' : ''}
                    `}
                    title={p.name}
                 >
                    {p.name.charAt(0).toUpperCase()}
                 </button>
             ))}
        </div>

        {activePlayer && (
          <div className="p-4 space-y-4">
             <div className="text-center">
                 <h2 className="text-xl font-bold text-blue-200">{activePlayer.name}</h2>
                 <span className="text-xs text-slate-500">Nível {activePlayer.level}</span>
                 <div className="text-yellow-500 text-sm font-bold mt-1">
                     {activePlayer.gold} G
                 </div>
             </div>

            {renderStatBar("HP", activePlayer.hp, activePlayer.maxHp, activePlayer.hp <= 0 ? "bg-slate-700" : "bg-red-600")}
            {renderStatBar("MP", activePlayer.mp, activePlayer.maxMp, "bg-blue-400")}
            {renderStatBar("XP", activePlayer.currentXp, activePlayer.maxXp, "bg-green-600")}
            
            <div className="grid grid-cols-2 gap-2 text-sm mt-4 border-t border-slate-700 pt-4">
               <div className="flex justify-between"><span>FOR:</span> <span className="text-blue-300">{activePlayer.stats.strength}</span></div>
               <div className="flex justify-between" title="Define HP Máximo"><span>RES:</span> <span className="text-blue-300">{activePlayer.stats.resistance}</span></div>
               <div className="flex justify-between"><span>PER:</span> <span className="text-blue-300">{activePlayer.stats.perception}</span></div>
               <div className="flex justify-between" title="Define MP Máximo"><span>INT:</span> <span className="text-blue-300">{activePlayer.stats.intelligence}</span></div>
            </div>

            {activePlayer.statPoints > 0 && (
                <div className="mt-4 p-2 border border-yellow-600/50 bg-yellow-900/10 text-center animate-pulse">
                    <p className="text-yellow-500 text-xs mb-2">PONTOS: {activePlayer.statPoints}</p>
                    <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => handleStatUpgrade('strength')} className="text-xs bg-slate-800 p-1 hover:bg-blue-900">+ FOR</button>
                        <button onClick={() => handleStatUpgrade('resistance')} className="text-xs bg-slate-800 p-1 hover:bg-blue-900">+ RES</button>
                        <button onClick={() => handleStatUpgrade('perception')} className="text-xs bg-slate-800 p-1 hover:bg-blue-900">+ PER</button>
                        <button onClick={() => handleStatUpgrade('intelligence')} className="text-xs bg-slate-800 p-1 hover:bg-blue-900">+ INT</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
                <Button onClick={() => setShowInventory(true)} fullWidth variant="system" className="text-sm" disabled={activePlayer.hp <= 0}>
                INVENTÁRIO
                </Button>
                <Button onClick={() => setShowShop(true)} fullWidth variant="system" className="text-sm border-yellow-600 text-yellow-500" disabled={activePlayer.hp <= 0}>
                LOJA
                </Button>
            </div>

            <div className="mt-4 border-t border-slate-700 pt-4">
              <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">COMPANHEIROS ({activePlayer.companions.length})</h3>
              {activePlayer.companions.map((comp, idx) => (
                <div key={idx} className="bg-slate-800/50 p-2 rounded border border-slate-700 flex justify-between items-center group mb-1">
                  <div>
                    <div className="text-xs font-bold text-blue-300">{comp.name}</div>
                    <div className="text-[10px] text-slate-400">{comp.role}</div>
                  </div>
                  <button onClick={() => handleRenameCompanion(activePlayerIndex, idx)} className="text-[10px] text-slate-500 hover:text-yellow-400">✏️</button>
                </div>
              ))}
              {activePlayer.companions.length === 0 && <span className="text-xs text-slate-600">Nenhum</span>}
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Logs */}
      <div className="flex-1 flex flex-col border border-slate-700 bg-black relative rounded overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent h-12 pointer-events-none z-10"></div>
        
        {phase === 'BOSS_COMBAT' && bossCombat && (
            <div className="absolute top-4 left-4 right-4 z-20">
                <div className="text-center text-red-500 font-bold uppercase text-xl mb-1 drop-shadow-md">{bossCombat.name}</div>
                <div className="h-4 w-full bg-slate-900 border border-red-900">
                    <div className="h-full bg-red-600 transition-all duration-300" style={{width: `${(bossCombat.hp / bossCombat.maxHp) * 100}%`}}></div>
                </div>
            </div>
        )}

        {/* BOSS EVENT OVERLAY */}
        {phase === 'BOSS_EVENT_RESOLVE' && bossEvent && (
            <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-6 animate-fade-in">
                <div className="max-w-xl w-full text-center space-y-6">
                    <h2 className="text-3xl font-bold text-red-500 animate-pulse">{bossEvent.title}</h2>
                    <p className="text-lg text-white italic">{bossEvent.description}</p>
                    <div className="flex flex-col gap-3">
                        {bossEvent.options.map((opt, idx) => (
                            <Button 
                                key={idx} 
                                onClick={() => handleResolveBossEvent(opt)} 
                                className="py-4 text-lg border-red-500 hover:bg-red-900/40"
                            >
                                {opt.text} <span className="block text-xs text-slate-400">{opt.description}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* VOTING OVERLAY */}
        {votingState.isActive && (
            <VotingPanel 
                playerName={players[votingState.currentPlayerIndex].name}
                totalPlayers={players.length}
                currentVoteCount={votingState.votes.length + 1}
                onVote={handleVote}
            />
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-16">
          {logs.map(log => (
            <div key={log.id} className={`p-3 rounded border-l-2 animate-fade-in text-sm md:text-base font-medium
              ${log.type === 'SYSTEM' ? 'border-blue-500 bg-blue-950/20 text-blue-200' : ''}
              ${log.type === 'NARRATIVE' ? 'border-slate-500 text-slate-300 italic' : ''}
              ${log.type === 'COMBAT' ? 'border-red-500 bg-red-950/20 text-red-200' : ''}
              ${log.type === 'GAIN' ? 'border-emerald-500 bg-emerald-950/10 text-emerald-200' : ''}
              ${log.type === 'LOSS' ? 'border-orange-500 text-orange-200' : ''}
              ${log.type === 'VICTORY' ? 'border-yellow-500 bg-yellow-950/20 text-yellow-200' : ''}
            `}>
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="w-full md:w-1/5 bg-slate-900 border border-slate-700 p-4 flex flex-col gap-4 justify-end rounded">
        {phase === 'EXPLORATION' && !votingState.isActive && (
            <>
              <Button onClick={() => triggerAction('EXPLORE')} disabled={isLoading} className="h-16">EXPLORAR</Button>
              <Button onClick={() => triggerAction('ANALYZE')} disabled={isLoading} variant="system">ANALISAR</Button>
              <Button onClick={() => triggerAction('REST')} disabled={isLoading} variant="success">DESCANSAR</Button>
              <div className="h-4"></div>
              <Button onClick={() => triggerAction('ADVANCE_BOSS')} disabled={isLoading} variant="danger">BOSS DO ANDAR</Button>
            </>
        )}
        {phase === 'EVENT_CHOICE' && pendingDilemma && (
           <div className="flex flex-col gap-3 animate-pulse-glow">
             <div className="text-center text-yellow-400 font-bold mb-2">ESCOLHA NECESSÁRIA</div>
             {pendingDilemma.map(choice => (
               <Button 
                key={choice.id} 
                onClick={() => handleResolveDilemma(choice)}
                variant={choice.riskLevel === 'EXTREME' ? 'danger' : 'primary'}
                className="py-4 text-sm"
               >
                 {choice.text}
               </Button>
             ))}
           </div>
        )}
        {phase === 'BOSS_COMBAT' && (
            <>
                <Button onClick={() => handleBossCombatTurn([])} disabled={isLoading} className="h-16 border-red-500 text-red-100">ATAQUE BÁSICO</Button>
                <Button onClick={openSkillSelection} disabled={isLoading} variant="system">COMBINAR SKILLS</Button>
                <Button onClick={() => handleBossCombatTurn('FLEE')} disabled={isLoading} variant="danger">FUGIR</Button>
            </>
        )}
        {(phase === 'LEVEL_UP' && activePlayer && activePlayer.statPoints > 0) && (
            <div className="text-center p-2 border border-yellow-500/30">
                <p className="text-yellow-500 mb-2 text-sm">{activePlayer.name} subiu de nível!</p>
                <p className="text-xs text-slate-400">Distribua pontos no painel esquerdo.</p>
            </div>
        )}
        {(phase === 'LEVEL_UP' && players.every(p => p.statPoints === 0)) && (
             <Button onClick={() => setPhase('EXPLORATION')} variant="system">CONTINUAR</Button>
        )}
      </div>
    </div>
  );
}

export default App;
