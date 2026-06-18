require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { status } = require("minecraft-server-util");

const pool = require("../config/mysql");
const ptero = require("../services/pterodactyl");

const playerRoutes = require("../routes/player.routes");
const serverRoutes = require("../routes/server.routes");
const voteRoutes = require("../routes/vote.routes");
const syncUsersDb = require("../services/syncUsersDb");
const db = require("../database/sqlite");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: `${process.env.site_url}`,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: `${process.env.site_url}`,
    credentials: true,
  })
);
app.use(express.json());

/*
|--------------------------------------------------------------------------
| MySQL Test
|--------------------------------------------------------------------------
*/

(async () => {
  try {
    const conn = await pool.getConnection();

    console.log("MySQL Connected");

    conn.release();
  } catch (err) {
    console.error(err);
  }
})();

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.send("BD Mine Hub API Running");
});

app.get("/api/test-db", async (req, res) => {
  const [rows] = await pool.query("SHOW DATABASES");

  res.json(rows);
});

app.get("/api/tables", async (req, res) => {
  const [rows] = await pool.query("SHOW TABLES");

  res.json(rows);
});

app.get("/api/top-voters", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        PlayerName,
        AllTimeTotal,
        MonthTotal,
        WeeklyTotal,
        Points
      FROM Users
      WHERE PlayerName IS NOT NULL
      AND PlayerName != ''
      ORDER BY AllTimeTotal DESC
      LIMIT 10
    `).all();

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
/*
|--------------------------------------------------------------------------
| Pterodactyl API
|--------------------------------------------------------------------------
*/

app.get("/api/server/resources", async (req, res) => {
  try {
    const response = await ptero.get(
      `/servers/${process.env.PTERODACTYL_SERVER_ID}/resources`,
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const response = await ptero.get(
      `/servers/${process.env.PTERODACTYL_SERVER_ID}/files/list`,
      {
        params: {
          directory: "/plugins/VotingPlugin",
        },
      },
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/usersdb", async (req, res) => {
  try {
    const response = await ptero.get(
      `/servers/${process.env.PTERODACTYL_SERVER_ID}/files/download`,
      {
        params: {
          file: "/plugins/VotingPlugin/Users.db",
        },
      },
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/players", playerRoutes);

app.use("/api/server", serverRoutes);

app.use("/api/votes", voteRoutes);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client Disconnected:", socket.id);
  });
});

app.get("/api/sqlite-tables", (req, res) => {
  try {
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
    `).all();

    res.json(tables);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/users-columns", (req, res) => {
  try {
    const columns = db.prepare(`
      PRAGMA table_info(Users)
    `).all();

    res.json(columns);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/player-search", (req, res) => {
  try {
    const q = req.query.q || "";

    const rows = db.prepare(`
      SELECT
        PlayerName,
        AllTimeTotal,
        MonthTotal
      FROM Users
      WHERE PlayerName LIKE ?
      ORDER BY AllTimeTotal DESC
      LIMIT 10
    `).all(`%${q}%`);

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/player/:username", (req, res) => {
  try {
    const player = db.prepare(`
      SELECT
        uuid,
        PlayerName,
        LastOnline,
        MonthTotal,
        AllTimeTotal,
        DailyTotal,
        WeeklyTotal,
        Points,
        DayVoteStreak,
        BestDayVoteStreak,
        WeekVoteStreak,
        BestWeekVoteStreak,
        MonthVoteStreak,
        BestMonthVoteStreak,
        HighestDailyTotal,
        HighestWeeklyTotal,
        HighestMonthlyTotal
      FROM Users
      WHERE PlayerName = ?
    `).get(req.params.username);

    res.json(player || {});
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

//dashboard route

app.get("/api/dashboard", (req, res) => {
  try {
    const totalPlayers = db.prepare(`
      SELECT COUNT(*) AS total
      FROM Users
    `).get();

    const totalVotes = db.prepare(`
      SELECT SUM(AllTimeTotal) AS total
      FROM Users
    `).get();

    const monthlyVotes = db.prepare(`
      SELECT SUM(MonthTotal) AS total
      FROM Users
    `).get();

    res.json({
      players: totalPlayers.total,
      votes: totalVotes.total,
      monthlyVotes: monthlyVotes.total,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

//monthly leaderboard route

app.get("/api/leaderboard/monthly", (req, res) => {
  const rows = db.prepare(`
    SELECT
      PlayerName,
      MonthTotal
    FROM Users
    ORDER BY MonthTotal DESC
    LIMIT 100
  `).all();

  res.json(rows);
});

/*
|--------------------------------------------------------------------------
| Minecraft Status Broadcast
|--------------------------------------------------------------------------
*/

setInterval(async () => {
  try {
    const result = await status("mc.trivora.top", 25647);

    io.emit("serverStatus", {
      online: result.players.online,
      max: result.players.max,
      version: result.version.name,
      motd: result.motd.clean,
    });
  } catch (error) {
    console.log("Status Error:", error.message);
  }
}, 10000);
syncUsersDb();

setInterval(() => {
  syncUsersDb();
}, 60000);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
