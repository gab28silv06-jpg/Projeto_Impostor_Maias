# Guia de Testes - O Impostor em Os Maias

## Acesso ao Projeto

O projeto está a correr em tempo real em:
**https://3000-ihbn5adlvxsx65hjrt0o5-eb8846c2.us2.manus.computer**

## Fluxo de Teste

### 1. Página Inicial
1. Acede ao URL acima
2. Deverás ver a página inicial com dois botões:
   - **"Sou Anfitrião"** (amarelo)
   - **"Sou Jogador"** (azul)

**Esperado:** Página com design preto e dourado (chiaroscuro)

---

### 2. Teste como ANFITRIÃO

#### Passo 1: Criar Sala
1. Clica em **"Sou Anfitrião"**
2. Clica no botão **"Criar Nova Sala"**
3. Aguarda a resposta do servidor

**Esperado:**
- Um código de sala (ex: `ABC123`) aparece
- Um QR Code é gerado abaixo do código
- Um botão **"Iniciar Jogo"** aparece (desativado até ter 3+ jogadores)

#### Passo 2: Visualizar Código e QR Code
- O código da sala deve estar visível em **letras grandes e douradas**
- O QR Code deve estar renderizado corretamente
- Copia o código da sala para usar nos testes de jogador

---

### 3. Teste como JOGADOR (Noutra Aba/Dispositivo)

#### Passo 1: Entrar na Sala
1. Abre uma **nova aba anónima** (ou outro dispositivo)
2. Acede ao mesmo URL
3. Clica em **"Sou Jogador"**
4. Insere o teu nome (ex: "João")
5. Insere o código da sala que copiaste do Anfitrião
6. Clica em **"Entrar na Sala"**

**Esperado:**
- Entras na sala com sucesso
- Vês uma mensagem "Aguardando Início do Jogo"
- Vês a lista de jogadores na sala

#### Passo 2: Repetir com Mais Jogadores
1. Abre **mais 2 abas anónimas** (total de 3 jogadores)
2. Repete o processo de entrada para cada uma
3. Volta ao ecrã do **Anfitrião**

**Esperado:**
- No ecrã do Anfitrião, a lista de jogadores atualiza em tempo real
- Quando tiveres 3+ jogadores, o botão **"Iniciar Jogo"** ativa-se (deixa de estar cinzento)

---

### 4. Teste de Iniciar o Jogo

#### No Anfitrião:
1. Clica em **"Iniciar Jogo"** (quando tiveres 3+ jogadores)

**Esperado:**
- O ecrã muda para "Fase de Tarefas"
- Aparece uma tarefa aleatória para os inocentes

#### Nos Jogadores:
1. Volta a cada aba de jogador
2. Deverás ver o teu **ecrã de personagem**

**Esperado:**
- Vês a personagem que te foi atribuída
- Vês a descrição da personagem
- Vês um badge indicando se és **"ÉS O IMPOSTOR"** (vermelho) ou **"ÉS INOCENTE"** (verde)

---

## Checklist de Funcionalidades

### ✅ Implementado e Testável:
- [ ] Página inicial com dois botões
- [ ] Criar sala com código único
- [ ] Gerar QR Code
- [ ] Entrar na sala com nome
- [ ] Lista de jogadores atualiza
- [ ] Botão "Iniciar Jogo" ativa com 3+ jogadores
- [ ] Revelação de personagem e papel

### ⏳ Em Desenvolvimento:
- [ ] Sincronização em tempo real via WebSockets
- [ ] Fases do jogo (Discussão, Votação, Resultado)
- [ ] Sistema de votação
- [ ] Cálculo de vencedor
- [ ] Revelar o Impostor ao final

---

## Problemas Conhecidos

1. **QR Code não funciona ainda** - Aponta para uma rota que não está totalmente integrada
2. **Sincronização de fases** - Ainda não está implementada (sem WebSockets)
3. **Votação** - Interface existe mas sem funcionalidade
4. **Sorteio do Impostor** - Ainda não está implementado

---

## Como Reportar Bugs

Se encontrares problemas:
1. Descreve o que esperavas ver
2. Descreve o que viste realmente
3. Indica em que passo do fluxo aconteceu
4. Tira screenshot se possível

---

## Próximos Passos

Após validar esta versão MVP, será implementado:
1. WebSockets para sincronização em tempo real
2. Sorteio automático do Impostor
3. Sistema de votação funcional
4. Transição entre fases do jogo
5. Cálculo de vencedor
