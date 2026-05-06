const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode = null;
let paddleY = 250;
let opponentY = 250;

function createGame() {
  socket.emit("createGame");
}

function joinGame() {
  const code = document.getElementById("codeInput").value;
  roomCode = code;
  socket.emit("joinGame", code);
}

socket.on("gameCreated", (code) => {
  roomCode = code;
  alert("Share this code: " + code);
});

socket.on("startGame", () => {
  document.getElementById("menu").style.display = "none";
  gameLoop();
});

socket.on("opponentMove", (y) => {
  opponentY = y;
});

canvas.addEventListener("touchmove", (e) => {
  const rect = canvas.getBoundingClientRect();
  paddleY = e.touches[0].clientY - rect.top;
  socket.emit("paddleMove", { code: roomCode, y: paddleY });
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // player paddle
  ctx.fillStyle = "white";
  ctx.fillRect(350, paddleY, 10, 80);

  // opponent paddle
  ctx.fillRect(40, opponentY, 10, 80);
}

function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}
