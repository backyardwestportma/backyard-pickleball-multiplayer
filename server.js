const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};
const WIN_SCORE = 7;

function code() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function resetBall(room, dir = 1) {
  room.ball = { x: 200, y: 300, vx: 4.5 * dir, vy: 3, r: 12 };
}

io.on("connection", socket => {
  socket.on("createGame", name => {
    const roomCode = code();

    rooms[roomCode] = {
      players: [{ id: socket.id, name: name || "Player 1" }],
      paddles: [255, 255],
      ball: { x: 200, y: 300, vx: 4.5, vy: 3, r: 12 },
      score: [0, 0],
      playing: false,
      loop: null
    };

    socket.join(roomCode);
    socket.emit("waiting", { code: roomCode });
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
    const timer = setInterval(() => {
      io.to(code).emit("countdown", count);
      count--;

      if (count < 0) {
        clearInterval(timer);
        room.playing = true;
        resetBall(room, 1);

        room.loop = setInterval(() => {
          if (!room.playing) return;

          const b = room.ball;

          b.x += b.vx;
          b.y += b.vy;

          if (b.y - b.r <= 0 || b.y + b.r >= 600) {
            b.vy *= -1;
          }

          const leftY = room.paddles[0];
          const rightY = room.paddles[1];

          if (b.x - b.r <= 42 && b.x > 25 && b.y >= leftY && b.y <= leftY + 90 && b.vx < 0) {
            b.vx = Math.abs(b.vx) * 1.03;
            b.vy += (b.y - (leftY + 45)) * 0.05;
          }

          if (b.x + b.r >= 360 && b.x < 375 && b.y >= rightY && b.y <= rightY + 90 && b.vx > 0) {
            b.vx = -Math.abs(b.vx) * 1.03;
            b.vy += (b.y - (rightY + 45)) * 0.05;
          }

          if (b.x < -25) {
            room.score[1]++;
            resetBall(room, -1);
          }

          if (b.x > 425) {
            room.score[0]++;
            resetBall(room, 1);
          }

          io.to(code).emit("gameState", {
            players: room.players,
            paddles: room.paddles,
            ball: room.ball,
            score: room.score
          });

          if (room.score[0] >= WIN_SCORE || room.score[1] >= WIN_SCORE) {
            room.playing = false;
            clearInterval(room.loop);

            io.to(code).emit("gameOver", {
              winner: room.score[0] > room.score[1] ? room.players[0].name : room.players[1].name,
              score: room.score
            });
          }
        }, 1000 / 30);
      }
    }, 1000);
  });

  socket.on("paddleMove", ({ code, y }) => {
    const room = rooms[code];
    if (!room) return;

    const index = room.players.findIndex(p => p.id === socket.id);
    if (index === -1) return;

    room.paddles[index] = Math.max(0, Math.min(510, y));
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("V3 server running");
});
