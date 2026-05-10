import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ohundqnzgefpnubxtfvf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odW5kcW56Z2VmcG51Ynh0ZnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzgwNTAsImV4cCI6MjA5MzQxNDA1MH0.ZAXTHFByhnS88VIISRf7cw_-d0U9ZbqajG9iRK-1f9I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function monitorGameRooms() {
  console.log('🎮 Servidor do jogo iniciado!');
  console.log('📡 Monitorando salas de jogo no Supabase...\n');

  // Subscribe to game_rooms changes
  const subscription = supabase
    .channel('game_rooms_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_rooms' },
      async (payload) => {
        console.log('📢 Mudança detectada em game_rooms:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          const room = payload.new;
          console.log(`✅ Nova sala criada: ${room.id}`);
        }
      }
    )
    .subscribe();

  // Subscribe to players changes
  supabase
    .channel('players_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players' },
      async (payload) => {
        console.log('📢 Mudança detectada em players:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          const player = payload.new;
          console.log(`🎯 Novo jogador: ${player.name}`);
        }
      }
    )
    .subscribe();

  // Check for rooms that need to start the game
  setInterval(async () => {
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('phase', 'lobby');

    if (rooms) {
      for (const room of rooms) {
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', room.id);

        if (players && players.length >= 3 && room.players !== players.length) {
          // Update player count
          await supabase
            .from('game_rooms')
            .update({ players: players.length })
            .eq('id', room.id);

          console.log(`📊 Sala ${room.id}: ${players.length} jogadores`);
        }
      }
    }
  }, 2000);

  // Check for rooms in task phase that need to transition
  setInterval(async () => {
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('phase', 'task');

    if (rooms) {
      for (const room of rooms) {
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', room.id);

        if (players && players.every((p: any) => p.response)) {
          console.log(`✅ Todos responderam na sala ${room.id}. Iniciando discussão...`);
          
          await supabase
            .from('game_rooms')
            .update({ phase: 'discussion' })
            .eq('id', room.id);

          // Auto-transition to voting after 30 seconds
          setTimeout(async () => {
            await supabase
              .from('game_rooms')
              .update({ phase: 'voting' })
              .eq('id', room.id);
            console.log(`🗳️ Sala ${room.id}: Iniciando votação...`);
          }, 30000);
        }
      }
    }
  }, 2000);

  // Check for rooms in voting phase that need to finish
  setInterval(async () => {
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('phase', 'voting');

    if (rooms) {
      for (const room of rooms) {
        const { data: players } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', room.id);

        if (players && players.every((p: any) => p.vote)) {
          console.log(`📊 Contando votos na sala ${room.id}...`);
          
          const voteCounts: Record<string, number> = {};
          players.forEach((p: any) => {
            if (p.vote) {
              voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
            }
          });

          let expelled = null;
          let maxVotes = 0;
          for (const [name, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
              maxVotes = count;
              expelled = name;
            }
          }

          console.log(`🎯 Expulso: ${expelled}`);
          
          // Update room with results
          await supabase
            .from('game_rooms')
            .update({ 
              phase: 'results',
              expelled: expelled
            })
            .eq('id', room.id);

          // Reset for next round after 5 seconds
          setTimeout(async () => {
            const task = TAREFAS[Math.floor(Math.random() * TAREFAS.length)];
            
            // Clear responses and votes
            await supabase
              .from('players')
              .update({ response: null, vote: null })
              .eq('room_id', room.id);

            await supabase
              .from('game_rooms')
              .update({ 
                phase: 'task',
                current_task: task
              })
              .eq('id', room.id);

            console.log(`🔄 Próxima rodada iniciada na sala ${room.id}`);
          }, 5000);
        }
      }
    }
  }, 2000);
}

// Start monitoring
monitorGameRooms().catch(console.error);

// Keep the server running
console.log('\n✨ Servidor pronto! Pressione Ctrl+C para sair.\n');
