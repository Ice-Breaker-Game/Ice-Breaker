
let timer = 30;
let score = 0;
let timerInterval = null;
let gameRunning = false;

const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("score");
const gameStatus = document.getElementById("game-status");

const startButton = document.getElementById("start-button");
const scoreButton = document.getElementById("score-button");
const endButton = document.getElementById("end-button");

function startGame() {
    if (gameRunning) return;

    gameRunning = true;
    timer = 30;
    score = 0;

    timerDisplay.textContent = timer;
    scoreDisplay.textContent = score;
    gameStatus.textContent = "Game in progress!";

    startButton.disabled = true;
    scoreButton.disabled = false;
    endButton.disabled = false;

    timerInterval = setInterval(() => {
        timer--;
        timerDisplay.textContent = timer;

        if (timer <= 0) {
            endGame();
        }
    }, 1000);
}

function addScore() {
    if (!gameRunning) return;

    score++;
    scoreDisplay.textContent = score;
}

function endGame() {
    if (!gameRunning) return;

    gameRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;

    gameStatus.textContent = `Game over! Final score: ${score}`;

    startButton.disabled = false;
    scoreButton.disabled = true;
    endButton.disabled = true;
}

startButton.addEventListener("click", startGame);
scoreButton.addEventListener("click", addScore);
endButton.addEventListener("click", endGame);
