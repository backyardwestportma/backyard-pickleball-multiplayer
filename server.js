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
      players: [{ id: socket.id, name }]
    };

    socket.join(code);

    socket.emit("waiting", {
      code,
      name
    });
  });

  socket.on("joinGame", ({ code, name }) => {
    const room = rooms[code];

    if (room && room.players.length === 1) {
      room.players.push({ id: socket.id, name });
      socket.join(code);

      io.to(code).emit("bothReady", {
        players: room.players
      });
    } else {
      socket.emit("errorMessage", "Game not found or full");
    }
  });

  socket.on("paddleMove", ({ code, y }) => {
    socket.to(code).emit("opponentMove", y);
  });

});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
