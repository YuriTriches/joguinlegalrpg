# 🐉 Joguin Legal RPG (Dungeon Devys)

**Joguin Legal RPG** é um Dungeon Crawler textual interativo, desenvolvido com **React**, **TypeScript** e alimentado pela **Google Gemini API**.

O jogo apresenta um sistema de "Mestre de RPG" via Inteligência Artificial que gera narrativas, inimigos, itens e consequências baseadas nas escolhas e traços de personalidade dos jogadores.

## 🎮 Funcionalidades

- **Narrativa IA:** O Gemini atua como o Sistema, criando eventos únicos a cada exploração.
- **Sistema de Party:** Jogue sozinho (Solo) ou simule um grupo (Party) com sistema de votação para decisões.
- **Combate Estratégico:** Turn-based combat contra Bosses e Inimigos de Elite com uso de Skills e Mana.
- **Economia & Crafting:** Colete ouro, compre itens na loja ou forje equipamentos com materiais coletados.
- **Consequências Reais:** Traços de personalidade (ex: "Míope", "Gênio") afetam os resultados das ações.
- **Áudio Imersivo:** Trilha sonora dinâmica e efeitos sonoros gerados proceduralmente via Web Audio API.

## 🚀 Como Rodar

Este projeto utiliza módulos ES modernos e importações via CDN, dispensando configurações complexas de build para testes rápidos.

### Pré-requisitos
Você precisará de uma **API Key do Google Gemini**.

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/joguin-legal-rpg.git
   ```

2. Configuração da API Key:
   O projeto espera encontrar a chave em `process.env.API_KEY`.
   
   *Nota: Como este é um projeto front-end puro, para rodar localmente ou em produção, você deve configurar sua variável de ambiente ou utilizar um bundler (como Vite) que suporte injeção de variáveis.*

## 🛠️ Tecnologias

- **Frontend:** React 19, Tailwind CSS
- **Linguagem:** TypeScript
- **AI:** Google GenAI SDK (Gemini 2.5 Flash)
- **Áudio:** Web Audio API (Sintetizadores e Osciladores)

## 📜 Licença

Este projeto é de código aberto. Sinta-se livre para contribuir!