

export type TraitType = 'POSITIVE' | 'NEGATIVE';

export interface Trait {
  id: string;
  name: string;
  description: string;
  type: TraitType;
  conflictsWith?: string[];
  statBonus?: Partial<Stats>;
}

export interface Stats {
  strength: number;
  resistance: number;
  perception: number;
  intelligence: number;
}

export interface Companion {
  name: string;
  role: string;
  isTraitor: boolean;
  power: number;
}

export type ItemType = 'WEAPON' | 'ARMOR' | 'ACCESSORY' | 'MATERIAL' | 'CONSUMABLE';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  stats?: Partial<Stats>; // Bonus stats for equipment
  healAmount?: number; // For consumables
  sellValue?: number;
  cost?: number; // Price in shop
  quantity?: number; // For stackable items (materials)
}

export interface Equipment {
  mainHand: Item | null;
  armor: Item | null;
  accessory: Item | null;
}

export interface CraftingRecipe {
  id: string;
  result: Item;
  materials: { itemName: string; count: number }[]; // Simple string matching for now or ID based
  requiredLevel: number;
}

export interface Player {
  name: string;
  level: number;
  currentXp: number;
  maxXp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  
  // Base stats (naked)
  baseStats: Stats;
  // Effective stats (with equipment/buffs)
  stats: Stats; 
  
  statPoints: number;
  traits: Trait[];
  skills: string[];
  
  inventory: Item[];
  equipment: Equipment;
  
  companions: Companion[]; // In multiplayer, companions might be shared or personal, keeping personal for now
  alignment: number;
  isMonarchCandidate: boolean;
}

export interface PlayerOutcome {
  playerName: string;
  hpChange: number;
  mpChange?: number;
  xpChange: number;
  goldChange?: number;
  foundItem?: Item;
  newSkill?: string;
}

export interface DilemmaChoice {
  id: string;
  text: string;
  riskLevel: 'LOW' | 'HIGH' | 'EXTREME';
}

export interface GameEventResponse {
  narrative: string;
  outcomes: PlayerOutcome[];
  companionEvent?: {
    name: string;
    role: string;
    action: 'JOIN' | 'BETRAY' | 'LEAVE';
    targetPlayerName?: string; // Who gets the companion
  };
  // Boss = Floor Boss, Combat = Elite/Special Enemy
  isBossEncounter: boolean; 
  isCombatEncounter?: boolean; 
  enemyDetails?: {
    name: string;
    description: string;
    hp: number;
    weakness: 'PHYSICAL' | 'MAGIC' | 'NONE';
    isBoss?: boolean;
  };
  questUpdate?: string;
  choices?: DilemmaChoice[]; // For moral dilemmas
}

export interface BossInteractiveOption {
  id: string;
  text: string; // "Correr na direção dele", "Levantar escudo"
  description: string; // "Tenta um golpe suicida"
}

export interface BossInteractiveEvent {
  title: string; // "O Dragão Inala Fogo!"
  description: string;
  options: BossInteractiveOption[];
}

export interface BossTurnResponse {
  narrative: string;
  bossDmgToPlayers: { playerName: string, damage: number }[];
  playersDmgToBoss: number;
  escapeSuccess: boolean;
  interactiveEvent?: BossInteractiveEvent; // Chance to trigger special event
}

export interface PlayerCombatAction {
  playerName: string;
  actionType: 'ATTACK' | 'SKILL';
  skillName?: string;
}

export type GamePhase = 'MODE_SELECT' | 'PLAYER_COUNT' | 'CREATION' | 'EXPLORATION' | 'EVENT_CHOICE' | 'COMBAT' | 'BOSS_COMBAT' | 'BOSS_EVENT_RESOLVE' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY';
export type GameMode = 'SOLO' | 'MULTIPLAYER';

export type VoteType = 'EXPLORE' | 'REST' | 'ANALYZE' | 'ADVANCE_BOSS';

export interface Vote {
  playerName: string;
  choice: VoteType;
}

export interface LogEntry {
  id: string;
  type: 'SYSTEM' | 'NARRATIVE' | 'COMBAT' | 'GAIN' | 'LOSS' | 'VICTORY';
  text: string;
}
