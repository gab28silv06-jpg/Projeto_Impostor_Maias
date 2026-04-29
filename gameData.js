const characters = [
    {
        name: "Maria Eduarda Runa",
        description: "A mãe de Pedro da Maia e avó de Carlos, uma figura de grande importância na família."
    },
    {
        name: "Maria Monforte",
        description: "Mãe de Carlos e Maria Eduarda, uma mulher de beleza estonteante e paixões avassaladoras, que abandona a família."
    },
    {
        name: "Maria Eduarda",
        description: "A grande paixão de Carlos, uma mulher misteriosa e encantadora, cuja verdadeira identidade é o segredo central da trama."
    },
    {
        name: "Vilaça",
        description: "O administrador da fortuna dos Maias, um homem prático e leal."
    },
    {
        name: "Cândido Dâmaso Salcede",
        description: "Um jornalista e figura caricata da sociedade lisboeta, conhecido pela sua falta de escrúpulos."
    },
    {
        name: "Alencar",
        description: "Poeta romântico e dramático, amigo de Ega e Carlos, mas com uma visão de mundo mais conservadora."
    },
    {
        name: "Cavalão Palma",
        description: "Uma figura do submundo lisboeta, ligada a atividades menos lícitas."
    }
];

const tasks = [
    {
        id: "task1",
        description: "Explica a relação entre Carlos da Maia e João da Ega, e como essa amizade influencia as suas vidas.",
        answerKeywords: ["amizade", "influência", "boémia", "crítica social", "desilusão"]
    },
    {
        id: "task2",
        description: "Descreve o papel de Afonso da Maia na educação de Carlos. Que valores tentou incutir no neto?",
        answerKeywords: ["educação", "valores liberais", "inglaterra", "caráter", "honra"]
    },
    {
        id: "task3",
        description: "Identifica os principais temas abordados em 'Os Maias' e explica a sua relevância para a sociedade portuguesa do século XIX.",
        answerKeywords: ["decadência", "crítica social", "incesto", "romantismo", "realismo", "geração nova"]
    },
    {
        id: "task4",
        description: "Relaciona a personagem Maria Monforte com o destino trágico da família Maia.",
        answerKeywords: ["paixão", "abandono", "segredo", "incesto", "destino"]
    },
    {
        id: "task5",
        description: "Interpreta uma fala de Tomás de Alencar sobre o amor ou a poesia, como se fosses a personagem.",
        answerKeywords: ["romantismo", "poesia", "dramático", "sentimentalismo"]
    },
    {
        id: "task6",
        description: "Qual o significado da Toca na vida de Carlos e Ega?",
        answerKeywords: ["refúgio", "boémia", "intimidade", "desordem", "liberdade"]
    },
    {
        id: "task7",
        description: "Descreve a importância do Ramalhete como cenário da ação e símbolo da família Maia.",
        answerKeywords: ["casa", "herança", "decadência", "memória", "passado"]
    },
    {
        id: "task8",
        description: "Explica o conceito de 'fatalidade' ou 'destino' na obra, e como ele se manifesta na vida de Carlos.",
        answerKeywords: ["destino", "fatalidade", "hereditariedade", "incesto", "tragédia"]
    },
    {
        id: "task9",
        description: "Como a crítica social é apresentada em 'Os Maias'? Dá exemplos de personagens ou situações.",
        answerKeywords: ["crítica social", "hipocrisia", "futilidade", "política", "literatura"]
    },
    {
        id: "task10",
        description: "Qual o papel de Maria Eduarda na vida de Carlos? Descreve a sua personalidade e o impacto que tem no protagonista.",
        answerKeywords: ["amor", "paixão", "mistério", "identidade", "incesto", "desilusão"]
    },
    {
        id: "task11",
        description: "Comenta a figura de Dâmaso Salcede como representação da burguesia emergente e dos seus valores.",
        answerKeywords: ["burguesia", "arrivismo", "futilidade", "aparência", "ridículo"]
    },
    {
        id: "task12",
        description: "Qual a importância do episódio da corrida de cavalos para a crítica à sociedade lisboeta?",
        answerKeywords: ["corrida", "sociedade", "aparência", "futilidade", "crítica"]
    },
    {
        id: "task13",
        description: "Descreve a relação entre Carlos e a Condessa de Gouvarinho. Que tipo de amor é este?",
        answerKeywords: ["adultério", "futilidade", "paixão", "sociedade", "superficialidade"]
    },
    {
        id: "task14",
        description: "Como é retratada a vida intelectual e artística em Lisboa na época de 'Os Maias'?",
        answerKeywords: ["intelectuais", "artistas", "boémia", "cafés", "literatura"]
    },
    {
        id: "task15",
        description: "Explica a ironia presente no final da obra, quando Carlos e Ega refletem sobre as suas vidas.",
        answerKeywords: ["ironia", "desilusão", "fracasso", "vida", "sentido"]
    }
];

const impostorCharacters = [
    "Maria Eduarda", // Pelo segredo da sua identidade
    "Maria Monforte", // Por ter abandonado a família e ser a causa do incesto
    "Cândido Dâmaso Salcede" // Por ser um impostor social, fingindo ser algo que não é
];

module.exports = { characters, tasks, impostorCharacters };
