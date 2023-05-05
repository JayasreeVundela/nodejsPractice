const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "cricketTeam.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`server started running in the port http://localhost:3000`);
    });
  } catch (e) {
    console.log(`Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.get("/players/", async (request, response) => {
  const query = `SELECT * FROM cricket_team;`;
  const dbPlayersArray = await db.all(query);
  const playersArray = dbPlayersArray.map((dbPlayer) => {
    return {
      playerId: dbPlayer.player_id,
      playerName: dbPlayer.player_name,
      jerseyNumber: dbPlayer.jersey_number,
      role: dbPlayer.role,
    };
  });
  response.send(playersArray);
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const query = `SELECT * FROM cricket_team WHERE player_id=${playerId};`;
  const dbPlayer = await db.get(query);
  const player = {
    playerId: dbPlayer.player_id,
    playerName: dbPlayer.player_name,
    jerseyNumber: dbPlayer.jersey_number,
    role: dbPlayer.role,
  };
  response.send(player);
});

app.post("/players/", async (request, response) => {
  const { playerName, jerseyNumber, role } = request.body;
  const query = `INSERT INTO cricket_team 
                    (player_name,jersey_number,role)
                    VALUES
                    ('${playerName}',${jerseyNumber},'${role}');
                    `;
  await db.run(query);
  response.send(`Player Added to Team`);
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerName, jerseyNumber, role } = request.body;
  const { playerId } = request.params;
  const query = `UPDATE 
                        cricket_Team
                    SET
                        player_name = '${playerName}',
                        jersey_number= ${jerseyNumber},
                        role = '${role}'
                    WHERE
                        player_id = ${playerId};
                    `;
  await db.run(query);
  response.send(`Player Details Updated`);
});

app.delete("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const query = `DELETE FROM cricket_team 
                  WHERE 
                     player_id = ${playerId};`;
  await db.run(query);
  response.send(`Player Removed`);
});

module.exports = app;
