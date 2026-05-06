const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let roomCode = null;
let myIndex = 0;
let started = false;

let paddle = 255;
let opp = 255;
let ball = { x: 200, y: 300, r: 11 };
let score = [0, 0];
let players = [{ name: "Player 1" }, { name: "Player 2" }];

function hideAll() {
  ["menu", "wait", "count", "end"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
}

function createGame() {
  const name = document.getElementById("name").value || "Player 1";
  socket.emit("create", name);
}

function joinGame() {
  const name = document.getElementById("name").value || "Player 2";
  const code = document.getElementById("code").value.trim();
  socket.emit("join", { code, name });
}

socket.on("assigned", data => {
  roomCode = data.code;
  myIndex = data.index;
});

socket.on("waiting", code => {
  hideAll();
  document.getElementById("wait").classList.remove("hidden");
  document.getElementById("room").innerText = code;
});

socket.on("count", n => {
  hideAll();
  document.getElementById("count").classList.remove("hidden");
  document.getElementById("countText").innerText = n;
});

socket.on("start", state => {
  applyState(state);
  hideAll();
  started = true;
});

socket.on("state", applyState);

socket.on("end", state => {
  applyState(state);
  hideAll();
  const winner = score[0] > score[1] ? players[0].name : players[1].name;
  document.getElementById("winnerText").innerText = `${winner} wins!`;
  document.getElementById("end").classList.remove("hidden");
  started = false;
});

socket.on("opponentLeft", () => {
  hideAll();
  document.getElementById("winnerText").innerText = "Opponent left";
  document.getElementById("end").classList.remove("hidden");
  started = false;
});

function applyState(state) {
  players = state.players;
  ball = state.ball;
  score = state.score;

  paddle = state.paddles[myIndex];
  opp = state.paddles[1 - myIndex];
}

function movePaddle(clientY) {
  if (!started || !roomCode) return;

  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const y = (clientY - rect.top) * scaleY - 45;

  socket.emit("move", { code: roomCode, y });
}

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  movePaddle(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  movePaddle(e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("pointermove", e => {
  movePaddle(e.clientY);
});

function drawCourt() {
  ctx.fillStyle = "#0C2B68";
  ctx.fillRect(0, 0, 400, 600);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 376, 576);

  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(200, 20);
  ctx.lineTo(200, 580);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "white";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText("BACKYARD", 200, 300);
  ctx.globalAlpha = 1;
}

function drawPickle() {
  ctx.fillStyle = "#5f9f3f";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a7d96d";
  ctx.beginPath();
  ctx.arc(ball.x - 2, ball.y - 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, 400, 600);
  drawCourt();

  ctx.fillStyle = "white";
  ctx.fillRect(30, opp, 12, 90);
  ctx.fillRect(358, paddle, 12, 90);

  drawPickle();

  ctx.fillStyle = "white";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "center";

  const leftName = players[0]?.name || "Player 1";
  const rightName = players[1]?.name || "Player 2";
  ctx.fillText(`${leftName} ${score[0]}  —  ${score[1]} ${rightName}`, 200, 42);
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
