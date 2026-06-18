const fs = require("fs");
const path = require("path");
const axios = require("axios");

const ptero = require("./pterodactyl");

const DB_PATH = path.join(
  __dirname,
  "../Users.db"
);

async function syncUsersDb() {
  try {
    console.log(
      "Downloading Users.db..."
    );

    const signed =
      await ptero.get(
        `/servers/${process.env.PTERODACTYL_SERVER_ID}/files/download`,
        {
          params: {
            file:
              "/plugins/VotingPlugin/Users.db",
          },
        }
      );

    const url =
      signed.data.attributes.url;

    const file =
      await axios.get(url, {
        responseType: "arraybuffer",
      });

    fs.writeFileSync(
      DB_PATH,
      file.data
    );

    console.log(
      "Users.db Synced"
    );
  } catch (err) {
    console.error(
      "Sync Failed:",
      err.message
    );
  }
}

module.exports = syncUsersDb;