const express = require("express");

const router = express.Router();

router.get("/search", async (req, res) => {
const { q = "" } = req.query;

const players = [
{
username: "Mohib",
rank: "Prime",
votes: 156,
},
{
username: "Alex",
rank: "Mythic",
votes: 201,
},
{
username: "Steve",
rank: "Legendary",
votes: 312,
},
];

const result = players.filter((player) =>
player.username
.toLowerCase()
.includes(q.toLowerCase())
);

res.json(result);
});

module.exports = router;
