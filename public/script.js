const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let mode = null;
let roomCode = null;
let playerName = "";
let playerIndex = 1;

let paddleY = 250;
let opponentY = 250;

let ball = { x: 200, y: 300, vx: 5, vy: 3, r: 12 };
let score = [0, 0];

const paddleH = 90;
const paddleW = 12;

let gameStarted = false;

// ================= UI NAV =================

function showAI() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("aiMenu").classList.remove("hidden");
}

function showMulti() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("multiMenu").classList.remove("hidden");
}

// ================= AI =================

function startAI(level) {
  mode = "ai";
  document.getElementById("aiMenu").classList.add("hidden");
  startGame();
}

// ================= MULTI =================

function createGame() {
  playerName = document.getElementById("nameInput").value || "Player 1";
  socket.emit("createGame", playerName);
}

function joinGame() {
  playerName = document.getElementById("nameInput").value || "Player 2";
  roomCode = document.getElementById("codeInput").value;
  socket.emit("joinGame", { code: roomCode, name: playerName });
}

socket.on("waiting", (data) => {
  roomCode = data.code;

  document.getElementById("multiMenu").classList.add("hidden");
  document.getElementById("waitingScreen").classList.remove("hidden");
  document.getElementById("roomCode").innerText = roomCode;
});

socket.on("bothReady", (data) => {
  document.getElementById("waitingScreen").classList.add("hidden");

  playerIndex = data.players[0].id === socket.id ? 0 : 1;

  startCountdown();
});

socket.on("opponentMove", (y) => {
  opponentY = y;
});

// ================= COUNTDOWN =================

function startCountdown() {
  let count = 5;

  const screen = document.getElementById("countdownScreen");
  const text = document.getElementById("countdownText");

  screen.classList.remove("hidden");

  const interval = setInterval(() => {
    text.innerText = count;
    count--;

    if (count < 0) {
      clearInterval(interval);
      screen.classList.add("hidden");

      mode = "multi";
      startGame();
    }
  }, 1000);
}

// ================= GAME START =================

function startGame() {
  gameStarted = true;
  gameLoop();
}

// ================= CONTROLS =================

function setPaddle(clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;

  paddleY = (clientY - rect.top) * scaleY - paddleH / 2;
  paddleY = Math.max(0, Math.min(canvas.height - paddleH, paddleY));

  if (mode === "multi") {
    socket.emit("paddleMove", { code: roomCode, y: paddleY });
  }
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

// ================= GAME LOGIC =================

function resetBall(direction = 1) {
  ball.x = 200;
  ball.y = 300;
  ball.vx = 5 * direction;
  ball.vy = Math.random() > 0.5 ? 3 : -3;
}

function updateGame() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // bounce walls
  if (ball.y - ball.r <= 0 || ball.y + ball.r >= 600) {
    ball.vy *= -1;
  }

  // AI movement
  if (mode === "ai") {
    opponentY += (ball.y - opponentY) * 0.05;
  }

  // LEFT paddle collision
  if (
    ball.x - ball.r <= 42 &&
    ball.y >= opponentY &&
    ball.y <= opponentY + paddleH &&
    ball.vx < 0
  ) {
    ball.vx *= -1.1;
  }

  // RIGHT paddle collision
  if (
    ball.x + ball.r >= 360 &&
    ball.y >= paddleY &&
    ball.y <= paddleY + paddleH &&
    ball.vx > 0
  ) {
    ball.vx *= -1.1;
  }

  // scoring
  if (ball.x < 0) {
    score[1]++;
    resetBall(1);
  }

  if (ball.x > 400) {
    score[0]++;
    resetBall(-1);
  }

  // win
  if (score[0] >= 7 || score[1] >= 7) {
    alert(score[1] > score[0] ? "You win!" : "Backyard wins!");
    location.reload();
  }
}

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

  // score
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`${score[0]} — ${score[1]}`, 200, 40);
}

// ================= LOOP =================

function gameLoop() {
  if (!gameStarted) return;

  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}
