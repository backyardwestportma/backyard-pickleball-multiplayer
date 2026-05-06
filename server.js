const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};
const WIN_SCORE = 7;

function makeCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function resetBall(room, dir = 1) {
  room.ball = {
    x: 200,
    y: 300,
    vx: 4 * dir,
    vy: Math.random() * 4 - 2,
    r: 12
  };
}

io.on("connection", (socket) => {
  socket.on("createGame", (name) => {
    const code = makeCode();

    rooms[code] = {
      players: [{ id: socket.id, name: name || "Player 1" }],
      paddles: [250, 250],
      score: [0, 0],
      playing: false,
      loop: null
    };

    resetBall(rooms[code], 1);

    socket.join(code);
    socket.emit("waiting", { code });
  });

  socket.on("joinGame", ({ code, name }) => {
    const room = rooms[code];

    if (!room || room.players.length >= 2) {
      socket.emit("errorMessage", "Game not found or full");
      return;
    }

    room.players.push({ id: socket.id, name: name || "Player 2" });
    socket.join(code);

    io.to(code).emit("bothReady", room.players);

    let count = 5;

    function runCountdown() {
      if (count > 0) {
        io.to(code).emit("countdown", count);
        count--;
        setTimeout(runCountdown, 1000);
      } else {
        resetBall(room, 1);
        room.playing = true;

        io.to(code).emit("startGame");

        room.loop = setInterval(() => {
          gameLoop(code);
        }, 1000 / 60);
      }
    }

    runCountdown();
  });

  socket.on("move", ({ code, y }) => {
    const room = rooms[code];
    if (!room) return;

    const index = room.players.findIndex(p => p.id === socket.id);

    if (index !== -1) {
      room.paddles[index] = Math.max(0, Math.min(510, y));
    }
  });
});

function gameLoop(code) {
  const room = rooms[code];
  if (!room || !room.playing) return;

  const b = room.ball;

  b.x += b.vx;
  b.y += b.vy;

  if (b.y - b.r <= 0 || b.y + b.r >= 600) {
    b.vy *= -1;
  }

  const left = room.paddles[0];
  const right = room.paddles[1];

  if (b.x - b.r <= 42 && b.y >= left && b.y <= left + 90 && b.vx < 0) {
    b.vx = Math.abs(b.vx) * 1.05;
  }

  if (b.x + b.r >= 360 && b.y >= right && b.y <= right + 90 && b.vx > 0) {
    b.vx = -Math.abs(b.vx) * 1.05;
  }

  if (b.x < -20) {
    room.score[1]++;
    resetBall(room, 1);
  }

  if (b.x > 420) {
    room.score[0]++;
    resetBall(room, -1);
  }

  io.to(code).emit("state", room);

  if (room.score[0] >= WIN_SCORE || room.score[1] >= WIN_SCORE) {
    room.playing = false;
    clearInterval(room.loop);

    const winner =
      room.score[0] > room.score[1]
        ? room.players[0].name
        : room.players[1].name;

    io.to(code).emit("gameOver", { winner });
  }
}

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
