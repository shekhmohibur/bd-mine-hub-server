const express = require("express");

const router = express.Router();

router.get("/top-voters", async (req, res) => {
res.json([
{
username: "Mohib",
votes: 156,
},
{
username: "Alex",
votes: 142,
},
{
username: "Steve",
votes: 121,
},
]);
});

module.exports = router;
