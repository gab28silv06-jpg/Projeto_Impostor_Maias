const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const { characters, tasks } = require("./gameData");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

wss.on("connection", ws => {
    console.log("Novo cliente conectado");

    ws.on("message", message => {
        const data = JSON.parse(message);
        console.log("Mensagem recebida:", data);

        switch (data.type) {
            case "createRoom":
                {
                    const roomId = generateRoomId();
                    rooms[roomId] = {
                        players: [],
                        status: "waiting",
                        host: ws,
                        impostor: null,
                        currentTask: null,
                        taskSubmissions: [],
                        completedTaskIds: [],
                        votes: {},
                        eliminatedPlayers: []
                    };
                    ws.roomId = roomId;
                    ws.isHost = true;
                    ws.send(JSON.stringify({ type: "roomCreated", roomId: roomId }));
                    console.log(`Sala ${roomId} criada.`);
                    break;
                }

            case "joinRoom":
                {
                    const room = rooms[data.roomId];
                    if (room && room.status === "waiting") {
                        if (room.players.some(p => p.name === data.playerName)) {
                            ws.send(JSON.stringify({ type: "error", message: "Nome de jogador já em uso." }));
                            return;
                        }
                        const newPlayer = { ws: ws, name: data.playerName, character: null, role: null, isEliminated: false };
                        room.players.push(newPlayer);
                        ws.roomId = data.roomId;
                        ws.playerName = data.playerName;
                        ws.isHost = false;

                        ws.send(JSON.stringify({ type: "roomJoined", roomId: data.roomId, playerName: data.playerName }));
                        broadcastToRoom(data.roomId, { type: "playerJoined", playerName: data.playerName, currentPlayers: room.players.map(p => p.name) });
                        console.log(`${data.playerName} juntou-se à sala ${data.roomId}.`);
                    } else {
                        ws.send(JSON.stringify({ type: "error", message: "Sala não encontrada ou já iniciada." }));
                    }
                    break;
                }

            case "startGame":
                {
                    const room = rooms[data.roomId];
                    if (room && room.host === ws && room.players.length >= 3) {
                        room.status = "started";
                        assignRolesAndCharacters(room);
                        sendTask(room);
                        console.log(`Jogo iniciado na sala ${data.roomId}.`);
                    } else {
                        ws.send(JSON.stringify({ type: "error", message: "Mínimo de 3 jogadores para iniciar." }));
                    }
                    break;
                }

            case "submitAnswer":
                {
                    const room = rooms[ws.roomId];
                    if (room && room.status === "started" && !isPlayerEliminated(ws, room)) {
                        if (room.taskSubmissions.some(sub => sub.playerName === ws.playerName)) {
                            ws.send(JSON.stringify({ type: "error", message: "Já submeteste uma resposta." }));
                            return;
                        }
                        const player = room.players.find(p => p.ws === ws);
                        const submission = { playerName: ws.playerName, answer: data.answer, role: player.role, status: "pending" };
                        room.taskSubmissions.push(submission);

                        ws.send(JSON.stringify({ type: "answerSubmitted", message: "Resposta submetida. A aguardar validação." }));
                        room.host.send(JSON.stringify({ type: "newSubmission", submission: submission }));

                        const activePlayersCount = room.players.filter(p => !p.isEliminated && p.ws !== room.host).length; // Excluir o host da contagem
                        const submittedCount = room.taskSubmissions.length;
                        
                        if (submittedCount === activePlayersCount) {
                            room.host.send(JSON.stringify({ type: "allSubmissionsReceived" }));
                        }
                    }
                    break;
                }

            case "hostValidateAnswer":
                {
                    const room = rooms[ws.roomId];
                    if (room && room.host === ws) {
                        const submission = room.taskSubmissions.find(sub => sub.playerName === data.playerName);
                        if (submission) {
                            submission.status = data.status;
                            broadcastToRoom(ws.roomId, { type: "answerValidated", playerName: data.playerName, status: data.status });

                            const allValidated = room.taskSubmissions.every(sub => sub.status !== "pending");
                            if (allValidated) {
                                room.host.send(JSON.stringify({ type: "hostCanRequestNextTask" }));
                            }
                        }
                    }
                    break;
                }

            case "requestNextTask":
                {
                    const room = rooms[ws.roomId];
                    if (room && room.host === ws) {
                        const validCount = room.taskSubmissions.filter(s => s.status === "valid").length;
                        const sabotagedCount = room.taskSubmissions.filter(s => s.status === "sabotaged").length;

                        if (validCount > sabotagedCount) {
                            room.completedTaskIds.push(room.currentTask.id);
                            broadcastToRoom(ws.roomId, { type: "taskResult", message: `Tarefa completada! Total: ${room.completedTaskIds.length}.` });
                            if (room.completedTaskIds.length >= 5) { // Win condition
                                endGame(room, "innocentsWin");
                                return;
                            }
                        } else {
                            broadcastToRoom(ws.roomId, { type: "taskResult", message: "A tarefa falhou!" });
                        }

                        // Resetar submissões para a próxima ronda
                        room.taskSubmissions = [];

                        if (room.completedTaskIds.length % 2 === 0 && room.completedTaskIds.length > 0) {
                            startDiscussion(room);
                        } else {
                            sendTask(room);
                        }
                    }
                    break;
                }

            case "startVoting":
                {
                    const room = rooms[ws.roomId];
                    if (room && room.host === ws) {
                        startVoting(room);
                    }
                    break;
                }

            case "vote":
                {
                    const room = rooms[ws.roomId];
                    if (room && room.status === "started" && !isPlayerEliminated(ws, room)) {
                        room.votes[ws.playerName] = data.targetPlayerName;
                        broadcastToRoom(ws.roomId, { type: "playerVoted", voter: ws.playerName });
                        const activePlayersCount = room.players.filter(p => !p.isEliminated).length;
                        if (Object.keys(room.votes).length === activePlayersCount) {
                            processVotes(room);
                        }
                    }
                    break;
                }
        }
    });

    ws.on("close", () => {
        console.log("Cliente desconectado");
        if (ws.roomId && rooms[ws.roomId]) {
            const room = rooms[ws.roomId];
            if (ws.isHost) {
                broadcastToRoom(ws.roomId, { type: "error", message: "O anfitrião desconectou. Sala encerrada." });
                delete rooms[ws.roomId];
                console.log(`Sala ${ws.roomId} encerrada.`);
            } else {
                room.players = room.players.filter(p => p.ws !== ws);
                broadcastToRoom(ws.roomId, { type: "playerLeft", playerName: ws.playerName, currentPlayers: room.players.map(p => p.name) });
                if (room.status === "started") {
                    checkGameEndConditions(room);
                }
            }
        }
    });
});

function broadcastToRoom(roomId, data) {
    const room = rooms[roomId];
    if (room) {
        // Enviar para o host
        if (room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify(data));
        }
        // Enviar para os jogadores
        room.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(data));
            }
        });
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function assignRolesAndCharacters(room) {
    const players = room.players;
    const availableCharacters = [...characters];
    const impostorIndex = Math.floor(Math.random() * players.length);

    players.forEach((player, index) => {
        const charIndex = Math.floor(Math.random() * availableCharacters.length);
        player.character = availableCharacters.splice(charIndex, 1)[0].name;
        player.role = (index === impostorIndex) ? "Impostor" : "Inocente";
        if (player.role === "Impostor") room.impostor = player;
        player.ws.send(JSON.stringify({ type: "gameStarted", role: player.role, character: player.character }));
    });
}

function sendTask(room) {
    room.taskSubmissions = []; // Resetar submissões para a nova tarefa
    const availableTasks = tasks.filter(task => !room.completedTaskIds.includes(task.id));
    if (availableTasks.length === 0) {
        endGame(room, "innocentsWin");
        return;
    }
    room.currentTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];
    
    // Enviar a nova tarefa para todos os jogadores
    room.players.forEach(player => {
        const dataToSend = { type: "newTask", task: room.currentTask.description };
        // Se for o host, incluir as submissões atuais (se houver, para o caso de recarga)
        if (player.ws.isHost) {
            dataToSend.pendingSubmissions = room.taskSubmissions.filter(sub => sub.status === 'pending');
        }
        player.ws.send(JSON.stringify(dataToSend));
    });
    console.log(`Nova tarefa enviada para a sala ${room.roomId}: ${room.currentTask.description}`);
}

function startDiscussion(room) {
    room.votes = {};
    broadcastToRoom(room.host.roomId, { type: "startDiscussion", players: room.players.filter(p => !p.isEliminated).map(p => p.name) });
}

function startVoting(room) {
    broadcastToRoom(room.host.roomId, { type: "startVoting", players: room.players.filter(p => !p.isEliminated).map(p => p.name) });
}

function processVotes(room) {
    const voteCounts = {};
    Object.values(room.votes).forEach(target => {
        voteCounts[target] = (voteCounts[target] || 0) + 1;
    });

    let maxVotes = 0;
    let mostVotedPlayerName = null;
    let tie = false;

    for (const player in voteCounts) {
        if (voteCounts[player] > maxVotes) {
            maxVotes = voteCounts[player];
            mostVotedPlayerName = player;
            tie = false;
        } else if (voteCounts[player] === maxVotes) {
            tie = true;
        }
    }

    if (tie || !mostVotedPlayerName) {
        broadcastToRoom(room.host.roomId, { type: "noElimination", message: "Houve um empate. Ninguém foi eliminado." });
        sendTask(room);
    } else {
        const eliminatedPlayer = room.players.find(p => p.name === mostVotedPlayerName);
        eliminatedPlayer.isEliminated = true;
        broadcastToRoom(room.host.roomId, { type: "playerEliminated", playerName: eliminatedPlayer.name, role: eliminatedPlayer.role });
        checkGameEndConditions(room);
    }
}

function checkGameEndConditions(room) {
    const activePlayers = room.players.filter(p => !p.isEliminated);
    const activeImpostor = activePlayers.find(p => p.role === "Impostor");

    if (!activeImpostor) {
        endGame(room, "innocentsWin");
    } else if (activePlayers.length <= 2) { // Se restarem 2 ou menos jogadores e o impostor ainda estiver ativo
        endGame(room, "impostorWin");
    } else {
        sendTask(room);
    }
}

function endGame(room, winner) {
    room.status = "ended";
    broadcastToRoom(room.host.roomId, { type: "gameOver", winner: winner });
}

function isPlayerEliminated(ws, room) {
    const player = room.players.find(p => p.ws === ws);
    return player && player.isEliminated;
}

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Aceda em http://localhost:${PORT}`);
});
