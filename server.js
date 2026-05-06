const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {

  socket.on("createGame", (name) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    rooms[code] = {
      players: [{ id: socket.id, name }],
      ball: { x: 200, y: 300, vx: 4, vy: 3 },
      score: [0, 0]
    };

    socket.join(code);
    socket.emit("gameCreated", code);
  });

  socket.on("joinGame", ({ code, name }) => {
    const room = rooms[code];

    if (room && room.players.length === 1) {
      room.players.push({ id: socket.id, name });
      socket.join(code);

      io.to(code).emit("startGame", room.players);
    }
  });

  socket.on("update", ({ code, state }) => {
    socket.to(code).emit("update", state);
  });

});

http.listen(process.env.PORT || 3000);
