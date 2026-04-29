import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const CHARACTERS = [
  { name: 'Maria Eduarda Runa', description: 'Mãe de Pedro da Maia, de natureza piedosa e conservadora.' },
  { name: 'Maria Monforte', description: 'A "negreira", mulher de Pedro, cuja fuga causou a tragédia da família.' },
  { name: 'Maria Eduarda', description: 'Filha de Pedro e Maria Monforte, figura central do romance proibido.' },
  { name: 'Vilaça', description: 'O fiel procurador da família Maia, guardião de segredos e contas.' },
  { name: 'Cândido Dâmaso Salcede', description: 'O "Dâmaso", fútil, vaidoso e obcecado pelo que é "chique".' },
  { name: 'Alencar', description: 'Tomás de Alencar, o poeta ultra-romântico, amigo fiel de Pedro.' },
  { name: 'Cavalão Palma', description: 'Palma "Cavalão", jornalista corrupto e figura boémia de Lisboa.' },
];

async function seedCharacters() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    for (const char of CHARACTERS) {
      await connection.execute(
        'INSERT INTO characters (name, description) VALUES (?, ?)',
        [char.name, char.description]
      );
    }
    console.log('✓ Characters seeded successfully');
  } catch (error) {
    console.error('Error seeding characters:', error);
  } finally {
    await connection.end();
  }
}

seedCharacters();
