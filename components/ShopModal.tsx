
import React from 'react';
import { Player, Item } from '../types';
import { SHOP_ITEMS } from '../constants';
import { Button } from './Button';

interface Props {
  player: Player;
  onClose: () => void;
  onBuy: (item: Item) => void;
}

export const ShopModal: React.FC<Props> = ({ player, onClose, onBuy }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-950 border border-yellow-700 w-full max-w-3xl h-[80vh] flex flex-col rounded-lg shadow-[0_0_50px_rgba(161,98,7,0.3)]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-yellow-800 bg-yellow-950/20">
          <div>
            <h2 className="text-xl font-bold text-yellow-500 tracking-wider">MERCADOR DO SISTEMA</h2>
            <p className="text-xs text-slate-400">Ouro Disponível: <span className="text-yellow-400 font-bold text-lg">{player.gold} G</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHOP_ITEMS.map((item, idx) => {
                const canAfford = player.gold >= (item.cost || 9999);
                return (
                    <div key={idx} className="p-4 border border-slate-700 bg-slate-900 rounded flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between">
                                <span className={`font-bold ${item.rarity === 'RARE' ? 'text-blue-400' : 'text-slate-200'}`}>{item.name}</span>
                                <span className="text-yellow-500 font-mono">{item.cost} G</span>
                            </div>
                            <p className="text-xs text-slate-400 my-2">{item.description}</p>
                            {item.stats && (
                                <div className="text-[10px] uppercase text-slate-500">
                                    {Object.entries(item.stats).map(([k,v]) => `${k}: +${v}`).join(', ')}
                                </div>
                            )}
                        </div>
                        <Button 
                            onClick={() => onBuy(item)} 
                            disabled={!canAfford}
                            variant={canAfford ? 'success' : 'system'}
                            className="mt-3 text-sm py-1"
                        >
                            {canAfford ? 'COMPRAR' : 'SEM OURO'}
                        </Button>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};
