const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode;
let playerIndex;
let gameStarted = false;

let paddleY = 250;
let opponentY = 250;

let ball = {};
let score = [0, 0];
let players = [];

function showMulti() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("multiMenu").classList.remove("hidden");
}

function createGame() {
  const name = document.getElementById("nameInput").value;
  socket.emit("createGame", name);
}

function joinGame() {
  const name = document.getElementById("nameInput").value;
  const code = document.getElementById("codeInput").value;
  socket.emit("joinGame", { code, name });
}

socket.on("waiting", (data) => {
  roomCode = data.code;
  document.getElementById("multiMenu").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = roomCode;
});

socket.on("bothReady", (data) => {
  players = data.players;
});

socket.on("countdown", (count) => {
  document.getElementById("waitingScreen").classList.add("hidden");
  document.getElementById("countdownScreen").classList.remove("hidden");
  document.getElementById("countdownText").innerText = count;
});

socket.on("startGame", (data) => {
  players = data.players;
  playerIndex = players.findIndex(p => p.id === socket.id);
  document.getElementById("countdownScreen").classList.add("hidden");
  gameStarted = true;
});

socket.on("gameState", (room) => {
  opponentY = room.paddles[1 - playerIndex];
  paddleY = room.paddles[playerIndex];
  ball = room.ball;
  score = room.score;
});

function setPaddle(y) {
  if (!gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  paddleY = y - rect.top - 45;

  socket.emit("paddleMove", { code: roomCode, y: paddleY });
}

canvas.addEventListener("touchmove", e => {
  setPaddle(e.touches[0].clientY);
});

function draw() {
  ctx.clearRect(0, 0, 400, 600);

  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, 12, 90);
  ctx.fillRect(360, paddleY, 12, 90);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillText(`${score[0]} - ${score[1]}`, 180, 40);
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
