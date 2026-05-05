const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("createGame", () => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomCode] = { players: [socket.id] };
    socket.join(roomCode);
    socket.emit("gameCreated", roomCode);
  });

  socket.on("joinGame", (code) => {
    const room = rooms[code];
    if (room && room.players.length === 1) {
      room.players.push(socket.id);
      socket.join(code);

      io.to(code).emit("startGame");
    } else {
      socket.emit("errorMessage", "Invalid or full room");
    }
  });

  socket.on("paddleMove", ({ code, y }) => {
    socket.to(code).emit("opponentMove", y);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
