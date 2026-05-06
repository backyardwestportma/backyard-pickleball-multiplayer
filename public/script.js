const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode;
let playerIndex = 0;
let gameStarted = false;

let paddleY = 250;
let opponentY = 250;
let ball = { x: 200, y: 300 };
let score = [0, 0];

// ===== UI =====

function showMulti() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("multiMenu").classList.remove("hidden");
}

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

socket.on("waiting", ({ code }) => {
  roomCode = code;
  document.getElementById("multiMenu").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = code;
});

socket.on("countdown", (n) => {
  document.getElementById("waitingScreen").classList.add("hidden");
  document.getElementById("countdownScreen").classList.remove("hidden");
  document.getElementById("countdownText").innerText = n;
});

socket.on("startGame", () => {
  document.getElementById("countdownScreen").classList.add("hidden");
  gameStarted = true;
});

socket.on("state", (room) => {
  playerIndex = room.players.findIndex(p => p.id === socket.id);

  paddleY = room.paddles[playerIndex];
  opponentY = room.paddles[1 - playerIndex];
  ball = room.ball;
  score = room.score;
});

// ===== CONTROLS =====

canvas.addEventListener("touchmove", (e) => {
  const rect = canvas.getBoundingClientRect();
  let y = e.touches[0].clientY - rect.top - 45;

  socket.emit("move", { code: roomCode, y });
});

// ===== DRAW =====

function draw() {
  ctx.clearRect(0, 0, 400, 600);

  // court
  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.strokeStyle = "white";
  ctx.strokeRect(10, 10, 380, 580);

  // paddles
  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, 12, 90);
  ctx.fillRect(360, paddleY, 12, 90);

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
  ctx.fill();

  // score
  ctx.fillText(`${score[0]} - ${score[1]}`, 180, 40);
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
