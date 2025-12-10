

import { GoogleGenAI, Type } from "@google/genai";
import { Player, GameEventResponse, BossTurnResponse, PlayerCombatAction, BossInteractiveEvent, GameMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
Você é "O Sistema" do jogo Dungeon Devys.
Configuração de Dificuldade: DIFÍCIL (HARDCORE).
Idioma: PORTUGUÊS DO BRASIL (PT-BR).
Tom: Autoritário, Sombrio, Misterioso, Sádico com erros.

Diretrizes Críticas:
1. MODO DE JOGO: Verifique se é SOLO ou MULTIPLAYER. Se for SOLO, NUNCA crie dilemas que envolvam abandonar o grupo ou trair aliados que não existem.
2. LOOPS DE ESCOLHA: Se o jogador acabou de tomar uma decisão (resolveu um dilema), você DEVE concluir o arco narrativo imediatamente e NÃO oferecer novas 'choices' no JSON, para permitir que ele volte ao menu principal de exploração.
3. COMBATE E ENCONTROS: Aumente a frequência de inimigos especiais (Elite/Minibosses) que ativam o modo de batalha por turno.
4. COMPANHEIROS: Aumente a chance de encontrar companheiros, mas eles podem ser úteis ou fardos.
5. TRAÇOS (Traits): Use-os para punir ou recompensar.

Schema de Itens deve incluir 'cost' e 'sellValue'.
`;

export const generateDungeonEvent = async (
  players: Player[],
  floor: number,
  action: 'EXPLORE' | 'REST' | 'ANALYZE' | 'ADVANCE_BOSS',
  gameMode: GameMode,
  choiceContext?: string
): Promise<GameEventResponse> => {
  
  const playersDesc = players.map(p => {
    const traitsList = p.traits.map(t => t.name).join(', ');
    return `- ${p.name} (NV ${p.level}): HP ${p.hp}/${p.maxHp}, MP ${p.mp}/${p.maxMp}, Ouro ${p.gold}. Traços: [${traitsList}]. Stats: FOR ${p.stats.strength}, RES ${p.stats.resistance}, PER ${p.stats.perception}, INT ${p.stats.intelligence}.`;
  }).join('\n');

  let promptAction = `Ação do Grupo: ${action}.`;
  let contextAddon = '';
  
  if (choiceContext) {
    promptAction = `DECISÃO TOMADA PELO JOGADOR: "${choiceContext}".`;
    contextAddon = "O jogador fez uma escolha difícil. Resolva esta situação IMEDIATAMENTE. Narre as consequências (boas ou ruins). NÃO GERE NOVAS 'choices' NESTA RESPOSTA, encerre o evento para que o jogo prossiga.";
  }

  const prompt = `
    Modo de Jogo: ${gameMode} (${players.length} Jogadores).
    Contexto: Andar ${floor} do Castelo.
    Jogadores e seus Traços:
    ${playersDesc}
    
    ${promptAction}
    ${contextAddon}
    
    Se EXPLORE: Chance média de ENCONTRO DE COMBATE (isCombatEncounter=true) com inimigos especiais ou encontrar COMPANHEIROS (companionEvent).
    Se o modo for SOLO, ignore lógica de grupo.
    Se ANALYZE: Acha loot escondido (OURO) ou info. Percepção e Inteligência são chaves aqui.
    Se REST: Chance de emboscada.
    
    Responda em JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            outcomes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  playerName: { type: Type.STRING },
                  hpChange: { type: Type.NUMBER },
                  mpChange: { type: Type.NUMBER },
                  xpChange: { type: Type.NUMBER },
                  goldChange: { type: Type.NUMBER, description: "Quantidade de ouro encontrado/ganho" },
                  foundItem: { 
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['WEAPON', 'ARMOR', 'ACCESSORY', 'MATERIAL', 'CONSUMABLE'] },
                      description: { type: Type.STRING },
                      rarity: { type: Type.STRING, enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] },
                      stats: {
                        type: Type.OBJECT,
                        properties: {
                          strength: { type: Type.NUMBER },
                          resistance: { type: Type.NUMBER },
                          perception: { type: Type.NUMBER },
                          intelligence: { type: Type.NUMBER }
                        }
                      },
                      healAmount: { type: Type.NUMBER },
                      quantity: { type: Type.NUMBER },
                      sellValue: { type: Type.NUMBER }
                    },
                    required: ["id", "name", "type", "description", "rarity"]
                  },
                  newSkill: { type: Type.STRING }
                },
                required: ["playerName", "hpChange", "xpChange"]
              }
            },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  riskLevel: { type: Type.STRING, enum: ['LOW', 'HIGH', 'EXTREME'] }
                },
                required: ["id", "text", "riskLevel"]
              }
            },
            companionEvent: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                action: { type: Type.STRING, enum: ['JOIN', 'BETRAY', 'LEAVE'] },
                targetPlayerName: { type: Type.STRING }
              }
            },
            isBossEncounter: { type: Type.BOOLEAN },
            isCombatEncounter: { type: Type.BOOLEAN, description: "True se for um inimigo especial (não boss de andar) que inicia combate por turno." },
            enemyDetails: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                hp: { type: Type.NUMBER },
                weakness: { type: Type.STRING, enum: ['PHYSICAL', 'MAGIC', 'NONE'] },
                isBoss: { type: Type.BOOLEAN }
              }
            },
            questUpdate: { type: Type.STRING }
          },
          required: ["narrative", "outcomes", "isBossEncounter"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GameEventResponse;
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      narrative: "[ERRO DE SISTEMA] Falha na conexão neural.",
      outcomes: [],
      isBossEncounter: false
    };
  }
};

export const generateBossTurn = async (
  players: Player[],
  bossName: string,
  bossHp: number,
  playerActions: PlayerCombatAction[] | 'FLEE' | 'EVENT_RESOLUTION',
  eventChoiceContext?: string
): Promise<BossTurnResponse> => {
    
    const playersDesc = players.map(p => {
        const traitsList = p.traits.map(t => t.name).join(', ');
        return `${p.name} (HP ${p.hp}, MP ${p.mp}, Traits: [${traitsList}])`;
    }).join(', ');

    let actionsDesc = '';
    if (playerActions === 'FLEE') {
      actionsDesc = "O Grupo tenta fugir desesperadamente. Considere se os traços de velocidade (Agil/Lento) afetam o sucesso.";
    } else if (playerActions === 'EVENT_RESOLUTION') {
      actionsDesc = `O grupo reagiu ao evento especial do Boss com: "${eventChoiceContext}". Determine o resultado desta escolha específica. (1 escolha deve ser fatal pro player, 1 fatal pro boss, 1 média).`;
    } else {
      actionsDesc = playerActions.map(a => 
        `${a.playerName} usou ${a.actionType === 'SKILL' ? `Habilidade "${a.skillName}"` : 'Ataque Básico'}`
      ).join('; ');
    }

    const prompt = `
    Combate contra: ${bossName} (HP Atual: ${bossHp}).
    Status dos Jogadores: ${playersDesc}.
    
    Ações do Turno:
    ${actionsDesc}
    
    Se for um turno normal (não Resolution), há 20% de chance de gerar um 'interactiveEvent' (O inimigo prepara um ataque especial e o player tem 3 opções de reação).
    Se for Resolution, calcule o dano massivo baseado na escolha.
    
    Responda em JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        narrative: { type: Type.STRING },
                        playersDmgToBoss: { type: Type.NUMBER },
                        bossDmgToPlayers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    playerName: { type: Type.STRING },
                                    damage: { type: Type.NUMBER }
                                },
                                required: ["playerName", "damage"]
                            }
                        },
                        escapeSuccess: { type: Type.BOOLEAN },
                        interactiveEvent: {
                            type: Type.OBJECT,
                            description: "Evento especial do boss (ex: Baforada de fogo)",
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            text: { type: Type.STRING },
                                            description: { type: Type.STRING }
                                        },
                                        required: ["id", "text", "description"]
                                    }
                                }
                            },
                            required: ["title", "description", "options"]
                        }
                    }
                }
            }
        });
        if(response.text) return JSON.parse(response.text);
        throw new Error("API Fail");
    } catch (e) {
        return { 
          narrative: "O Sistema recalcula as probabilidades...", 
          playersDmgToBoss: 0, 
          bossDmgToPlayers: [], 
          escapeSuccess: false 
        };
    }
}
