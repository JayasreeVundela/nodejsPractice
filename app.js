const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
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

// api 1 login user
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "SECRET_LOGIN_TOKEN");
      console.log(jwtToken);
      res.send({ jwtToken });
      res.status(200);
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

// authenticate middleware
const authenticateUser = (req, res, next) => {
  let jwtToken = undefined;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRET_LOGIN_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log(payload);
        next();
      }
    });
  }
};

// api 2 get all states
app.get("/states/", authenticateUser, async (req, res) => {
  const getStatesQuery = `
    SELECT * FROM state`;

  const statesArray = await db.all(getStatesQuery);
  const states = statesArray.map((eachState) => ({
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  }));
  res.send(states);
});

// api 3 get respective state
app.get("/states/:stateId", authenticateUser, async (req, res) => {
  const { stateId } = req.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id=${stateId}`;

  const s = await db.get(getStateQuery);
  const state = {
    stateId: s.state_id,
    stateName: s.state_name,
    population: s.population,
  };
  res.send(state);
});

// api 4 post respective district
app.post("/districts/", authenticateUser, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const insertDistrictQuery = `
    INSERT INTO district
    (district_name,state_id,cases,cured,active,deaths) 
    VALUES
    ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const response = await db.run(insertDistrictQuery);
  res.send(`District Successfully Added`);
});

// api 5 get respective district
app.get("/districts/:districtId/", authenticateUser, async (req, res) => {
  const { districtId } = req.params;
  const getDistrictQuery = `
    SELECT * 
    FROM district 
    WHERE district_id=${districtId};`;

  const d = await db.get(getDistrictQuery);
  const district = {
    districtId: d.district_id,
    districtName: d.district_name,
    stateId: d.state_id,
    cases: d.cases,
    cured: d.cured,
    active: d.active,
    deaths: d.deaths,
  };
  res.send(district);
});

// api 6 delete respective district
app.delete("/districts/:districtId", authenticateUser, async (req, res) => {
  const { districtId } = req.params;
  const deleteDistrictQuery = `
    DELETE FROM district 
    WHERE district_id=${districtId}`;

  const response = await db.run(deleteDistrictQuery);
  res.send(`District Removed`);
});

// api 7 modify respective district
app.put("/districts/:districtId", authenticateUser, async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const updateDistrictQuery = `
    UPDATE 
    district 
    SET 
    district_name='${districtName}',
    state_id = ${stateId},
    cases=${cases},
    cured = ${cured},
    active=${active},
    deaths=${deaths}
    WHERE 
    district_id=${districtId};`;
  const response = await db.run(updateDistrictQuery);
  res.send(`District Details Updated`);
});

// api 8 get respective state stats
app.get("/states/:stateId/stats", authenticateUser, async (req, res) => {
  const { stateId } = req.params;
  const getStateStatsQuery = `
    SELECT 
        SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
    FROM state
    INNER JOIN district 
    ON state.state_id = district.state_id
    WHERE state.state_id=${stateId}`;
  const stateStats = await db.get(getStateStatsQuery);
  res.send(stateStats);
});

module.exports = app;
