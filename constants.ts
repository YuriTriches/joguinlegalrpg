

import { Trait, CraftingRecipe, Item } from './types';

export const SKILL_MANA_COST = 20;

// Multiplicadores de Status
export const HP_PER_RES = 10; // Cada ponto de Resistência dá 10 HP
export const MP_PER_INT = 10; // Cada ponto de Inteligência dá 10 MP
export const HP_PER_LEVEL = 20; // HP ganho base por nível
export const MP_PER_LEVEL = 5;  // MP ganho base por nível

export const POSITIVE_TRAITS: Trait[] = [
  { id: 'agile', name: 'Velocidade Divina', description: '+2 Resistência (Evasão)', type: 'POSITIVE', conflictsWith: ['slow'], statBonus: { resistance: 2 } },
  { id: 'strong', name: 'Força Hercúlea', description: '+2 Força', type: 'POSITIVE', conflictsWith: ['weak'], statBonus: { strength: 2 } },
  { id: 'genius', name: 'Mente Brilhante', description: '+2 Inteligência, +20 MP Base', type: 'POSITIVE', conflictsWith: ['dumb'], statBonus: { intelligence: 2 } },
  { id: 'eagle_eye', name: 'Olhos da Verdade', description: '+2 Percepção', type: 'POSITIVE', conflictsWith: ['blind'], statBonus: { perception: 2 } },
  { id: 'immortal', name: 'Vitalidade Monstruosa', description: '+50 HP Base', type: 'POSITIVE', conflictsWith: ['frail'] },
  { id: 'lucky', name: 'Abençoado pelo Sistema', description: 'Melhores drops e + Ouro', type: 'POSITIVE', conflictsWith: ['unlucky'] },
];

export const NEGATIVE_TRAITS: Trait[] = [
  { id: 'slow', name: 'Pés de Chumbo', description: '-1 Resistência', type: 'NEGATIVE', conflictsWith: ['agile'], statBonus: { resistance: -1 } },
  { id: 'weak', name: 'Atrofia Muscular', description: '-1 Força', type: 'NEGATIVE', conflictsWith: ['strong'], statBonus: { strength: -1 } },
  { id: 'dumb', name: 'Cabeça Oca', description: '-1 Inteligência, -10 MP Base', type: 'NEGATIVE', conflictsWith: ['genius'], statBonus: { intelligence: -1 } },
  { id: 'blind', name: 'Míope', description: '-1 Percepção', type: 'NEGATIVE', conflictsWith: ['eagle_eye'], statBonus: { perception: -1 } },
  { id: 'frail', name: 'Corpo de Vidro', description: '-30 HP Base', type: 'NEGATIVE', conflictsWith: ['immortal'] },
  { id: 'unlucky', name: 'Amaldiçoado', description: 'Mais armadilhas', type: 'NEGATIVE', conflictsWith: ['lucky'] },
];

export const INITIAL_STATS = {
  strength: 10,
  resistance: 10,
  perception: 10,
  intelligence: 10,
};

export const XP_TABLE = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 10000];

// --- ITEMS DATABASE ---

export const BASIC_POTION: Item = {
  id: 'potion_small',
  name: 'Poção de Cura (P)',
  type: 'CONSUMABLE',
  rarity: 'COMMON',
  description: 'Restaura 30 HP.',
  healAmount: 30,
  quantity: 1,
  cost: 50,
  sellValue: 10
};

export const MANA_POTION: Item = {
  id: 'potion_mana',
  name: 'Poção de Mana (P)',
  type: 'CONSUMABLE',
  rarity: 'COMMON',
  description: 'Restaura 30 MP.',
  quantity: 1,
  cost: 75,
  sellValue: 15
};

export const RUSTY_DAGGER: Item = {
  id: 'rusty_dagger',
  name: 'Adaga Enferrujada',
  type: 'WEAPON',
  rarity: 'COMMON',
  description: 'Melhor que nada.',
  stats: { strength: 2 },
  cost: 10,
  sellValue: 1
};

// --- SHOP ITEMS ---
export const SHOP_ITEMS: Item[] = [
  { ...BASIC_POTION },
  { ...MANA_POTION },
  {
    id: 'steel_sword',
    name: 'Espada de Aço',
    type: 'WEAPON',
    rarity: 'COMMON',
    description: 'Equilíbrio perfeito.',
    stats: { strength: 8 },
    cost: 500,
  },
  {
    id: 'leather_armor',
    name: 'Armadura de Couro Reforçado',
    type: 'ARMOR',
    rarity: 'COMMON',
    description: 'Proteção básica.',
    stats: { resistance: 5 },
    cost: 400,
  },
  {
    id: 'magic_amulet',
    name: 'Amuleto Arcano',
    type: 'ACCESSORY',
    rarity: 'RARE',
    description: 'Aumenta a regeneração de mana.',
    stats: { intelligence: 5 },
    cost: 1200,
  },
  {
      id: 'bomb',
      name: 'Bomba de Fumaça',
      type: 'CONSUMABLE',
      rarity: 'COMMON',
      description: 'Aumenta chance de fuga.',
      cost: 150,
      quantity: 1
  }
];


// --- CRAFTING RECIPES ---

export const RECIPES: CraftingRecipe[] = [
  {
    id: 'iron_sword',
    requiredLevel: 2,
    result: {
      id: 'iron_sword',
      name: 'Espada de Ferro',
      type: 'WEAPON',
      rarity: 'COMMON',
      description: 'Uma lâmina decente forjada com ferro da dungeon.',
      stats: { strength: 5, resistance: 1 },
      sellValue: 100
    },
    materials: [
      { itemName: 'Minério de Ferro', count: 3 },
      { itemName: 'Couro de Monstro', count: 1 }
    ]
  },
  {
    id: 'hunter_vest',
    requiredLevel: 3,
    result: {
      id: 'hunter_vest',
      name: 'Colete do Caçador',
      type: 'ARMOR',
      rarity: 'RARE',
      description: 'Leve e resistente.',
      stats: { resistance: 5 } as any,
      sellValue: 200
    },
    materials: [
      { itemName: 'Couro de Monstro', count: 5 },
      { itemName: 'Essência Mágica', count: 1 }
    ]
  },
  {
    id: 'magic_ring',
    requiredLevel: 5,
    result: {
      id: 'magic_ring',
      name: 'Anel de Mana',
      type: 'ACCESSORY',
      rarity: 'EPIC',
      description: 'Pulsa com energia azul.',
      stats: { intelligence: 8, perception: 3 },
      sellValue: 500
    },
    materials: [
      { itemName: 'Cristal de Mana', count: 2 },
      { itemName: 'Ouro da Dungeon', count: 1 }
    ]
  },
  {
    id: 'mega_potion',
    requiredLevel: 1,
    result: {
      id: 'potion_large',
      name: 'Poção Grande',
      type: 'CONSUMABLE',
      rarity: 'RARE',
      description: 'Restaura 100 HP.',
      healAmount: 100,
      quantity: 1,
      sellValue: 50
    },
    materials: [
      { itemName: 'Erva Medicinal', count: 3 },
      { itemName: 'Água Purificada', count: 1 }
    ]
  }
];