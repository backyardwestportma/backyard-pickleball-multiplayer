const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let mode = null;
let roomCode = null;
let playerName = "";
let players = [];
let difficulty = 1;

let paddleY = 250;
let opponentY = 250;

let ball = { x: 200, y: 300, vx: 4, vy: 3 };

let score = [0, 0];

function showAI() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("aiMenu").classList.remove("hidden");
}

function showMulti() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("multiMenu").classList.remove("hidden");
}

function startAI(level) {
  difficulty = level;
  mode = "ai";
  startGame();
}

function createGame() {
  playerName = document.getElementById("nameInput").value || "Player 1";
  socket.emit("createGame", playerName);
}

function joinGame() {
  playerName = document.getElementById("nameInput").value || "Player 2";
  const code = document.getElementById("codeInput").value;
  roomCode = code;
  socket.emit("joinGame", { code, name: playerName });
}

socket.on("gameCreated", (code) => {
  roomCode = code;
  alert("Share code: " + code);
});

socket.on("startGame", (p) => {
  players = p;
  startGame();
});

function startGame() {
  document.getElementById("aiMenu").classList.add("hidden");
  document.getElementById("multiMenu").classList.add("hidden");

  gameLoop();
}

canvas.addEventListener("touchmove", (e) => {
  paddleY = e.touches[0].clientY - 80;

  if (mode === "multi") {
    socket.emit("update", { code: roomCode, state: { paddleY } });
  }
});

socket.on("update", (state) => {
  opponentY = state.paddleY;
});

function drawBall() {
  ctx.fillStyle = "#6bbf59";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
  ctx.fill();
}

function updateGame() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y < 0 || ball.y > 600) ball.vy *= -1;

  if (mode === "ai") {
    opponentY += (ball.y - opponentY) * 0.05 * difficulty;
  }

  if (ball.x < 0) {
    score[1]++;
    resetBall();
  }

  if (ball.x > 400) {
    score[0]++;
    resetBall();
  }

  if (score[0] === 7 || score[1] === 7) {
    alert("Game Over");
    location.reload();
  }
}

function resetBall() {
  ball.x = 200;
  ball.y = 300;
}

function draw() {
  ctx.clearRect(0, 0, 400, 600);

  // faint logo placeholder
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "white";
  ctx.fillRect(100, 250, 200, 100);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "white";
  ctx.fillRect(360, paddleY, 10, 80);
  ctx.fillRect(30, opponentY, 10, 80);

  drawBall();

  ctx.fillText(`${score[0]} - ${score[1]}`, 170, 30);
}

function gameLoop() {
  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}
