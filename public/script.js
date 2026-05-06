const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let mode = "ai";
let roomCode = null;
let playerName = "";
let difficulty = 1;

let paddleY = 250;
let opponentY = 250;
let ball = { x: 200, y: 300, vx: 5, vy: 3, r: 12 };
let score = [0, 0];

const paddleH = 90;
const paddleW = 12;

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
  roomCode = document.getElementById("codeInput").value;
  socket.emit("joinGame", { code: roomCode, name: playerName });
}

socket.on("gameCreated", code => {
  roomCode = code;
  alert("Share code: " + code);
});

socket.on("startGame", () => {
  mode = "multi";
  startGame();
});

socket.on("update", state => {
  opponentY = state.paddleY;
});

function startGame() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("aiMenu").classList.add("hidden");
  document.getElementById("multiMenu").classList.add("hidden");
  gameLoop();
}

function setPaddleFromTouch(clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  paddleY = (clientY - rect.top) * scaleY - paddleH / 2;
  paddleY = Math.max(0, Math.min(canvas.height - paddleH, paddleY));

  if (mode === "multi") {
    socket.emit("update", { code: roomCode, state: { paddleY } });
  }
}

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  setPaddleFromTouch(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  setPaddleFromTouch(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("pointermove", e => {
  setPaddleFromTouch(e.clientY);
});

function resetBall(direction = 1) {
  ball.x = 200;
  ball.y = 300;
  ball.vx = 5 * direction;
  ball.vy = Math.random() > 0.5 ? 3 : -3;
}

function updateGame() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ball.r <= 0 || ball.y + ball.r >= 600) {
    ball.vy *= -1;
  }

  if (mode === "ai") {
    const aiSpeed = difficulty === 1 ? 3 : difficulty === 2 ? 5 : 7;
    const target = ball.y - paddleH / 2;
    opponentY += Math.sign(target - opponentY) * Math.min(Math.abs(target - opponentY), aiSpeed);
    opponentY = Math.max(0, Math.min(600 - paddleH, opponentY));
  }

  // left paddle collision
  if (
    ball.x - ball.r <= 42 &&
    ball.x + ball.r >= 30 &&
    ball.y >= opponentY &&
    ball.y <= opponentY + paddleH &&
    ball.vx < 0
  ) {
    ball.vx *= -1.08;
    ball.vy += (ball.y - (opponentY + paddleH / 2)) * 0.08;
  }

  // right paddle collision
  if (
    ball.x + ball.r >= 360 &&
    ball.x - ball.r <= 372 &&
    ball.y >= paddleY &&
    ball.y <= paddleY + paddleH &&
    ball.vx > 0
  ) {
    ball.vx *= -1.08;
    ball.vy += (ball.y - (paddleY + paddleH / 2)) * 0.08;
  }

  if (ball.x < -20) {
    score[1]++;
    resetBall(1);
  }

  if (ball.x > 420) {
    score[0]++;
    resetBall(-1);
  }

  if (score[0] >= 7 || score[1] >= 7) {
    alert(score[1] > score[0] ? "You win!" : "Backyard wins!");
    location.reload();
  }
}

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

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "white";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BACKYARD", 200, 300);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "white";
  ctx.fillRect(30, opponentY, paddleW, paddleH);
  ctx.fillRect(360, paddleY, paddleW, paddleH);

  drawPickle();

  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${score[0]}  —  ${score[1]}`, 200, 40);
}

function gameLoop() {
  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}
