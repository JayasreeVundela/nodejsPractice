const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db = null;
const dbPath = path.join(__dirname, "userData.db");
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

// api 1 register user
app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  // console.log(`dbUser:${dbUser}`);

  if (dbUser !== undefined) {
    res.status(400);
    res.send(`User already exists`);
  } else if (password.length < 5) {
    res.status(400);
    res.send(`Password is too short`);
  } else {
    const insertUserQuery = `
        INSERT INTO 
        user (username,name,password,gender,location)
        VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}');`;
    const response = await db.run(insertUserQuery);
    res.status(200);
    res.send("User created successfully");
  }
});

//api 2 login user
app.post("/login", async (req, res) => {
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
      res.status(200);
      res.send("Login success!");
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

// api to delete user
// app.delete("/delete/:username", async (req, res) => {
//   const { username } = req.params;
//   const deleteQuery = `
//     DELETE FROM user
//     WHERE username='${username}';`;
//   const response = await db.run(deleteQuery);
//   res.send(`user deleted`);
// });

// api 3 register user
app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    res.status(400);
    res.send(`Invalid User`);
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched !== true) {
      res.status(400);
      res.send("Invalid current password");
    } else if (newPassword.length < 5) {
      res.status(400);
      res.send(`Password is too short`);
    } else {
      const updatePasswordQuery = `
        UPDATE user 
        SET password='${hashedPassword}'
        WHERE username='${username}';`;
      const response = await db.run(updatePasswordQuery);
      res.status(200);
      res.send("Password updated");
    }
  }
});

module.exports = app;
