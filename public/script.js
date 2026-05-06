const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode = null;
let playerIndex = 1;
let gameStarted = false;

let paddleY = 250;
let opponentY = 250;

let ball = { x: 200, y: 300, r: 12 };
let score = [0, 0];
let players = [];

const paddleH = 90;
const paddleW = 12;

// ================= MENU =================

function showAI() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("aiMenu").classList.remove("hidden");
}

function showMulti() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("multiMenu").classList.remove("hidden");
}

// ================= MULTIPLAYER =================

function createGame() {
  const name = document.getElementById("nameInput").value || "Player 1";
  socket.emit("createGame", name);
}

function joinGame() {
  const name = document.getElementById("nameInput").value || "Player 2";
  const code = document.getElementById("codeInput").value;
  roomCode = code;
  socket.emit("joinGame", { code, name });
}

// waiting screen
socket.on("waiting", (data) => {
  roomCode = data.code;
  document.getElementById("multiMenu").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = roomCode;
});

// both players joined
socket.on("bothReady", (data) => {
  players = data.players;
});

// countdown
socket.on("countdown", (count) => {
  document.getElementById("waitingScreen").classList.add("hidden");
  document.getElementById("countdownScreen").classList.remove("hidden");
  document.getElementById("countdownText").innerText = count;
});

// start game
socket.on("startGame", (data) => {
  players = data.players;
  ball = data.ball;
  score = data.score;

  playerIndex = players.findIndex(p => p.id === socket.id);

  document.getElementById("countdownScreen").classList.add("hidden");

  gameStarted = true;
  gameLoop();
});

// live game updates (THIS FIXES EVERYTHING)
socket.on("gameState", (state) => {
  opponentY = state.paddles[1 - playerIndex];
  paddleY = state.paddles[playerIndex];
  ball = state.ball;
  score = state.score;
});

// opponent leaves
socket.on("opponentLeft", () => {
  alert("Opponent left the game");
  location.reload();
});

// ================= CONTROLS =================

function setPaddle(clientY) {
  if (!gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;

  paddleY = (clientY - rect.top) * scaleY - paddleH / 2;
  paddleY = Math.max(0, Math.min(canvas.height - paddleH, paddleY));

  socket.emit("paddleMove", { code: roomCode, y: paddleY });
}

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  setPaddle(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  setPaddle(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("pointermove", (e) => {
  setPaddle(e.clientY);
});

// ================= DRAW =================

function drawPickle() {
  ctx.fillStyle = "#5e8c3b";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9fd36b";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, 400, 600);

  // court
  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 380, 580);

  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(200, 20);
  ctx.lineTo(200, 580);
  ctx.stroke();
  ctx.setLineDash([]);

  // watermark
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "white";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BACKYARD", 200, 300);
  ctx.globalAlpha = 1;

  // paddles
  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, paddleW, paddleH);
  ctx.fillRect(360, paddleY, paddleW, paddleH);

  drawPickle();

  // score + names
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";

  if (players.length === 2) {
    ctx.fillText(
      `${players[0].name} ${score[0]} — ${score[1]} ${players[1].name}`,
      200,
      40
    );
  } else {
    ctx.fillText(`${score[0]} — ${score[1]}`, 200, 40);
  }
}

// ================= LOOP =================

function gameLoop() {
  if (!gameStarted) return;

  draw();
  requestAnimationFrame(gameLoop);
}
