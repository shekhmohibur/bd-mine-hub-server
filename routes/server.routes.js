const express = require("express");

const router = express.Router();

router.get("/status", async (req, res) => {
res.json({
online: 127,
max: 500,
version: "1.21.8",
motd: "BD Mine Hub",
});
});

module.exports = router;
