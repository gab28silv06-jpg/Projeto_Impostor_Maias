import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-black uppercase mb-4 glow-text">O Impostor em Os Maias</h1>
        <p className="text-gray-400 text-lg mb-12">
          Um jogo de dedução e mistério baseado na obra-prima de Eça de Queirós
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => navigate("/host")}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-6 text-lg font-bold"
          >
            Sou Anfitrião
          </Button>
          <Button
            onClick={() => navigate("/join")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold"
          >
            Sou Jogador
          </Button>
        </div>
      </div>
    </div>
  );
}
