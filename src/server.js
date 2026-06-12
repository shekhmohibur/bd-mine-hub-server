const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { status } = require("minecraft-server-util");
const playerRoutes = require("../routes/player.routes");
const serverRoutes = require("../routes/server.routes");
const voteRoutes = require("../routes/vote.routes");
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/players", playerRoutes);
app.use("/api/server", serverRoutes);
app.use("/api/votes", voteRoutes);

app.get("/", (req, res) => {
  res.send("BD Mine Hub API Running");
});

io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client Disconnected:", socket.id);
  });
});

setInterval(async () => {
  try {
    const result = await status("mc.trivora.top", 25647);

    io.emit("serverStatus", {
      online: result.players.online,
      max: result.players.max,
      version: result.version.name,
      motd: result.motd.clean,
    });

    console.log("Status Sent");
  } catch (error) {
    console.log("Status Error:", error.message);
  }
}, 10000);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
