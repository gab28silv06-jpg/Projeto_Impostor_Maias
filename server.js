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

            case "createRoom": {
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
                    eliminatedPlayers: [],
                    voteCalls: new Set()
                };
                ws.roomId = roomId;
                ws.isHost = true;
                ws.send(JSON.stringify({ type: "roomCreated", roomId }));
                console.log(`Sala ${roomId} criada.`);
                break;
            }

            case "joinRoom": {
                const room = rooms[data.roomId];
                if (room && room.status === "waiting") {
                    if (room.players.some(p => p.name === data.playerName)) {
                        ws.send(JSON.stringify({ type: "error", message: "Nome de jogador já em uso." }));
                        return;
                    }
                    const newPlayer = { ws, name: data.playerName, character: null, role: null, isEliminated: false };
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

            case "startGame": {
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

            case "submitAnswer": {
                const room = rooms[ws.roomId];
                if (!room || room.status !== "started" || isPlayerEliminated(ws, room)) break;

                if (room.taskSubmissions.some(sub => sub.playerName === ws.playerName)) {
                    ws.send(JSON.stringify({ type: "error", message: "Já submeteste uma resposta." }));
                    break;
                }

                const player = room.players.find(p => p.ws === ws);
                const submission = { playerName: ws.playerName, answer: data.answer, role: player.role, status: "pending" };
                room.taskSubmissions.push(submission);

                ws.send(JSON.stringify({ type: "answerSubmitted", message: "Resposta submetida. A aguardar validação." }));

                if (room.host.readyState === WebSocket.OPEN) {
                    room.host.send(JSON.stringify({ type: "newSubmission", submission }));
                }

                room.players.forEach(p => {
                    if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
                        p.ws.send(JSON.stringify({ type: "playerSubmittedAnswer", playerName: ws.playerName }));
                    }
                });

                const activePlayers = room.players.filter(p => !p.isEliminated);
                console.log(`Submetidos: ${room.taskSubmissions.length} / Ativos: ${activePlayers.length}`);

                if (room.taskSubmissions.length >= activePlayers.length) {
                    console.log("Todos submeteram! A enviar respostas a todos...");
                    broadcastToRoom(ws.roomId, {
                        type: "allAnswers",
                        submissions: room.taskSubmissions
                    });
                }
                break;
            }

            case "hostValidateAnswer": {
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

            case "requestNextTask": {
                const room = rooms[ws.roomId];
                if (room && room.host === ws) {
                    const validCount = room.taskSubmissions.filter(s => s.status === "valid").length;
                    const sabotagedCount = room.taskSubmissions.filter(s => s.status === "sabotaged").length;

                    if (validCount > sabotagedCount) {
                        room.completedTaskIds.push(room.currentTask.id);
                        broadcastToRoom(ws.roomId, { type: "taskResult", message: `Tarefa completada! Total: ${room.completedTaskIds.length}.` });
                        if (room.completedTaskIds.length >= 5) {
                            endGame(room, "innocentsWin", "Completaram todas as tarefas!");
                            return;
                        }
                    } else {
                        broadcastToRoom(ws.roomId, { type: "taskResult", message: "A tarefa falhou!" });
                    }

                    room.taskSubmissions = [];

                    if (room.completedTaskIds.length % 2 === 0 && room.completedTaskIds.length > 0) {
                        startDiscussion(room);
                    } else {
                        sendTask(room);
                    }
                }
                break;
            }

            case "callVote": {
                const room = rooms[data.roomId];
                if (room && room.status === "started" && !isPlayerEliminated(ws, room)) {
                    room.voteCalls.add(ws.playerName);
                    const activePlayersCount = room.players.filter(p => !p.isEliminated).length;
                    const requiredVotes = Math.floor(activePlayersCount / 2) + 1;
                    broadcastToRoom(data.roomId, { type: "updateVoteCalls", current: room.voteCalls.size, required: requiredVotes });
                    if (room.voteCalls.size >= requiredVotes) {
                        startVoting(room);
                    }
                }
                break;
            }

            case "startVoting": {
                const room = rooms[ws.roomId];
                if (room && room.host === ws) {
                    startVoting(room);
                }
                break;
            }

            case "vote": {
                const room = rooms[ws.roomId];
                if (room && room.status === "voting" && !isPlayerEliminated(ws, room)) {
                    room.votes[ws.playerName] = data.targetPlayerName;
                    broadcastToRoom(ws.roomId, { type: "playerVoted", voter: ws.playerName, target: data.targetPlayerName });
                    const activePlayersCount = room.players.filter(p => !p.isEliminated).length;
                    if (Object.keys(room.votes).length >= activePlayersCount) {
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
            } else {
                room.players = room.players.filter(p => p.ws !== ws);
                broadcastToRoom(ws.roomId, { type: "playerLeft", playerName: ws.playerName, currentPlayers: room.players.map(p => p.name) });
                if (room.status === "started") checkGameEndConditions(room);
            }
        }
    });
});

function broadcastToRoom(roomId, data) {
    const room = rooms[roomId];
    if (!room) return;
    const msg = JSON.stringify(data);
    if (room.host.readyState === WebSocket.OPEN) room.host.send(msg);
    room.players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    });
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function assignRolesAndCharacters(room) {
    const availableCharacters = [...characters];
    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach((player, index) => {
        const charIndex = Math.floor(Math.random() * availableCharacters.length);
        player.character = availableCharacters.splice(charIndex, 1)[0].name;
        player.role = (index === impostorIndex) ? "Impostor" : "Inocente";
        if (player.role === "Impostor") room.impostor = player;
        player.ws.send(JSON.stringify({ type: "gameStarted", role: player.role, character: player.character }));
    });
}

function sendTask(room) {
    room.taskSubmissions = [];
    room.voteCalls.clear();
    room.votes = {};
    room.status = "started";

    const availableTasks = tasks.filter(t => !room.completedTaskIds.includes(t.id));
    if (availableTasks.length === 0) {
        endGame(room, "innocentsWin", "Todas as tarefas foram completadas!");
        return;
    }
    room.currentTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];

    const activePlayersCount = room.players.filter(p => !p.isEliminated).length;
    const requiredVotes = Math.floor(activePlayersCount / 2) + 1;

    if (room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify({
            type: "newTask",
            task: room.currentTask.description,
            pendingSubmissions: []
        }));
    }

    room.players.forEach(p => {
        if (!p.isEliminated && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({
                type: "newTask",
                task: room.currentTask.description
            }));
        }
    });

    const voteMsg = JSON.stringify({ type: "updateVoteCalls", current: 0, required: requiredVotes });
    if (room.host.readyState === WebSocket.OPEN) room.host.send(voteMsg);
    room.players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) p.ws.send(voteMsg);
    });
}

function startDiscussion(room) {
    room.votes = {};
    broadcastToRoom(room.host.roomId, {
        type: "startDiscussion",
        players: room.players.filter(p => !p.isEliminated).map(p => p.name)
    });
}

function startVoting(room) {
    room.status = "voting";
    room.voteCalls.clear();
    room.votes = {};
    broadcastToRoom(room.host.roomId, {
        type: "startVoting",
        players: room.players.filter(p => !p.isEliminated).map(p => p.name)
    });
}

function processVotes(room) {
    const voteCounts = {};
    for (const target of Object.values(room.votes)) {
        voteCounts[target] = (voteCounts[target] || 0) + 1;
    }

    let maxVotes = 0, votedOut = null, isTie = false;
    for (const [target, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) { maxVotes = count; votedOut = target; isTie = false; }
        else if (count === maxVotes) { isTie = true; }
    }

    room.votes = {};

    if (isTie || votedOut === "skip") {
        broadcastToRoom(room.host.roomId, {
            type: "noElimination",
            message: isTie ? "Empate na votação! Ninguém foi eliminado." : "A votação foi ignorada (Skip)!"
        });
        setTimeout(() => sendTask(room), 4000);
    } else {
        const eliminated = room.players.find(p => p.name === votedOut);
        if (eliminated) {
            eliminated.isEliminated = true;
            broadcastToRoom(room.host.roomId, { type: "playerEliminated", playerName: eliminated.name, role: eliminated.role });
            setTimeout(() => {
                if (eliminated.role === "Impostor") {
                    endGame(room, "innocentsWin", `O Impostor (${eliminated.name}) foi descoberto!`);
                } else {
                    checkGameEndConditions(room);
                }
            }, 3000);
        }
    }
}

function checkGameEndConditions(room) {
    const activePlayers = room.players.filter(p => !p.isEliminated);
    const activeImpostor = activePlayers.find(p => p.role === "Impostor");
    if (!activeImpostor) {
        endGame(room, "innocentsWin", "O Impostor foi eliminado!");
    } else if (activePlayers.length <= 2) {
        endGame(room, "impostorWin", `Ficaram poucos jogadores. O Impostor era ${room.impostor.name}!`);
    } else {
        sendTask(room);
    }
}

function endGame(room, winner, reason) {
    room.status = "ended";
    broadcastToRoom(room.host.roomId, { type: "gameOver", winner, reason });
}

function isPlayerEliminated(ws, room) {
    const player = room.players.find(p => p.ws === ws);
    return player ? player.isEliminated : true;
}

server.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Aceda em http://localhost:${PORT}`);
});