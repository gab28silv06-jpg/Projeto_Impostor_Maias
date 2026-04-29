import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PlayerJoin() {
  const [, navigate] = useLocation();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const getRoomQuery = trpc.game.getRoomByCode.useQuery(
    { code: roomCode },
    { enabled: false }
  );
  const joinRoomMutation = trpc.game.joinRoom.useMutation();

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Por favor, insira o seu nome');
      return;
    }

    if (!roomCode.trim()) {
      setError('Por favor, insira o código da sala');
      return;
    }

    try {
      const room = await getRoomQuery.refetch();
      if (!room.data) {
        setError('Sala não encontrada');
        return;
      }

      await joinRoomMutation.mutateAsync({
        roomId: room.data.id,
        name: playerName,
      });

      navigate(`/player/${room.data.id}`);
    } catch (err) {
      setError('Erro ao entrar na sala');
    }
  };

  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <Card className="chiaroscuro-card p-8 w-full max-w-md">
        <h1 className="text-3xl font-black uppercase mb-8 text-center glow-text">
          O Impostor em Os Maias
        </h1>

        <div className="space-y-4">
          <div>
            <label className="text-white block mb-2">Nome do Jogador</label>
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Insira o seu nome"
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="text-white block mb-2">Código da Sala</label>
            <Input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABC123"
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 uppercase font-bold"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            onClick={handleJoin}
            disabled={joinRoomMutation.isPending}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-6 font-bold"
          >
            {joinRoomMutation.isPending ? 'Entrando...' : 'Entrar na Sala'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
