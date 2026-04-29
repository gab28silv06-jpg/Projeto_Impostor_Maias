import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const CHARACTER_MAP: Record<number, { name: string; description: string }> = {
  1: { name: 'Afonso da Maia', description: 'O patriarca da família' },
  2: { name: 'Pedro da Maia', description: 'O filho rebelde' },
  3: { name: 'Carlos da Maia', description: 'O herdeiro da fortuna' },
  4: { name: 'Maria Eduarda', description: 'A mulher misteriosa' },
  5: { name: 'Ega', description: 'O amigo inteligente' },
  6: { name: 'Dâmaso', description: 'O político ambicioso' },
  7: { name: 'Cruges', description: 'O homem de negócios' },
  8: { name: 'Alencar', description: 'O diplomata' },
};

export default function PlayerGame() {
  const [match, params] = useRoute('/player/:roomId');
  const roomId = params?.roomId ? parseInt(params.roomId) : null;
  const [playerData, setPlayerData] = useState<any>(null);
  const [gamePhase, setGamePhase] = useState('lobby');
  const [players, setPlayers] = useState<any[]>([]);
  const [roomStatus, setRoomStatus] = useState<string>('lobby');

  const getPlayersQuery = trpc.game.getPlayersInRoom.useQuery(
    { roomId: roomId || 0 },
    { enabled: !!roomId, refetchInterval: 1000 }
  );

  const getRoomQuery = trpc.game.getRoomById.useQuery(
    { roomId: roomId || 0 },
    { enabled: !!roomId, refetchInterval: 1000 }
  );

  useEffect(() => {
    if (getPlayersQuery.data) {
      const allPlayers = getPlayersQuery.data as any[];
      setPlayers(allPlayers);
      
      // Encontrar dados do jogador atual (assumindo que é o primeiro da lista para este teste)
      if (allPlayers.length > 0) {
        setPlayerData(allPlayers[0]);
      }
    }
  }, [getPlayersQuery.data]);

  useEffect(() => {
    if (getRoomQuery.data) {
      const room = getRoomQuery.data as any;
      setRoomStatus(room.status);
      setGamePhase(room.status);
    }
  }, [getRoomQuery.data]);

  if (!match || !roomId) {
    return <div className="text-white">Sala não encontrada</div>;
  }

  const getCharacterInfo = (characterId: number) => {
    return CHARACTER_MAP[characterId] || { name: 'Desconhecido', description: '' };
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black uppercase mb-8 glow-text">O Impostor em Os Maias</h1>

        {gamePhase === 'lobby' && (
          <Card className="chiaroscuro-card p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Aguardando Início do Jogo</h2>
            <p className="text-gray-400 mb-8">Jogadores na sala: {players.length}</p>
            <div className="space-y-2">
              {players.map((p: any) => (
                <div key={p.id} className="text-white p-2 bg-gray-800 rounded">
                  {p.name}
                </div>
              ))}
            </div>
          </Card>
        )}

        {(gamePhase === 'jogo' || roomStatus === 'jogo') && playerData && (
          <Card className="chiaroscuro-card p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Tua Personagem</h2>
              <div className={`p-8 rounded mb-8 ${playerData.isImpostor ? 'bg-red-900' : 'bg-green-900'}`}>
                <p className="text-white text-xl font-bold mb-2">
                  {getCharacterInfo(playerData.characterId).name}
                </p>
                <p className="text-gray-300 mb-4">
                  {getCharacterInfo(playerData.characterId).description}
                </p>
                <p className={`text-white font-bold mt-4 text-lg ${playerData.isImpostor ? 'text-red-300' : 'text-green-300'}`}>
                  {playerData.isImpostor ? '🔴 ÉS O IMPOSTOR!' : '🟢 ÉS INOCENTE'}
                </p>
              </div>
              <p className="text-gray-400 text-sm">Fase: {roomStatus}</p>
            </div>
          </Card>
        )}

        {gamePhase === 'votacao' && (
          <Card className="chiaroscuro-card p-8">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Quem é o Impostor?</h2>
            <div className="grid grid-cols-2 gap-4">
              {players.map((p: any) => (
                <Button
                  key={p.id}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
