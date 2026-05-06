const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};
const WIN = 7;

function makeCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function resetBall(room, dir = 1) {
  room.ball = {
    x: 200,
    y: 300,
    vx: 4 * dir,
    vy: Math.random() * 4 - 2,
    r: 10
  };
}

io.on("connection", (socket) => {

  socket.on("create", (name) => {
    const code = makeCode();

    rooms[code] = {
      players: [{ id: socket.id, name }],
      paddles: [250, 250],
      score: [0, 0],
      playing: false
    };

    socket.join(code);
    socket.emit("waiting", code);
  });

  socket.on("join", ({ code, name }) => {
    const room = rooms[code];
    if (!room || room.players.length >= 2) return;

    room.players.push({ id: socket.id, name });
    socket.join(code);

    io.to(code).emit("ready", room.players);

    let count = 5;

    function countdown() {
      if (count > 0) {
        io.to(code).emit("count", count);
        count--;
        setTimeout(countdown, 1000);
      } else {
        resetBall(room);
        room.playing = true;

        io.to(code).emit("start");

        room.loop = setInterval(() => updateGame(code), 1000 / 60);
      }
    }

    countdown();
  });

  socket.on("move", ({ code, y }) => {
    const room = rooms[code];
    if (!room) return;

    const i = room.players.findIndex(p => p.id === socket.id);
    if (i !== -1) {
      room.paddles[i] = Math.max(0, Math.min(510, y));
    }
  });

});

function updateGame(code) {
  const room = rooms[code];
  if (!room || !room.playing) return;

  const b = room.ball;

  b.x += b.vx;
  b.y += b.vy;

  if (b.y < 0 || b.y > 600) b.vy *= -1;

  const left = room.paddles[0];
  const right = room.paddles[1];

  if (b.x < 50 && b.y > left && b.y < left + 90 && b.vx < 0) {
    b.vx *= -1.05;
  }

  if (b.x > 350 && b.y > right && b.y < right + 90 && b.vx > 0) {
    b.vx *= -1.05;
  }

  if (b.x < 0) {
    room.score[1]++;
    resetBall(room, 1);
  }

  if (b.x > 400) {
    room.score[0]++;
    resetBall(room, -1);
  }

  io.to(code).emit("state", room);

  if (room.score[0] >= WIN || room.score[1] >= WIN) {
    room.playing = false;
    clearInterval(room.loop);
    io.to(code).emit("end", room.score);
  }
}

http.listen(process.env.PORT || 3000);
