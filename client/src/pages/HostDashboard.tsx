import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

const CHARACTERS = [
  { id: 1, name: 'Afonso da Maia', description: 'O patriarca da família' },
  { id: 2, name: 'Pedro da Maia', description: 'O filho rebelde' },
  { id: 3, name: 'Carlos da Maia', description: 'O herdeiro da fortuna' },
  { id: 4, name: 'Maria Eduarda', description: 'A mulher misteriosa' },
  { id: 5, name: 'Ega', description: 'O amigo inteligente' },
  { id: 6, name: 'Dâmaso', description: 'O político ambicioso' },
  { id: 7, name: 'Cruges', description: 'O homem de negócios' },
  { id: 8, name: 'Alencar', description: 'O diplomata' },
];

export default function HostDashboard() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [players, setPlayers] = useState<any[]>([]);

  const createRoomMutation = trpc.game.createRoom.useMutation();
  const getPlayersQuery = trpc.game.getPlayersInRoom.useQuery(
    { roomId: roomId || 0 },
    { enabled: !!roomId, refetchInterval: 1000 }
  );

  useEffect(() => {
    if (getPlayersQuery.data) {
      setPlayers(getPlayersQuery.data as any);
    }
  }, [getPlayersQuery.data]);

  const handleCreateRoom = async () => {
    try {
      const result = await createRoomMutation.mutateAsync();
      setRoomCode(result.code);
      setRoomId(result.id);
    } catch (error) {
      console.error('Erro ao criar sala:', error);
    }
  };

  const qrCodeUrl = roomCode
    ? `${window.location.origin}/player?room=${roomCode}`
    : '';

  const updateRoomStatusMutation = trpc.game.updateRoomStatus.useMutation();
  const updatePlayerCharacterMutation = trpc.game.updatePlayerCharacter.useMutation();

  const handleIniciarJogo = async () => {
    if (!roomId || players.length === 0) return;
    try {
      // Sortear EXATAMENTE 1 impostor aleatoriamente
      const impostorIndex = Math.floor(Math.random() * players.length);
      const impostorPlayerId = players[impostorIndex].id;

      // Distribuir personagens aleatoriamente aos jogadores
      const shuffledCharacters = [...CHARACTERS].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < players.length; i++) {
        // IMPORTANTE: Apenas o jogador sorteado é impostor, todos os outros são inocentes
        const isImpostor = players[i].id === impostorPlayerId;
        await updatePlayerCharacterMutation.mutateAsync({
          playerId: players[i].id,
          characterId: shuffledCharacters[i].id,
          isImpostor: isImpostor
        });
      }

      // Atualizar status da sala para "jogo"
      await updateRoomStatusMutation.mutateAsync({
        roomId,
        status: 'jogo'
      });

      toast.success('Jogo iniciado! 1 Impostor sorteado!');
    } catch (error) {
      console.error('Erro ao iniciar jogo:', error);
      toast.error('Erro ao iniciar jogo');
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-black uppercase mb-8 glow-text">O Impostor em Os Maias</h1>

        {!roomCode ? (
          <Card className="chiaroscuro-card p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Criar Sala</h2>
            <Button
              onClick={handleCreateRoom}
              disabled={createRoomMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
            >
              {createRoomMutation.isPending ? 'Criando...' : 'Criar Nova Sala'}
            </Button>
            {createRoomMutation.error && (
              <p className="text-red-500 text-sm mt-2">Erro: {createRoomMutation.error.message}</p>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            <Card className="chiaroscuro-card p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Código da Sala</h2>
              <p className="text-4xl font-black text-yellow-400 mb-8 glow-text">{roomCode}</p>
              <div className="flex justify-center bg-white p-4 rounded">
                <QRCodeSVG value={qrCodeUrl} size={256} />
              </div>
            </Card>

            <Card className="chiaroscuro-card p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Jogadores ({players.length})
              </h2>
              <div className="space-y-2">
                {players.map((player: any) => (
                  <div key={player.id} className="text-white p-3 bg-gray-800 rounded">
                    {player.name}
                  </div>
                ))}
              </div>
            </Card>

            <Button
              onClick={handleIniciarJogo}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold"
              disabled={players.length < 3 || updateRoomStatusMutation.isPending}
            >
              {updateRoomStatusMutation.isPending ? 'Iniciando...' : 'Iniciar Jogo'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
