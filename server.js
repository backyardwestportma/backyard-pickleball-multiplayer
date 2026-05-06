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
    socket.emit("waiting", code);
  });

  socket.on("joinGame", ({ code, name }) => {
    const room = rooms[code];

    if (room && room.players.length === 1) {
      room.players.push({ id: socket.id, name });
      socket.join(code);

      // notify both players
      io.to(code).emit("bothReady", room.players);
    } else {
      socket.emit("errorMessage", "Invalid or full room");
    }
  });

});
http.listen(process.env.PORT || 3000);
