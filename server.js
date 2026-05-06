const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};
const W = 400, H = 600, PADDLE_H = 90, WIN = 7;

function makeCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function resetBall(room, dir = 1) {
  room.ball = {
    x: W / 2,
    y: H / 2,
    vx: 4 * dir,
    vy: Math.random() * 4 - 2,
    r: 11
  };
}

function safeState(room) {
  return {
    players: room.players.map(p => ({ name: p.name })),
    paddles: room.paddles,
    ball: room.ball,
    score: room.score
  };
}

io.on("connection", socket => {
  socket.on("create", name => {
    const code = makeCode();

    rooms[code] = {
      players: [{ id: socket.id, name: name || "Player 1" }],
      paddles: [255, 255],
      score: [0, 0],
      playing: false,
      loop: null
    };

    resetBall(rooms[code], 1);

    socket.join(code);
    socket.emit("assigned", { code, index: 0 });
    socket.emit("waiting", code);
  });

  socket.on("join", ({ code, name }) => {
    const room = rooms[code];
    if (!room || room.players.length >= 2) {
      socket.emit("errorMsg", "Game not found or full");
      return;
    }

    room.players.push({ id: socket.id, name: name || "Player 2" });
    socket.join(code);

    socket.emit("assigned", { code, index: 1 });
    io.to(code).emit("ready", safeState(room));

    let count = 5;

    function countdown() {
      if (count > 0) {
        io.to(code).emit("count", count);
        count--;
        setTimeout(countdown, 1000);
      } else {
        room.playing = true;
        resetBall(room, Math.random() > 0.5 ? 1 : -1);
        io.to(code).emit("start", safeState(room));
        room.loop = setInterval(() => update(code), 1000 / 60);
      }
    }

    countdown();
  });

  socket.on("move", ({ code, y }) => {
    const room = rooms[code];
    if (!room) return;

    const i = room.players.findIndex(p => p.id === socket.id);
    if (i !== -1) {
      room.paddles[i] = Math.max(0, Math.min(H - PADDLE_H, y));
    }
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players.some(p => p.id === socket.id)) {
        clearInterval(room.loop);
        io.to(code).emit("opponentLeft");
        delete rooms[code];
      }
    }
  });
});

function update(code) {
  const room = rooms[code];
  if (!room || !room.playing) return;

  const b = room.ball;
  b.x += b.vx;
  b.y += b.vy;

  if (b.y - b.r <= 0 || b.y + b.r >= H) b.vy *= -1;

  const leftY = room.paddles[0];
  const rightY = room.paddles[1];

  if (b.vx < 0 && b.x - b.r <= 42 && b.x > 20 && b.y >= leftY && b.y <= leftY + PADDLE_H) {
    b.x = 43 + b.r;
    b.vx = Math.min(Math.abs(b.vx) * 1.04, 8);
    b.vy += (b.y - (leftY + PADDLE_H / 2)) * 0.05;
  }

  if (b.vx > 0 && b.x + b.r >= 360 && b.x < 380 && b.y >= rightY && b.y <= rightY + PADDLE_H) {
    b.x = 359 - b.r;
    b.vx = -Math.min(Math.abs(b.vx) * 1.04, 8);
    b.vy += (b.y - (rightY + PADDLE_H / 2)) * 0.05;
  }

  if (b.x < -20) {
    room.score[1]++;
    resetBall(room, -1);
  }

  if (b.x > W + 20) {
    room.score[0]++;
    resetBall(room, 1);
  }

  io.to(code).emit("state", safeState(room));

  if (room.score[0] >= WIN || room.score[1] >= WIN) {
    room.playing = false;
    clearInterval(room.loop);
    io.to(code).emit("end", safeState(room));
  }
}

http.listen(process.env.PORT || 3000);
