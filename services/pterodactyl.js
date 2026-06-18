const axios = require("axios");

const ptero = axios.create({
  baseURL: "https://panel.ozima.cloud/api/client",
  headers: {
    Authorization: `Bearer ${process.env.PTERODACTYL_API_KEY}`,
    Accept: "Application/vnd.pterodactyl.v1+json",
    "Content-Type": "application/json",
  },
});

module.exports = ptero;