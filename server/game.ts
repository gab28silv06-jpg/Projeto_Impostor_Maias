import { WebSocket } from 'ws';

export interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  character?: string;
  role?: 'Inocente' | 'Impostor';
  response?: string;
  vote?: string;
}

export interface GameState {
  phase: 'lobby' | 'waiting' | 'task' | 'discussion' | 'voting' | 'results' | 'game-over';
  players: Player[];
  impostorId?: string;
  secretWord?: string;
  currentTask?: string;
  responses: Map<string, string>;
  votes: Map<string, string>;
}

const PERSONAGENS = [
  'Maria Eduarda Runa',
  'Maria Monforte',
  'Maria Eduarda',
  'Vilaça',
  'Dâmaso Salcede',
  'Alencar',
  'Palma Cavalão',
];

const TAREFAS = [
  'Explique um acontecimento importante do livro.',
  'Descreva a relação entre duas personagens.',
  'Fale sobre um tema da obra (ex: crítica social, decadência, amor).',
  'Fale como se fosse sua personagem por 30 segundos.',
  'Diga uma característica marcante da sua personagem.',
  'Conte um momento marcante envolvendo Carlos da Maia.',
];

const CONCEITOS = [
  'Incesto',
  'O Ramalhete',
  'Decadência',
  'Lisboa',
  'Educação Britânica',
  'Sintra',
];

export class GameManager {
  private gameState: GameState = {
    phase: 'lobby',
    players: [],
    responses: new Map(),
    votes: new Map(),
  };

  addPlayer(id: string, name: string, socket: WebSocket): void {
    const player: Player = { id, name, socket };
    this.gameState.players.push(player);
    this.broadcastUpdate();
  }

  removePlayer(id: string): void {
    this.gameState.players = this.gameState.players.filter(p => p.id !== id);
    this.broadcastUpdate();
  }

  startGame(): void {
    if (this.gameState.players.length < 3) {
      this.broadcastMessage({ tipo: 'erro', msg: 'Mínimo de 3 jogadores' });
      return;
    }

    this.gameState.phase = 'task';
    this.gameState.secretWord = CONCEITOS[Math.floor(Math.random() * CONCEITOS.length)];
    
    const personagensShuffled = this.shuffle([...PERSONAGENS]).slice(0, this.gameState.players.length);
    const impostorIndex = Math.floor(Math.random() * this.gameState.players.length);

    this.gameState.players.forEach((player, index) => {
      player.character = personagensShuffled[index];
      player.role = index === impostorIndex ? 'Impostor' : 'Inocente';
      
      if (index === impostorIndex) {
        this.gameState.impostorId = player.id;
      }

      const message = {
        tipo: 'game-started',
        player: {
          character: player.character,
          role: player.role,
          palavra: player.role === 'Inocente' 
            ? this.gameState.secretWord 
            : 'DICA: O tema é sobre a obra "Os Maias".',
        },
      };

      player.socket.send(JSON.stringify(message));
    });

    this.startTaskRound();
  }

  private startTaskRound(): void {
    this.gameState.responses.clear();
    this.gameState.votes.clear();
    this.gameState.phase = 'task';
    this.gameState.currentTask = TAREFAS[Math.floor(Math.random() * TAREFAS.length)];
    
    this.broadcastMessage({
      tipo: 'tarefa',
      task: this.gameState.currentTask,
    });
  }

  submitResponse(playerId: string, response: string): void {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (player) {
      this.gameState.responses.set(player.character || '', response);
      
      if (this.gameState.responses.size === this.gameState.players.length) {
        this.startDiscussion();
      }
    }
  }

  private startDiscussion(): void {
    this.gameState.phase = 'discussion';
    const responses: Record<string, string> = {};
    
    this.gameState.responses.forEach((response, character) => {
      responses[character] = response;
    });

    this.broadcastMessage({
      tipo: 'discussao',
      responses,
    });

    // Auto-start voting after 30 seconds
    setTimeout(() => this.startVoting(), 30000);
  }

  private startVoting(): void {
    this.gameState.phase = 'voting';
    this.broadcastMessage({ tipo: 'votacao' });
  }

  submitVote(playerId: string, votedCharacter: string): void {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (player) {
      this.gameState.votes.set(player.character || '', votedCharacter);
      
      if (this.gameState.votes.size === this.gameState.players.length) {
        this.finishVoting();
      }
    }
  }

  private finishVoting(): void {
    const voteCount: Record<string, number> = {};
    
    this.gameState.votes.forEach(vote => {
      voteCount[vote] = (voteCount[vote] || 0) + 1;
    });

    const totalPlayers = this.gameState.players.length;
    let expelled: string | null = null;

    for (const [character, votes] of Object.entries(voteCount)) {
      if (votes > totalPlayers / 2) {
        expelled = character;
        break;
      }
    }

    const result: any = {
      tipo: 'resultado-voto',
      votes: voteCount,
      expelled,
    };

    if (expelled) {
      const impostorCharacter = this.gameState.players.find(
        p => p.id === this.gameState.impostorId
      )?.character;

      result.winner = expelled === impostorCharacter ? 'Inocentes' : 'Impostor';
      this.gameState.phase = 'game-over';
    } else {
      this.gameState.phase = 'task';
      setTimeout(() => this.startTaskRound(), 3000);
    }

    this.broadcastMessage(result);
  }

  private broadcastUpdate(): void {
    const playerList = this.gameState.players.map(p => ({
      id: p.id,
      name: p.name,
    }));

    this.broadcastMessage({
      tipo: 'player-joined',
      players: playerList,
    });
  }

  private broadcastMessage(message: any): void {
    const data = JSON.stringify(message);
    this.gameState.players.forEach(player => {
      if (player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(data);
      }
    });
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getGameState(): GameState {
    return this.gameState;
  }
}
