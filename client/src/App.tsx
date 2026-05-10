import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Users } from 'lucide-react';

type GamePhase = 'lobby' | 'waiting' | 'task' | 'discussion' | 'voting' | 'results' | 'game-over';

interface Player {
  id: string;
  name: string;
  character?: string;
  role?: 'Inocente' | 'Impostor';
  response?: string;
  vote?: string;
}

interface GameState {
  phase: GamePhase;
  players: Player[];
  task?: string;
  responses?: Record<string, string>;
  palavra?: string;
  expelled?: string;
  votes?: Record<string, number>;
}

const SUPABASE_URL = 'https://ohundqnzgefpnubxtfvf.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odW5kcW56Z2VmcG51Ynh0ZnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzgwNTAsImV4cCI6MjA5MzQxNDA1MH0.ZAXTHFByhnS88VIISRf7cw_-d0U9ZbqajG9iRK-1f9I';

const supabaseRequest = async (table: string, method: string = 'GET', data?: any, filter?: string) => {
  let url = `${SUPABASE_URL}/${table}`;
  if (filter) url += `?${filter}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  };

  if (data) options.body = JSON.stringify(data);

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${error}`);
    }
    const text = await response.text();
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error('Supabase request error:', error);
    throw error;
  }
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'lobby',
    players: [],
  });
  const [playerName, setPlayerName] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [selectedVote, setSelectedVote] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'Inocente' | 'Impostor' | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const id = Math.random().toString(36).substring(7);
    setPlayerId(id);
  }, []);

  const createRoom = async () => {
    if (!playerName.trim() || !playerId) return;
    setError(null);

    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);

    try {
      await supabaseRequest('game_rooms', 'POST', {
        id: newRoomId,
        host: playerId,
        phase: 'lobby',
        players: 1,
      });

      await supabaseRequest('players', 'POST', {
        id: playerId,
        room_id: newRoomId,
        name: playerName,
      });

      startPolling(newRoomId);
    } catch (err) {
      setError('Erro ao criar sala');
      console.error('Erro ao criar sala:', err);
      setRoomId(null);
    }
  };

  const joinRoom = async (id: string) => {
    if (!playerName.trim() || !playerId) return;
    setError(null);

    setRoomId(id);

    try {
      const rooms = await supabaseRequest('game_rooms', 'GET', null, `id=eq.${id}`);
      if (!rooms || rooms.length === 0) {
        setError('Sala não encontrada!');
        setRoomId(null);
        return;
      }

      const room = rooms[0];
      await supabaseRequest('game_rooms', 'PATCH', { players: room.players + 1 }, `id=eq.${id}`);

      await supabaseRequest('players', 'POST', {
        id: playerId,
        room_id: id,
        name: playerName,
      });

      startPolling(id);
    } catch (err) {
      setError('Erro ao entrar na sala');
      setRoomId(null);
      console.error('Erro ao entrar na sala:', err);
    }
  };

  const startPolling = (id: string) => {
    const poll = async () => {
      try {
        const players = await supabaseRequest('players', 'GET', null, `room_id=eq.${id}`);
        const rooms = await supabaseRequest('game_rooms', 'GET', null, `id=eq.${id}`);

        if (rooms && rooms.length > 0) {
          const room = rooms[0];
          
          // Update game state
          setGameState((prev) => ({
            ...prev,
            phase: room.phase,
            players: players || [],
            task: room.current_task,
            palavra: room.secret_word,
            expelled: room.expelled,
          }));

          // Set current player info
          const currentPlayer = players?.find((p: any) => p.id === playerId);
          if (currentPlayer) {
            setMyCharacter(currentPlayer.character);
            setMyRole(currentPlayer.role);
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar:', err);
      }
    };

    poll();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(poll, 1000);
  };

  const startGame = async () => {
    if (!roomId || !playerId) return;

    const characters = ['Maria Eduarda Runa', 'Maria Monforte', 'Maria Eduarda', 'Vilaça', 'Dâmaso Salcede', 'Alencar', 'Palma Cavalão'];
    const impostorIndex = Math.floor(Math.random() * gameState.players.length);
    const secretWord = ['Incesto', 'O Ramalhete', 'Decadência', 'Lisboa', 'Educação Britânica', 'Sintra'][Math.floor(Math.random() * 6)];

    try {
      for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        const role = i === impostorIndex ? 'Impostor' : 'Inocente';

        await supabaseRequest('players', 'PATCH', {
          character: characters[i],
          role: role,
        }, `id=eq.${player.id}`);
      }

      const task = ['Explique um acontecimento importante do livro.', 'Descreva a relação entre duas personagens.', 'Fale sobre um tema da obra'][Math.floor(Math.random() * 3)];

      await supabaseRequest('game_rooms', 'PATCH', {
        phase: 'task',
        current_task: task,
        secret_word: secretWord,
        impostor_id: gameState.players[impostorIndex].id,
      }, `id=eq.${roomId}`);
    } catch (err) {
      setError('Erro ao iniciar jogo');
      console.error('Erro ao iniciar jogo:', err);
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentResponse.trim() || !roomId || !playerId) return;

    try {
      await supabaseRequest('players', 'PATCH', {
        response: currentResponse,
      }, `id=eq.${playerId}`);

      setCurrentResponse('');
    } catch (err) {
      setError('Erro ao enviar resposta');
      console.error('Erro ao enviar resposta:', err);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedVote || !roomId || !playerId) return;

    try {
      await supabaseRequest('players', 'PATCH', {
        vote: selectedVote,
      }, `id=eq.${playerId}`);

      setSelectedVote('');
    } catch (err) {
      setError('Erro ao votar');
      console.error('Erro ao votar:', err);
    }
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-2 border-primary">
          <h1 className="text-4xl font-bold text-primary mb-2 text-center">Os Maias</h1>
          <p className="text-center text-muted-foreground mb-8">Segredos e Aparências - O Jogo do Impostor</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Seu nome..."
              className="w-full p-3 bg-card border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <Button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Users className="w-4 h-4 mr-2" />
              Criar Sala
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">ou</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="ID da sala..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  joinRoom((e.target as HTMLInputElement).value);
                }
              }}
              className="w-full p-3 bg-card border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </Card>
      </div>
    );
  }

  if (gameState.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-2 border-primary">
          <h1 className="text-3xl font-bold text-primary mb-4 text-center">Sala: {roomId}</h1>

          <div className="bg-card p-6 rounded border border-border mb-6">
            <h2 className="font-bold text-foreground mb-4">Jogadores ({gameState.players.length})</h2>
            <div className="space-y-2">
              {gameState.players.map((p) => (
                <div key={p.id} className="text-foreground">
                  {p.name}
                </div>
              ))}
            </div>
          </div>

          {playerId === gameState.players[0]?.id && gameState.players.length >= 3 && (
            <Button
              onClick={startGame}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Começar Jogo
            </Button>
          )}

          {gameState.players.length < 3 && (
            <p className="text-center text-muted-foreground text-sm">
              Aguardando {3 - gameState.players.length} jogador(es)...
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (gameState.phase === 'task') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 border-2 border-primary">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">Sua Personagem</h1>
            <div className="bg-card p-4 rounded border border-border mb-4">
              <p className="text-lg text-foreground font-bold">{myCharacter}</p>
              <p className="text-muted-foreground">{myRole}</p>
            </div>

            {myRole === 'Inocente' && gameState.palavra && (
              <div className="bg-green-100 border border-green-400 p-3 rounded mb-4">
                <p className="text-green-800 font-bold">Palavra Secreta: {gameState.palavra}</p>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">Tarefa</h2>
            <div className="bg-card p-6 rounded border border-border">
              <p className="text-lg text-foreground">{gameState.task}</p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              placeholder="Sua resposta..."
              className="w-full p-3 bg-card border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />

            <Button
              onClick={handleSubmitResponse}
              disabled={!currentResponse.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Resposta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (gameState.phase === 'discussion') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 border-2 border-primary">
          <h1 className="text-3xl font-bold text-primary mb-8 text-center">Discussão</h1>

          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {gameState.players.map((p) => (
              p.response && (
                <div key={p.id} className="bg-card p-4 rounded border border-border">
                  <p className="font-bold text-primary mb-2">{p.character}</p>
                  <p className="text-foreground">{p.response}</p>
                </div>
              )
            ))}
          </div>

          <p className="text-center text-muted-foreground text-sm">
            Aguardando votação...
          </p>
        </Card>
      </div>
    );
  }

  if (gameState.phase === 'voting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-2 border-primary">
          <h1 className="text-3xl font-bold text-primary mb-8 text-center">Votação</h1>

          <div className="space-y-3 mb-6">
            {gameState.players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedVote(p.character || '')}
                className={`w-full p-3 rounded border-2 text-left font-medium transition ${
                  selectedVote === p.character
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary'
                }`}
              >
                {p.character}
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmitVote}
            disabled={!selectedVote}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Votar
          </Button>
        </Card>
      </div>
    );
  }

  if (gameState.phase === 'results') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-2 border-primary">
          <h1 className="text-3xl font-bold text-primary mb-8 text-center">Resultado</h1>

          {gameState.expelled && (
            <div className="bg-destructive/10 border-2 border-destructive p-4 rounded mb-6">
              <p className="text-center text-destructive font-bold">
                {gameState.expelled} foi expulso!
              </p>
            </div>
          )}

          <p className="text-center text-muted-foreground text-sm">
            Aguardando próxima rodada...
          </p>
        </Card>
      </div>
    );
  }

  return null;
}
