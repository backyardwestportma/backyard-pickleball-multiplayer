const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let code, index;
let paddle = 250, opp = 250;
let ball = { x: 200, y: 300 };
let score = [0, 0];
let started = false;

function hideAll() {
  ["menu","wait","count"].forEach(id =>
    document.getElementById(id).classList.add("hidden")
  );
}

function create() {
  const name = document.getElementById("name").value || "Player 1";
  socket.emit("create", name);
}

function join() {
  const name = document.getElementById("name").value || "Player 2";
  code = document.getElementById("code").value;
  socket.emit("join", { code, name });
}

socket.on("waiting", c => {
  code = c;
  hideAll();
  document.getElementById("wait").classList.remove("hidden");
  document.getElementById("room").innerText = c;
});

socket.on("count", n => {
  hideAll();
  document.getElementById("count").classList.remove("hidden");
  document.getElementById("countText").innerText = n;
});

socket.on("start", () => {
  hideAll();
  started = true;
});

socket.on("state", room => {
  index = room.players.findIndex(p => p.id === socket.id);
  paddle = room.paddles[index];
  opp = room.paddles[1 - index];
  ball = room.ball;
  score = room.score;
});

socket.on("end", s => {
  alert(`${s[0]} - ${s[1]}`);
  location.reload();
});

canvas.addEventListener("touchmove", e => {
  if (!started) return;
  const rect = canvas.getBoundingClientRect();
  const y = e.touches[0].clientY - rect.top - 45;
  socket.emit("move", { code, y });
}, { passive:false });

function draw() {
  ctx.clearRect(0,0,400,600);

  ctx.fillStyle="#0C2B68";
  ctx.fillRect(0,0,400,600);

  ctx.strokeStyle="white";
  ctx.strokeRect(10,10,380,580);

  ctx.fillStyle="white";
  ctx.fillRect(30,opp,12,90);
  ctx.fillRect(360,paddle,12,90);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 10, 0, Math.PI*2);
  ctx.fill();

  ctx.fillText(`${score[0]} - ${score[1]}`,180,40);
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}
loop();
