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

function hideAllScreens() {
  ["menu", "multiMenu", "waitingScreen", "countdownScreen"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
}

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
  const code = document.getElementById("codeInput").value.trim();
  roomCode = code;
  socket.emit("joinGame", { code, name });
}

socket.on("waiting", ({ code }) => {
  roomCode = code;
  hideAllScreens();
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = code;
});

socket.on("countdown", (n) => {
  hideAllScreens();
  document.getElementById("countdownScreen").classList.remove("hidden");
  document.getElementById("countdownText").innerText = n;
});

socket.on("startGame", () => {
  hideAllScreens();
  gameStarted = true;
});

socket.on("state", (room) => {
  playerIndex = room.players.findIndex(p => p.id === socket.id);
  if (playerIndex === -1) return;

  paddleY = room.paddles[playerIndex];
  opponentY = room.paddles[1 - playerIndex];
  ball = room.ball;
  score = room.score;
});

socket.on("gameOver", ({ winner }) => {
  alert(`${winner} wins!`);
  location.reload();
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!gameStarted) return;

  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const y = (e.touches[0].clientY - rect.top) * scaleY - 45;

  socket.emit("move", { code: roomCode, y });
}, { passive: false });

function draw() {
  ctx.clearRect(0, 0, 400, 600);
  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 380, 580);

  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, 12, 90);
  ctx.fillRect(360, paddleY, 12, 90);

  ctx.fillStyle = "#6bbf59";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${score[0]} - ${score[1]}`, 200, 40);
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
