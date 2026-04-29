# O Impostor em Os Maias - TODO

## Base de Dados
- [x] Criar tabela `rooms` (id, code, status, hostId, impostorId, createdAt)
- [x] Criar tabela `players` (id, roomId, userId, name, character, isImpostor, voto, createdAt)
- [x] Criar tabela `characters` (id, name, description)
- [ ] Criar tabela `game_phases` (id, roomId, phase, startedAt)

## Backend (Server)
- [ ] Configurar Socket.io para comunicação em tempo real
- [x] Implementar routers tRPC para gestão de salas
- [x] Implementar routers tRPC para gestão de jogadores
- [x] Implementar lógica de sorteio do Impostor (1 impostor garantido)
- [x] Implementar lógica de distribuição de personagens
- [x] Implementar polling para sincronização de fases
- [ ] Implementar sistema de votação e cálculo de resultados

## Frontend - Interface do Anfitrião (Host)
- [x] Criar página de criação de sala
- [x] Implementar visualização de lista de jogadores em tempo real
- [x] Implementar geração de QR Code
- [x] Implementar botão "Iniciar Jogo" com sorteio do Impostor
- [ ] Implementar botões de controle de fases (Discussão, Votação, Resultado)
- [ ] Implementar visualização de resultados da votação

## Frontend - Interface do Jogador (Mobile-First)
- [x] Criar página de entrada na sala (código ou QR Code)
- [x] Implementar formulário de nome do jogador
- [x] Implementar ecrã de espera (Lobby)
- [x] Implementar ecrã de revelação de personagem e papel (com 1 Impostor garantido)
- [ ] Implementar ecrã de votação funcional
- [ ] Implementar ecrã de resultado final

## Sincronização em Tempo Real
- [ ] Sincronizar transição de fases (Lobby → Jogo → Discussão → Votação → Resultado)
- [ ] Sincronizar entrada/saída de jogadores
- [ ] Sincronizar votos em tempo real
- [ ] Sincronizar revelação do Impostor

## Estética Visual (Chiaroscuro)
- [x] Configurar paleta de cores (preto profundo, dourado quente, cinzento/branco)
- [x] Implementar tipografia bold em maiúsculas
- [x] Adicionar gradientes de cinzento escuro para branco brilhante
- [ ] Implementar efeitos de luz (lens flares, raios de luz subtis)
- [x] Aplicar espaço negativo para amplificar impacto visual
- [ ] Testar contraste e legibilidade em dispositivos móveis

## Testes e Validação
- [ ] Testar fluxo completo do jogo (Host + 3+ Jogadores)
- [ ] Testar sincronização de fases em tempo real
- [ ] Testar sistema de votação
- [ ] Testar QR Code em dispositivos móveis
- [ ] Testar responsividade mobile-first
- [ ] Validar persistência de dados em MySQL

## Deploy
- [ ] Preparar configuração para alojamento (Netlify/Railway)
- [ ] Documentar instruções de setup e deploy
