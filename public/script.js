const socket = new WebSocket("ws://localhost:3000");

const callVoteBtn = document.getElementById("call-vote-btn");
const voteCallCount = document.getElementById("vote-call-count");
const voteCallReq = document.getElementById("vote-call-req");

const startScreen = document.getElementById("start-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");

const createRoomBtn = document.getElementById("create-room-btn");
const playerNameInput = document.getElementById("player-name-input");
const roomIdInput = document.getElementById("room-id-input");
const joinRoomBtn = document.getElementById("join-room-btn");

const lobbyRoomId = document.getElementById("lobby-room-id");
const playerList = document.getElementById("player-list");
const startGameBtn = document.getElementById("start-game-btn");
const lobbyMessage = document.getElementById("lobby-message");

const playerRole = document.getElementById("player-role");
const playerCharacter = document.getElementById("player-character");
const gameStatusMessage = document.getElementById("game-status-message");

const taskSection = document.getElementById("task-section");
const currentTaskDescription = document.getElementById("current-task-description");
const taskAnswerInput = document.getElementById("task-answer-input");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const sabotageBtn = document.getElementById("sabotage-btn");
const taskStatusMessage = document.getElementById("task-status-message");

const hostValidationSection = document.getElementById("host-validation-section");
const submittedAnswersList = document.getElementById("submitted-answers-list");
const requestNextTaskBtn = document.getElementById("request-next-task-btn");

const discussionSection = document.getElementById("discussion-section");
const discussionPlayerList = document.getElementById("discussion-player-list");
const startVotingBtn = document.getElementById("start-voting-btn");

const votingSection = document.getElementById("voting-section");
const voteTargetSelect = document.getElementById("vote-target-select");
const submitVoteBtn = document.getElementById("submit-vote-btn");
const votingStatusMessage = document.getElementById("voting-status-message");

const eliminationSection = document.getElementById("elimination-section");
const eliminatedPlayerInfo = document.getElementById("eliminated-player-info");

const gameOverSection = document.getElementById("game-over-section");
const gameWinnerMessage = document.getElementById("game-winner-message");

const errorMessageDiv = document.getElementById("error-message");

let currentRoomId = null;
let isHost = false;
let myRole = null;
let myName = null;
let allPlayersSubmitted = false;
let hostCurrentSubmissions = [];

// Listener do botão de votação — só se regista uma vez aqui
callVoteBtn.addEventListener("click", () => {
    if (socket.readyState === WebSocket.OPEN && !isHost) {
        socket.send(JSON.stringify({ type: "callVote", roomId: currentRoomId }));
        callVoteBtn.disabled = true;
    }
});

function showScreen(screenId) {
    startScreen.classList.remove("active");
    lobbyScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    document.getElementById(screenId).classList.add("active");
    errorMessageDiv.textContent = "";
    taskSection.style.display = "none";
    hostValidationSection.style.display = "none";
    discussionSection.style.display = "none";
    votingSection.style.display = "none";
    eliminationSection.style.display = "none";
    gameOverSection.style.display = "none";
}

function displayError(msg) {
    errorMessageDiv.textContent = msg;
}

socket.onopen = () => console.log("Conectado ao servidor WebSocket");

socket.onmessage = event => {
    const data = JSON.parse(event.data);
    console.log("Mensagem do servidor:", data);

    switch (data.type) {

        case "roomCreated":
            currentRoomId = data.roomId;
            isHost = true;
            lobbyRoomId.textContent = currentRoomId;
            playerList.innerHTML = "<li>Tu (Anfitrião)</li>";
            startGameBtn.style.display = "block";
            startGameBtn.disabled = true;
            lobbyMessage.textContent = "À espera de jogadores...";
            showScreen("lobby-screen");
            break;

        case "roomJoined":
            currentRoomId = data.roomId;
            isHost = false;
            myName = data.playerName;
            lobbyRoomId.textContent = currentRoomId;
            startGameBtn.style.display = "none";
            lobbyMessage.textContent = `Bem-vindo à sala ${data.roomId}, ${data.playerName}! À espera do anfitrião.`;
            showScreen("lobby-screen");
            break;

        case "playerJoined":
            if (isHost) {
                updatePlayerList(data.currentPlayers);
                lobbyMessage.textContent = `Novo jogador: ${data.playerName}. Total: ${data.currentPlayers.length}.`;
                startGameBtn.disabled = data.currentPlayers.length < 3;
            }
            break;

        case "playerLeft":
            if (isHost) {
                updatePlayerList(data.currentPlayers);
                lobbyMessage.textContent = `${data.playerName} saiu. Total: ${data.currentPlayers.length}.`;
                startGameBtn.disabled = data.currentPlayers.length < 3;
            }
            break;

        case "gameStarted":
            myRole = data.role;
            playerRole.textContent = data.role;
            playerRole.className = data.role;
            playerCharacter.textContent = data.character;
            gameStatusMessage.textContent = `O jogo começou! És o ${data.role} — personagem: ${data.character}.`;
            showScreen("game-screen");
            break;

        case "newTask":
            allPlayersSubmitted = false;
            hostCurrentSubmissions = [];

            taskSection.style.display = "block";
            discussionSection.style.display = "none";
            votingSection.style.display = "none";
            eliminationSection.style.display = "none";

            currentTaskDescription.textContent = data.task;
            taskStatusMessage.textContent = "";
            sabotageBtn.style.display = "none";

            if (callVoteBtn) callVoteBtn.disabled = false;
            if (voteCallCount) voteCallCount.textContent = "0";
            if (voteCallReq) voteCallReq.textContent = "0";

            if (isHost) {
                hostValidationSection.style.display = "block";
                taskAnswerInput.style.display = "none";
                submitAnswerBtn.style.display = "none";
                submittedAnswersList.innerHTML = "";
                requestNextTaskBtn.disabled = true;
                requestNextTaskBtn.textContent = "Aguardar respostas... (0 recebidas)";
            } else {
                hostValidationSection.style.display = "none";
                taskAnswerInput.style.display = "block";
                taskAnswerInput.value = "";
                taskAnswerInput.disabled = false;
                submitAnswerBtn.style.display = "block";
                submitAnswerBtn.disabled = false;
            }
            break;

        case "newSubmission":
            if (isHost) {
                hostCurrentSubmissions.push(data.submission);
                updateSubmittedAnswersList(data.submission);
                checkHostNextTaskButtonState();
            }
            break;
        
        case "allAnswers": {
            taskStatusMessage.textContent = "Todos responderam!";
            
            // Mostrar respostas de todos
            const answersDiv = document.createElement("div");
            answersDiv.innerHTML = "<h4>Respostas de todos:</h4>";
            data.submissions.forEach(sub => {
                const p = document.createElement("p");
                p.innerHTML = `<strong>${sub.playerName}:</strong> ${sub.answer}`;
                answersDiv.appendChild(p);
            });
            
            // Adicionar ao ecrã (remove anterior se existir)
            const existing = document.getElementById("all-answers-display");
            if (existing) existing.remove();
            answersDiv.id = "all-answers-display";
            taskSection.appendChild(answersDiv);
            break;
        }

        case "allSubmissionsReceived":
            if (isHost) {
                allPlayersSubmitted = true;
                checkHostNextTaskButtonState();
            }
            break;

        case "updateVoteCalls":
            if (voteCallCount) voteCallCount.textContent = data.current;
            if (voteCallReq) voteCallReq.textContent = data.required;
            break;

        case "answerSubmitted":
            taskStatusMessage.textContent = data.message;
            submitAnswerBtn.disabled = true;
            taskAnswerInput.disabled = true;
            break;

        case "playerSubmittedAnswer":
            if (!isHost) {
                taskStatusMessage.textContent = `${data.playerName} submeteu a sua resposta.`;
            }
            break;

        case "answerValidated": {
            const item = document.getElementById(`submission-${data.playerName}`);
            if (item) {
                item.innerHTML = `<strong>${data.playerName} (${item.dataset.role}):</strong> ${item.dataset.answer} — ${data.status === "valid" ? "✅ Válida" : "❌ Sabotada"}`;
            }
            if (isHost) {
                const idx = hostCurrentSubmissions.findIndex(s => s.playerName === data.playerName);
                if (idx !== -1) hostCurrentSubmissions[idx].status = data.status;
                checkHostNextTaskButtonState();
            }
            break;
        }

        case "hostCanRequestNextTask":
            if (isHost) {
                requestNextTaskBtn.disabled = false;
                requestNextTaskBtn.textContent = "Próxima Tarefa / Iniciar Discussão";
            }
            break;

        case "taskResult":
            taskStatusMessage.textContent = data.message;
            break;

        case "startDiscussion":
            taskSection.style.display = "none";
            discussionSection.style.display = "block";
            votingSection.style.display = "none";
            eliminationSection.style.display = "none";
            updateDiscussionPlayerList(data.players);
            startVotingBtn.style.display = isHost ? "block" : "none";
            startVotingBtn.disabled = false;
            break;

        case "startVoting":
            discussionSection.style.display = "none";
            votingSection.style.display = "block";
            eliminationSection.style.display = "none";
            populateVoteTargetSelect(data.players);
            votingStatusMessage.textContent = "Vota em quem achas que é o impostor.";
            submitVoteBtn.disabled = false;
            break;

        case "playerVoted":
            votingStatusMessage.textContent = `${data.voter} votou.`;
            break;

        case "playerEliminated":
            votingSection.style.display = "none";
            eliminationSection.style.display = "block";
            eliminatedPlayerInfo.textContent = `${data.playerName} foi eliminado. Era um ${data.role}.`;
            break;

        case "noElimination":
            votingSection.style.display = "none";
            eliminationSection.style.display = "block";
            eliminatedPlayerInfo.textContent = data.message;
            break;

        case "gameOver": {
            gameScreen.classList.remove("active");
            gameOverSection.style.display = "block";
            gameOverSection.classList.add("active");
            const isImpostor = (myRole === "Impostor");
            const innocentsWon = (data.winner === "innocentsWin");
            const won = (innocentsWon && !isImpostor) || (!innocentsWon && isImpostor);
            gameWinnerMessage.innerHTML = won
                ? `<span style="color:#4CAF50;font-size:2em;font-weight:bold">Vitória!</span><br><br>${data.reason}`
                : `<span style="color:#F44336;font-size:2em;font-weight:bold">Derrota!</span><br><br>${data.reason}`;
            break;
        }

        case "error":
            displayError(data.message);
            if (data.message.includes("encerrada")) setTimeout(() => showScreen("start-screen"), 3000);
            break;
    }
};

socket.onclose = () => {
    displayError("Conexão perdida. Por favor, recarrega a página.");
    showScreen("start-screen");
};

socket.onerror = () => {
    displayError("Erro na conexão. Verifica se o servidor está a correr.");
};

createRoomBtn.addEventListener("click", () => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "createRoom" }));
    else displayError("Não conectado ao servidor.");
});

joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!playerName) return displayError("Por favor, insere o teu nome.");
    if (!roomId) return displayError("Por favor, insere o código da sala.");
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "joinRoom", playerName, roomId }));
    } else displayError("Não conectado ao servidor.");
});

startGameBtn.addEventListener("click", () => {
    if (isHost && currentRoomId && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "startGame", roomId: currentRoomId }));
    }
});

submitAnswerBtn.addEventListener("click", () => {
    const answer = taskAnswerInput.value.trim();
    if (!answer) return displayError("Por favor, escreve a tua resposta.");
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "submitAnswer", roomId: currentRoomId, answer }));
    }
});

requestNextTaskBtn.addEventListener("click", () => {
    if (isHost && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "requestNextTask", roomId: currentRoomId }));
    }
});

startVotingBtn.addEventListener("click", () => {
    if (isHost && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "startVoting", roomId: currentRoomId }));
    }
});

submitVoteBtn.addEventListener("click", () => {
    const target = voteTargetSelect.value;
    if (!target) return displayError("Seleciona um jogador para votar.");
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "vote", roomId: currentRoomId, targetPlayerName: target }));
        submitVoteBtn.disabled = true;
        votingStatusMessage.textContent = `Votaste em ${target}. À espera dos outros...`;
    }
});

function updatePlayerList(players) {
    playerList.innerHTML = "<li>Tu (Anfitrião)</li>";
    players.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        playerList.appendChild(li);
    });
}

function updateDiscussionPlayerList(players) {
    discussionPlayerList.innerHTML = "";
    players.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        discussionPlayerList.appendChild(li);
    });
}

function populateVoteTargetSelect(players) {
    voteTargetSelect.innerHTML = `<option value="">Seleciona um jogador</option>`;
    voteTargetSelect.innerHTML += `<option value="skip">⏩ Fazer Skip</option>`;
    players.filter(p => p !== myName).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        voteTargetSelect.appendChild(opt);
    });
}

function updateSubmittedAnswersList(submission) {
    const li = document.createElement("li");
    li.id = `submission-${submission.playerName}`;
    li.dataset.answer = submission.answer;
    li.dataset.role = submission.role;
    li.innerHTML = `
        <strong>${submission.playerName} (${submission.role}):</strong> ${submission.answer}
        <button class="validate-btn" data-player="${submission.playerName}" data-status="valid">✅ Válida</button>
        <button class="validate-btn" data-player="${submission.playerName}" data-status="sabotaged">❌ Sabotada</button>
    `;
    submittedAnswersList.appendChild(li);
    li.querySelectorAll(".validate-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const player = e.target.dataset.player;
            const status = e.target.dataset.status;
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "hostValidateAnswer", roomId: currentRoomId, playerName: player, status }));
            }
        });
    });
}

function checkHostNextTaskButtonState() {
    if (!isHost) return;
    const allValidated = hostCurrentSubmissions.length > 0 &&
        hostCurrentSubmissions.every(s => s.status !== "pending");

    requestNextTaskBtn.disabled = !(allValidated && allPlayersSubmitted);

    if (!allPlayersSubmitted) {
        requestNextTaskBtn.textContent = `Aguardar respostas... (${hostCurrentSubmissions.length} recebidas)`;
    } else if (!allValidated) {
        requestNextTaskBtn.textContent = "Validar todas as respostas...";
    } else {
        requestNextTaskBtn.textContent = "Próxima Tarefa / Iniciar Discussão";
    }
}

showScreen("start-screen");