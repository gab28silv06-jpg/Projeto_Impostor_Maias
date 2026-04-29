const socket = new WebSocket("ws://localhost:3000");

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

// Armazenar submissões para o host para gerir o estado localmente
let hostCurrentSubmissions = [];

function showScreen(screenId) {
    startScreen.classList.remove("active");
    lobbyScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    document.getElementById(screenId).classList.add("active");
    errorMessageDiv.textContent = ""; // Limpa mensagens de erro

    // Esconder todas as secções do jogo por padrão
    taskSection.style.display = "none";
    hostValidationSection.style.display = "none";
    discussionSection.style.display = "none";
    votingSection.style.display = "none";
    eliminationSection.style.display = "none";
    gameOverSection.style.display = "none";
}

function displayError(message) {
    errorMessageDiv.textContent = message;
}

socket.onopen = () => {
    console.log("Conectado ao servidor WebSocket");
};

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
            startGameBtn.disabled = true; // Começa desativado
            lobbyMessage.textContent = "À espera de jogadores...";
            showScreen("lobby-screen");
            break;

        case "roomJoined":
            currentRoomId = data.roomId;
            isHost = false;
            myName = data.playerName;
            lobbyRoomId.textContent = currentRoomId;
            startGameBtn.style.display = "none"; // Jogadores não veem o botão de iniciar
            lobbyMessage.textContent = `Bem-vindo à sala ${data.roomId}, ${data.playerName}! À espera do anfitrião iniciar o jogo.`;
            showScreen("lobby-screen");
            break;

        case "playerJoined":
            if (isHost) {
                updatePlayerList(data.currentPlayers);
                lobbyMessage.textContent = `Novo jogador: ${data.playerName}. Total: ${data.currentPlayers.length} jogadores.`;
                startGameBtn.disabled = data.currentPlayers.length < 3; // Ativa/desativa botão
            }
            break;

        case "playerLeft":
            if (isHost) {
                updatePlayerList(data.currentPlayers);
                lobbyMessage.textContent = `Jogador ${data.playerName} saiu. Total: ${data.currentPlayers.length} jogadores.`;
                startGameBtn.disabled = data.currentPlayers.length < 3; // Ativa/desativa botão
            }
            break;

        case "gameStarted":
            myRole = data.role;
            playerRole.textContent = data.role;
            playerRole.className = data.role; // Adiciona classe para estilo
            playerCharacter.textContent = data.character;
            gameStatusMessage.textContent = `O jogo começou! És o ${data.role} e a tua personagem é ${data.character}.`;
            showScreen("game-screen");
            break;

        case "newTask":
            taskSection.style.display = "block";
            discussionSection.style.display = "none";
            votingSection.style.display = "none";
            eliminationSection.style.display = "none";
            currentTaskDescription.textContent = data.task;
            taskStatusMessage.textContent = "";
            taskAnswerInput.value = ""; // Limpar input anterior
            submitAnswerBtn.disabled = false;
            taskAnswerInput.disabled = false;

            sabotageBtn.style.display = "none"; // Esconder o botão de sabotagem

            if (isHost) {
                hostValidationSection.style.display = "block"; // Garantir que a secção do host é visível
                submittedAnswersList.innerHTML = ""; // Limpar lista de submissões
                requestNextTaskBtn.disabled = true;
                hostCurrentSubmissions = []; // Resetar submissões locais do host

                // Se houver submissões pendentes (e.g., host recarregou), exibi-las
                if (data.pendingSubmissions && data.pendingSubmissions.length > 0) {
                    data.pendingSubmissions.forEach(submission => {
                        hostCurrentSubmissions.push(submission);
                        updateSubmittedAnswersList(submission);
                    });
                    checkHostNextTaskButtonState();
                }
            } else {
                hostValidationSection.style.display = "none";
            }
            break;

        case "newSubmission":
            if (isHost) {
                hostCurrentSubmissions.push(data.submission);
                updateSubmittedAnswersList(data.submission);
                checkHostNextTaskButtonState();
            }
            break;

        case "playerSubmittedAnswer":
            if (!isHost) {
                taskStatusMessage.textContent = `${data.playerName} submeteu a sua resposta.`;
            }
            break;

        case "answerSubmitted":
            taskStatusMessage.textContent = data.message;
            submitAnswerBtn.disabled = true;
            taskAnswerInput.disabled = true;
            break;

        case "answerValidated":
            // Atualizar o estado da submissão na UI de todos os jogadores (se visível)
            const submissionItem = document.getElementById(`submission-${data.playerName}`);
            if (submissionItem) {
                submissionItem.innerHTML = `
                    <strong>${data.playerName} (${submissionItem.dataset.role}):</strong> ${submissionItem.dataset.answer} - ${data.status === 'valid' ? 'Válida' : 'Sabotada'}
                `;
            }
            gameStatusMessage.textContent = `${data.playerName}'s resposta foi marcada como ${data.status === 'valid' ? 'Válida' : 'Sabotada'}.`;
            
            if (isHost) {
                // Atualizar o estado local do host e verificar o botão
                const index = hostCurrentSubmissions.findIndex(sub => sub.playerName === data.playerName);
                if (index !== -1) {
                    hostCurrentSubmissions[index].status = data.status;
                }
                checkHostNextTaskButtonState();
            }
            break;

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
            startVotingBtn.disabled = !isHost; // Apenas host pode iniciar
            break;

        case "hostCanStartVoting":
            if (isHost) {
                startVotingBtn.disabled = false;
            }
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
            votingStatusMessage.textContent = `${data.voter} votou em ${data.target}.`;
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

        case "gameOver":
            gameScreen.classList.remove("active");
            gameOverSection.classList.add("active");
            gameWinnerMessage.textContent = (data.winner === "innocentsWin") ? "Os Inocentes Venceram!" : "O Impostor Venceu!";
            break;

        case "error":
            displayError(data.message);
            if (data.message.includes("Sala encerrada")) {
                setTimeout(() => showScreen("start-screen"), 3000);
            }
            break;
    }
};

socket.onclose = () => {
    console.log("Desconectado do servidor WebSocket");
    displayError("Conexão com o servidor perdida. Por favor, recarrega a página.");
    showScreen("start-screen");
};

socket.onerror = error => {
    console.error("Erro no WebSocket:", error);
    displayError("Ocorreu um erro na conexão. Verifica se o servidor está a correr.");
};

createRoomBtn.addEventListener("click", () => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "createRoom" }));
    } else {
        displayError("Não conectado ao servidor. Tenta novamente.");
    }
});

joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (!playerName) {
        displayError("Por favor, insere o teu nome.");
        return;
    }
    if (!roomId) {
        displayError("Por favor, insere o código da sala.");
        return;
    }

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "joinRoom", playerName: playerName, roomId: roomId }));
    } else {
        displayError("Não conectado ao servidor. Tenta novamente.");
    }
});

startGameBtn.addEventListener("click", () => {
    if (isHost && currentRoomId && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "startGame", roomId: currentRoomId }));
    } else {
        displayError("Não és o anfitrião ou a sala não está pronta.");
    }
});

submitAnswerBtn.addEventListener("click", () => {
    const answer = taskAnswerInput.value.trim();
    if (!answer) {
        displayError("Por favor, escreve a tua resposta.");
        return;
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "submitAnswer", roomId: currentRoomId, answer: answer }));
    } else {
        displayError("Não conectado ao servidor. Tenta novamente.");
    }
});

requestNextTaskBtn.addEventListener("click", () => {
    if (isHost && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "requestNextTask", roomId: currentRoomId }));
    } else {
        displayError("Não és o anfitrião ou não é o momento de pedir a próxima tarefa.");
    }
});

startVotingBtn.addEventListener("click", () => {
    if (isHost && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "startVoting", roomId: currentRoomId }));
    } else {
        displayError("Não és o anfitrião ou não é o momento de votar.");
    }
});

submitVoteBtn.addEventListener("click", () => {
    const target = voteTargetSelect.value;
    if (!target) {
        displayError("Seleciona um jogador para votar.");
        return;
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "vote", roomId: currentRoomId, targetPlayerName: target }));
        submitVoteBtn.disabled = true; // Prevenir múltiplos votos
        votingStatusMessage.textContent = `Votaste em ${target}. À espera dos outros...`;
    } else {
        displayError("Não conectado ao servidor. Tenta novamente.");
    }
});

function updatePlayerList(players) {
    playerList.innerHTML = "";
    players.forEach(pName => {
        const li = document.createElement("li");
        li.textContent = pName;
        playerList.appendChild(li);
    });
    // Adiciona o host à lista (o host já se considera na sala)
    const hostLi = document.createElement("li");
    hostLi.textContent = "Tu (Anfitrião)";
    playerList.prepend(hostLi);
}

function updateDiscussionPlayerList(players) {
    discussionPlayerList.innerHTML = "";
    players.forEach(pName => {
        const li = document.createElement("li");
        li.textContent = pName;
        discussionPlayerList.appendChild(li);
    });
}

function populateVoteTargetSelect(players) {
    voteTargetSelect.innerHTML = "<option value=\"\">Seleciona um jogador</option>";
    players.filter(p => p !== myName).forEach(pName => { // Não pode votar em si mesmo
        const option = document.createElement("option");
        option.value = pName;
        option.textContent = pName;
        voteTargetSelect.appendChild(option);
    });
}

function updateSubmittedAnswersList(submission) {
    const li = document.createElement("li");
    li.id = `submission-${submission.playerName}`;
    li.dataset.answer = submission.answer; // Guardar a resposta original para reexibir
    li.dataset.role = submission.role; // Guardar o role para reexibir
    li.innerHTML = `
        <strong>${submission.playerName} (${submission.role}):</strong> ${submission.answer}
        <button class="validate-btn" data-player="${submission.playerName}" data-status="valid">Válida</button>
        <button class="validate-btn" data-player="${submission.playerName}" data-status="sabotaged">Sabotada</button>
    `;
    submittedAnswersList.appendChild(li);

    li.querySelectorAll(".validate-btn").forEach(button => {
        button.addEventListener("click", (event) => {
            const player = event.target.dataset.player;
            const status = event.target.dataset.status;
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "hostValidateAnswer", roomId: currentRoomId, playerName: player, status: status }));
            }
        });
    });
}

function checkHostNextTaskButtonState() {
    if (isHost) {
        const allValidated = hostCurrentSubmissions.every(sub => sub.status !== "pending");
        requestNextTaskBtn.disabled = !allValidated;
        if (allValidated) {
            requestNextTaskBtn.textContent = "Próxima Tarefa / Iniciar Discussão";
        } else {
            requestNextTaskBtn.textContent = "Aguardar validação das respostas...";
        }
    }
}

// Inicializa o ecrã
showScreen("start-screen");
