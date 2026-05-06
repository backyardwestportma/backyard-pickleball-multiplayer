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

function resetBall(room, direction = 1) {
  room.ball = {
    x: 200,
    y: 300,
    vx: 4.5 * direction,
    vy: Math.random() > 0.5 ? 3 : -3,
    r: 12
  };
}

function gameTick(code) {
  const room = rooms[code];
  if (!room || !room.playing) return;

  const b = room.ball;

  b.x += b.vx;
  b.y += b.vy;

  if (b.y - b.r <= 0 || b.y + b.r >= 600) {
    b.vy *= -1;
  }

  const leftY = room.paddles[0];
  const rightY = room.paddles[1];

  if (b.x - b.r <= 42 && b.y >= leftY && b.y <= leftY + 90 && b.vx < 0) {
    b.vx *= -1.08;
    b.vy += (b.y - (leftY + 45)) * 0.06;
  }

  if (b.x + b.r >= 360 && b.y >= rightY && b.y <= rightY + 90 && b.vx > 0) {
    b.vx *= -1.08;
    b.vy += (b.y - (rightY + 45)) * 0.06;
  }

  if (b.x < -20) {
    room.score[1]++;
    resetBall(room, -1);
  }

  if (b.x > 420) {
    room.score[0]++;
    resetBall(room, 1);
  }

  io.to(code).emit("gameState", {
    paddles: room.paddles,
    ball: room.ball,
    score: room.score,
    players: room.players
  });

  if (room.score[0] >= WIN_SCORE || room.score[1] >= WIN_SCORE) {
    room.playing = false;
    io.to(code).emit("gameOver", {
      winner: room.score[0] > room.score[1] ? room.players[0].name : room.players[1].name,
      score: room.score
    });
    clearInterval(room.interval);
    return;
  }
}

io.on("connection", (socket) => {
  socket.on("createGame", (name) => {
    const code = makeCode();

    rooms[code] = {
      players: [{ id: socket.id, name: name || "Player 1" }],
      paddles: [250, 250],
      score: [0, 0],
      playing: false,
      interval: null
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

    io.to(code).emit("bothReady", { players: room.players });

    let count = 5;
    const countdown = setInterval(() => {
      io.to(code).emit("countdown", count);
      count--;

      if (count < 0) {
        clearInterval(countdown);
        room.playing = true;
        io.to(code).emit("startGame", {
          players: room.players,
          ball: room.ball,
          paddles: room.paddles,
          score: room.score
        });

        room.interval = setInterval(() => gameTick(code), 1000 / 60);
      }
    }, 1000);
  });

  socket.on("paddleMove", ({ code, y }) => {
    const room = rooms[code];
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    room.paddles[playerIndex] = Math.max(0, Math.min(510, y));
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players.some(p => p.id === socket.id)) {
        io.to(code).emit("opponentLeft");
        clearInterval(room.interval);
        delete rooms[code];
      }
    }
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
