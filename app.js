const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db = null;
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
const app = express();
app.use(express.json());

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started listening on port 3000...");
    });
  } catch (error) {
    console.log(`Database error:${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

// api 1 get all players
app.get("/players/", async (req, res) => {
  const getPlayersQuery = `
    SELECT * FROM player_details`;

  const playersArray = await db.all(getPlayersQuery);
  const players = playersArray.map((eachPlayer) => ({
    playerId: eachPlayer.player_id,
    playerName: eachPlayer.player_name,
  }));
  res.send(players);
});

// api 2 get respective player
app.get("/players/:playerId", async (req, res) => {
  const { playerId } = req.params;
  const getPlayerQuery = `
    SELECT * FROM player_details WHERE player_id=${playerId}`;

  const p = await db.get(getPlayerQuery);
  const player = {
    playerId: p.player_id,
    playerName: p.player_name,
  };
  res.send(player);
});

// api 3 put respective player
app.put("/players/:playerId", async (req, res) => {
  const { playerId } = req.params;
  const { playerName } = req.body;
  // console.log(playerId, playerName);
  const updatePlayerQuery = `
    UPDATE 
    player_details 
    SET 
    player_name='${playerName}'
    WHERE 
    player_id=${playerId};`;
  const response = await db.run(updatePlayerQuery);
  res.send(`Player Details Updated`);
});

// api 4 get respective match
app.get("/matches/:matchId", async (req, res) => {
  const { matchId } = req.params;
  const getMatchQuery = `
    SELECT * FROM match_details WHERE match_id=${matchId}`;

  const m = await db.get(getMatchQuery);
  const match = {
    matchId: m.match_id,
    match: m.match,
    year: m.year,
  };
  res.send(match);
});

// api 5 get respective player matches
app.get("/players/:playerId/matches", async (req, res) => {
  const { playerId } = req.params;
  const getPlayerMatchesQuery = `
   select * 
    from
    match_details
    inner join 
    player_match_score 
    on match_details.match_id=player_match_score.match_id 
    inner join 
    player_details
    on player_match_score.player_id = player_details.player_id
    where player_details.player_id = ${playerId}`;

  const ms = await db.all(getPlayerMatchesQuery);
  const matches = ms.map((eachMatch) => ({
    matchId: eachMatch.match_id,
    match: eachMatch.match,
    year: eachMatch.year,
  }));
  res.send(matches);
});

// api 6 get respective match players
app.get("/matches/:matchId/players", async (req, res) => {
  const { matchId } = req.params;
  const getMatchPlayersQuery = `
   select * 
    from
    player_details
    inner join 
    player_match_score 
    on player_details.player_id=player_match_score.player_id 
    inner join 
    match_details
    on player_match_score.match_id = match_details.match_id
    where match_details.match_id = ${matchId}`;

  const ps = await db.all(getMatchPlayersQuery);
  const players = ps.map((eachPlayer) => ({
    playerId: eachPlayer.player_id,
    playerName: eachPlayer.player_name,
  }));
  res.send(players);
});

// api 7 get respective player scores
app.get("/players/:playerId/playerScores/", async (req, res) => {
  const { playerId } = req.params;
  const getPlayerScoresQuery = `
    SELECT 
        p_d.player_id AS playerId,
        p_d.player_name AS playerName,
        sum(p_m_s.score) AS totalScore,
        sum(p_m_s.fours) AS totalFours,
        sum(p_m_s.sixes) AS totalSixes
    FROM
        player_details AS p_d
    INNER JOIN player_match_score AS p_m_s
    ON p_d.player_id = p_m_s.player_id
    WHERE 
    p_d.player_id = ${playerId};`;
  const response = await db.get(getPlayerScoresQuery);
  res.send(response);
});

module.exports = app;
