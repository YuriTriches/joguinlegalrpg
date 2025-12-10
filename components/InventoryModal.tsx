
import React, { useState } from 'react';
import { Player, Item, CraftingRecipe } from '../types';
import { RECIPES } from '../constants';
import { Button } from './Button';
import { audio } from '../services/audioService';

interface Props {
  player: Player;
  onClose: () => void;
  onEquip: (item: Item) => void;
  onUnequip: (slot: 'mainHand' | 'armor' | 'accessory') => void;
  onUse: (item: Item) => void;
  onCraft: (recipe: CraftingRecipe) => void;
}

export const InventoryModal: React.FC<Props> = ({ player, onClose, onEquip, onUnequip, onUse, onCraft }) => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'EQUIP' | 'SKILLS' | 'CRAFT'>('ITEMS');

  const handleTabChange = (tab: 'ITEMS' | 'EQUIP' | 'SKILLS' | 'CRAFT') => {
      audio.playClick();
      setActiveTab(tab);
  }

  const getRarityColor = (rarity?: string) => {
    switch(rarity) {
      case 'LEGENDARY': return 'text-orange-400 border-orange-500 bg-orange-950/20';
      case 'EPIC': return 'text-purple-400 border-purple-500 bg-purple-950/20';
      case 'RARE': return 'text-blue-400 border-blue-500 bg-blue-950/20';
      default: return 'text-slate-300 border-slate-700 bg-slate-900';
    }
  };

  const renderItemCard = (item: Item, actionLabel: string, onAction: () => void) => (
    <div key={item.id + Math.random()} className={`p-3 border rounded flex justify-between items-center mb-2 ${getRarityColor(item.rarity)}`}>
      <div>
        <div className="font-bold">{item.name} {(item.quantity && item.quantity > 1) ? `x${item.quantity}` : ''}</div>
        <div className="text-xs opacity-70">{item.description}</div>
        {item.stats && (
           <div className="text-[10px] uppercase mt-1">
             {Object.entries(item.stats).map(([k,v]) => `${k.slice(0,3)}: +${v} `).join(' | ')}
           </div>
        )}
      </div>
      <Button variant="system" className="text-xs py-1 px-3" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-950 border border-blue-900 w-full max-w-4xl h-[80vh] flex flex-col rounded-lg shadow-[0_0_50px_rgba(30,58,138,0.5)]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-blue-900 bg-blue-950/30">
          <div>
            <h2 className="text-xl font-bold text-blue-400 tracking-wider">SISTEMA DE INVENTÁRIO</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Caçador: <span className="text-white font-bold">{player.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {['ITEMS', 'EQUIP', 'SKILLS', 'CRAFT'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              className={`flex-1 py-3 font-bold text-sm tracking-widest transition-colors
                ${activeTab === tab ? 'bg-blue-900/50 text-white border-b-2 border-blue-400' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}
              `}
            >
              {tab === 'ITEMS' && 'MOCHILA'}
              {tab === 'EQUIP' && 'EQUIPAR'}
              {tab === 'SKILLS' && 'SKILLS'}
              {tab === 'CRAFT' && 'FORJAR'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          
          {/* INVENTORY TAB */}
          {activeTab === 'ITEMS' && (
            <div className="space-y-2">
              {player.inventory.length === 0 && <div className="text-center text-slate-500 mt-10">Inventário Vazio.</div>}
              {player.inventory.map((item) => {
                if (item.type === 'WEAPON' || item.type === 'ARMOR' || item.type === 'ACCESSORY') {
                  return renderItemCard(item, 'EQUIPAR', () => onEquip(item));
                }
                if (item.type === 'CONSUMABLE') {
                   return renderItemCard(item, 'USAR', () => onUse(item));
                }
                return (
                  <div key={item.id + Math.random()} className="p-3 border border-slate-700 bg-slate-900 rounded flex justify-between items-center text-slate-400">
                    <div>
                      <div className="font-bold text-slate-300">{item.name} {(item.quantity && item.quantity > 1) ? `x${item.quantity}` : ''}</div>
                      <div className="text-xs">{item.description}</div>
                      <div className="text-[10px] uppercase mt-1 text-slate-500">Material de Crafting</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EQUIPMENT TAB */}
          {activeTab === 'EQUIP' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Paper Doll */}
               <div className="flex flex-col gap-4 items-center justify-center p-6 bg-slate-950 rounded border border-slate-800">
                  <div className="w-full text-center text-blue-500 font-bold mb-4">SLOTS ATIVOS</div>
                  
                  {/* Main Hand */}
                  <div className="w-full flex items-center justify-between p-3 border border-slate-700 rounded bg-slate-900/80">
                    <span className="text-xs text-slate-500 uppercase">Arma</span>
                    {player.equipment.mainHand ? (
                      <div className="flex items-center gap-2">
                        <span className={getRarityColor(player.equipment.mainHand.rarity).split(' ')[0]}>{player.equipment.mainHand.name}</span>
                        <button onClick={() => onUnequip('mainHand')} className="text-red-500 text-xs hover:underline">Remover</button>
                      </div>
                    ) : <span className="text-slate-600">Vazio</span>}
                  </div>

                  {/* Armor */}
                  <div className="w-full flex items-center justify-between p-3 border border-slate-700 rounded bg-slate-900/80">
                    <span className="text-xs text-slate-500 uppercase">Armadura</span>
                    {player.equipment.armor ? (
                      <div className="flex items-center gap-2">
                        <span className={getRarityColor(player.equipment.armor.rarity).split(' ')[0]}>{player.equipment.armor.name}</span>
                        <button onClick={() => onUnequip('armor')} className="text-red-500 text-xs hover:underline">Remover</button>
                      </div>
                    ) : <span className="text-slate-600">Vazio</span>}
                  </div>

                  {/* Accessory */}
                  <div className="w-full flex items-center justify-between p-3 border border-slate-700 rounded bg-slate-900/80">
                    <span className="text-xs text-slate-500 uppercase">Acessório</span>
                    {player.equipment.accessory ? (
                      <div className="flex items-center gap-2">
                        <span className={getRarityColor(player.equipment.accessory.rarity).split(' ')[0]}>{player.equipment.accessory.name}</span>
                        <button onClick={() => onUnequip('accessory')} className="text-red-500 text-xs hover:underline">Remover</button>
                      </div>
                    ) : <span className="text-slate-600">Vazio</span>}
                  </div>
               </div>

               {/* Stats Summary */}
               <div className="p-6 bg-slate-950 rounded border border-slate-800">
                  <div className="text-center text-blue-500 font-bold mb-4">STATUS TOTAIS</div>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex justify-between">
                      <span>FORÇA</span>
                      <span className="text-blue-300">{player.stats.strength} <span className="text-slate-500 text-xs">({player.baseStats.strength} + {player.stats.strength - player.baseStats.strength})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>RESISTÊNCIA</span>
                      <span className="text-blue-300">{player.stats.resistance} <span className="text-slate-500 text-xs">({player.baseStats.resistance} + {player.stats.resistance - player.baseStats.resistance})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>PERCEPÇÃO</span>
                      <span className="text-blue-300">{player.stats.perception} <span className="text-slate-500 text-xs">({player.baseStats.perception} + {player.stats.perception - player.baseStats.perception})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>INTELIGÊNCIA</span>
                      <span className="text-blue-300">{player.stats.intelligence} <span className="text-slate-500 text-xs">({player.baseStats.intelligence} + {player.stats.intelligence - player.baseStats.intelligence})</span></span>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* SKILLS TAB */}
          {activeTab === 'SKILLS' && (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {player.skills.length === 0 && <div className="text-slate-500 col-span-3 text-center">Nenhuma habilidade aprendida ainda.</div>}
                {player.skills.map(skill => (
                  <div key={skill} className="p-4 bg-slate-950 border border-blue-900/30 rounded flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors">
                    <div className="text-blue-300 font-bold mb-1">{skill}</div>
                    <div className="text-[10px] text-slate-500">Habilidade Ativa</div>
                  </div>
                ))}
             </div>
          )}

          {/* CRAFTING TAB */}
          {activeTab === 'CRAFT' && (
            <div className="space-y-4">
               {RECIPES.map(recipe => {
                 const canCraft = recipe.materials.every(mat => {
                   const inInv = player.inventory.find(i => i.name === mat.itemName);
                   return inInv && (inInv.quantity || 1) >= mat.count;
                 });
                 
                 const levelReqMet = player.level >= recipe.requiredLevel;

                 return (
                   <div key={recipe.id} className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex-1">
                        <div className={`font-bold text-lg ${getRarityColor(recipe.result.rarity).split(' ')[0]}`}>{recipe.result.name}</div>
                        <div className="text-sm text-slate-400">{recipe.result.description}</div>
                        <div className="text-xs mt-2 text-slate-500 flex gap-2">
                           {recipe.materials.map((m, idx) => {
                              const inInv = player.inventory.find(i => i.name === m.itemName);
                              const current = inInv?.quantity || 0;
                              return (
                                <span key={idx} className={current >= m.count ? 'text-emerald-500' : 'text-red-500'}>
                                  {m.itemName}: {current}/{m.count}
                                </span>
                              );
                           })}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                         {!levelReqMet && <span className="text-xs text-red-500">Requer Nível {recipe.requiredLevel}</span>}
                         <Button 
                           variant={canCraft && levelReqMet ? 'success' : 'system'} 
                           disabled={!canCraft || !levelReqMet}
                           onClick={() => onCraft(recipe)}
                         >
                           FORJAR
                         </Button>
                      </div>
                   </div>
                 );
               })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
