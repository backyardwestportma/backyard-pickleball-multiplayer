const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode;
let playerIndex = 0;
let gameStarted = false;

let paddleY = 250;
let opponentY = 250;
let ball = { x: 200, y: 300, r: 12 };
let score = [0, 0];
let players = [];

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

socket.on("waiting", data => {
  roomCode = data.code;
  document.getElementById("multiMenu").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = roomCode;
});

socket.on("countdown", count => {
  document.getElementById("waitingScreen").classList.add("hidden");
  document.getElementById("countdownScreen").classList.remove("hidden");
  document.getElementById("countdownText").innerText =
    count === "GO" ? "GO!" : count;
});

socket.on("startGame", data => {
  players = data.players;
  playerIndex = players.findIndex(p => p.id === socket.id);

  ball = data.ball;
  score = data.score;

  document.getElementById("countdownScreen").classList.add("hidden");
  gameStarted = true;
});

socket.on("gameState", room => {
  if (playerIndex === -1) return;

  paddleY = room.paddles[playerIndex];
  opponentY = room.paddles[1 - playerIndex];
  ball = room.ball;
  score = room.score;
  players = room.players;
});

socket.on("gameOver", data => {
  alert(`${data.winner} wins!`);
  location.reload();
});

function setPaddle(clientY) {
  if (!gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;

  let y = (clientY - rect.top) * scaleY - 45;
  y = Math.max(0, Math.min(510, y));

  socket.emit("paddleMove", { code: roomCode, y });
}

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  setPaddle(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  setPaddle(e.touches[0].clientY);
}, { passive: false });

function draw() {
  ctx.clearRect(0, 0, 400, 600);

  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 380, 580);

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "white";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BACKYARD", 200, 300);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, 12, 90);
  ctx.fillRect(360, paddleY, 12, 90);

  ctx.fillStyle = "#6bbf59";
  ctx.beginPath();
  ctx.arc(ball.x || 200, ball.y || 300, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "bold 18px Arial";

  if (players.length === 2) {
    ctx.fillText(`${players[0].name} ${score[0]} — ${score[1]} ${players[1].name}`, 200, 40);
  } else {
    ctx.fillText(`${score[0]} — ${score[1]}`, 200, 40);
  }
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
