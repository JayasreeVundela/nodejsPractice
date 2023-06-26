const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;
const initializeDBandServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
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
app.post("/register/", async (req, res) => {
  const { username, password, name, gender } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  // query to get user
  const getUserQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser !== undefined) {
    res.status(400);
    res.send(`User already exists`);
  } else if (password.length < 6) {
    res.status(400);
    res.send(`Password is too short`);
  } else {
    const insertUserQuery = `
        INSERT INTO 
        user (username,password,name,gender)
        VALUES ('${username}','${hashedPassword}','${name}','${gender}');`;
    const response = await db.run(insertUserQuery);
    res.status(200);
    res.send("User created successfully");
  }
});

// api 2 login user
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  // query to get user
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
      const payload = { username: username };
      let jwtToken = jwt.sign(payload, "SECRET_LOGIN_TOKEN");
      res.status(200);
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

// authentication middleware
const authenticateUserMiddleware = (req, res, next) => {
  let jwtToken = undefined;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "SECRET_LOGIN_TOKEN", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.username = payload.username;
        next();
      }
    });
  }
};

// api 3  get latest tweets of people whom the user follows
app.get("/user/tweets/feed", authenticateUserMiddleware, async (req, res) => {
  const username = req.username;
  const getTweetsQuery = `
        SELECT user.username as username,
            tweet.tweet as tweet,
            tweet.date_time as date_time
        FROM
            user
        INNER JOIN follower ON user.user_id = follower.follower_user_id
        INNER JOIN tweet ON follower.following_user_id = tweet.user_id
        WHERE user.username = '${username}'
        LIMIT 4;`;
  const tweets = await db.all(getTweetsQuery);
  res.status(200);
  res.send(tweets);
});

// api 4 list of names of people whom the user follows
app.get("/user/following/", authenticateUserMiddleware, async (req, res) => {
  const username = req.username;
  const getFollowingUsersQuery = `
        SELECT 
        (select name from user
        where user_id=following_user_id) as name 
        FROM user
        INNER JOIN follower ON user.user_id = follower.follower_user_id
        WHERE 
        user.username = '${username}';`;
  const followingUsersNames = await db.all(getFollowingUsersQuery);
  res.status(200);
  res.send(followingUsersNames);
});

// api 5 list of names of people who follows the user
app.get("/user/followers/", authenticateUserMiddleware, async (req, res) => {
  const username = req.username;
  const getFollowersQuery = `
        SELECT 
        (select name from user
        where user_id=follower_user_id) as name 
        FROM user
        INNER JOIN follower ON user.user_id = follower.following_user_id
        WHERE 
        user.username = '${username}';`;
  const followersNames = await db.all(getFollowersQuery);
  res.status(200);
  res.send(followersNames);
});

// api 6 tweet requested by user whom he is following
app.get("/tweets/:tweetId/", authenticateUserMiddleware, async (req, res) => {
  console.log("req.username", req.username);
  const username = req.username;
  const { tweetId } = req.params;
  const getTweetsUserFollowingQuery = `
        SELECT 
            tweet.tweet_id as tweetId
        FROM
            user
        INNER JOIN follower ON user.user_id = follower.follower_user_id
        INNER JOIN tweet ON follower.following_user_id = tweet.user_id
        WHERE user.username = '${username}';`;
  const tweetsUserFollowing = await db.all(getTweetsUserFollowingQuery);
  let tweetIds = tweetsUserFollowing.map((tweet) => tweet.tweetId);

  if (tweetIds.find((t) => t === parseInt(tweetId)) !== undefined) {
    //stats of tweet requested
    const getStatsOfRequestedTweetQuery = `
            SELECT tweet.tweet as tweet,
                count(reply.reply_id) as replies,
                count(like.like_id) as likes,
                tweet.date_time as dateTime
            FROM
                tweet
            INNER JOIN reply ON tweet.tweet_id = reply.tweet_id
            INNER JOIN like ON tweet.tweet_id = like.tweet_id
            WHERE tweet.tweet_id = ${tweetId};`;
    const response = await db.get(getStatsOfRequestedTweetQuery);
    res.status(200);
    res.send(response);
  } else {
    res.status(400);
    res.send(`Invalid request`);
  }
});

// api 7 tweet likes requested by user whom he is following
app.get(
  "/tweets/:tweetId/likes/",
  authenticateUserMiddleware,
  async (req, res) => {
    const username = req.username;
    const { tweetId } = req.params;
    const getTweetsUserFollowingQuery = `
        SELECT 
            tweet.tweet_id as tweetId
        FROM
            user
        INNER JOIN follower ON user.user_id = follower.follower_user_id
        INNER JOIN tweet ON follower.following_user_id = tweet.user_id
        WHERE user.username = '${username}';`;
    const tweetsUserFollowing = await db.all(getTweetsUserFollowingQuery);
    let tweetIds = tweetsUserFollowing.map((tweet) => tweet.tweetId);

    if (tweetIds.includes(parseInt(tweetId)) === true) {
      //likes of tweet requested
      const getLikesOfRequestedTweetQuery = `
            SELECT username
            FROM
                tweet
            INNER JOIN like ON tweet.tweet_id = like.tweet_id
            INNER JOIN user ON like.user_id = user.user_id
            WHERE tweet.tweet_id=${tweetId};`;
      const likes = await db.all(getLikesOfRequestedTweetQuery);
      const likedNames = likes.map((like) => like.username);
      res.status(200);
      res.send({ likes: likedNames });
    } else {
      res.status(400);
      res.send(`Invalid request`);
    }
  }
);

// api 8 tweet replies requested by user whom he is following
app.get(
  "/tweets/:tweetId/replies/",
  authenticateUserMiddleware,
  async (req, res) => {
    const username = req.username;
    const { tweetId } = req.params;
    const getTweetsUserFollowingQuery = `
        SELECT 
            tweet.tweet_id as tweetId
        FROM
            user
        INNER JOIN follower ON user.user_id = follower.follower_user_id
        INNER JOIN tweet ON follower.following_user_id = tweet.user_id
        WHERE user.username = '${username}';`;
    const tweetsUserFollowing = await db.all(getTweetsUserFollowingQuery);
    let tweetIds = tweetsUserFollowing.map((tweet) => tweet.tweetId);

    if (tweetIds.includes(parseInt(tweetId)) === true) {
      //replies of tweet requested
      const getRepliesOfRequestedTweetQuery = `
            SELECT 
                user.name as name, 
                reply.reply as reply
            FROM
                tweet
            INNER JOIN reply ON tweet.tweet_id = reply.tweet_id
            INNER JOIN user ON reply.user_id = user.user_id
            WHERE tweet.tweet_id=${tweetId};`;
      const replies = await db.all(getRepliesOfRequestedTweetQuery);
      res.status(200);
      res.send({ replies });
    } else {
      res.status(400);
      res.send(`Invalid request`);
    }
  }
);

// api 9 user tweets
app.get("/user/tweets", authenticateUserMiddleware, async (req, res) => {
  const username = req.username;
  const getUserTweetsQuery = `
        SELECT 
            tweet.tweet as tweet,
            count(reply.reply_id) as replies,
            count(like.like_id) as likes,
            tweet.date_time as dateTime
        FROM
            user
        INNER JOIN tweet ON user.user_id = tweet.user_id
        INNER JOIN reply ON tweet.tweet_id = reply.tweet_id
        INNER JOIN like ON tweet.tweet_id = like.user_id
        WHERE user.username = '${username}'
        GROUP BY tweet.tweet_id;`;
  const userTweets = await db.all(getUserTweetsQuery);
  res.status(200);
  res.send(userTweets);
});

// api 10 user tweet post
app.post("/user/tweets/", authenticateUserMiddleware, async (req, res) => {
  const username = req.username;
  const date = new Date();
  const getUserIdQuery = `
        SELECT user_id as userId
        FROM user
        WHERE username='${username}'`;
  const dbUserId = await db.get(getUserIdQuery);
  const userId = dbUserId.userId;
  const { tweet } = req.body;
  const postTweetQuery = `
        INSERT INTO tweet (tweet,user_id,date_time)
        VALUES ('${tweet}',${userId},'${date.now()}');`;
  const response = await db.run(postTweetQuery);
  res.status(200);
  res.send(`Created a Tweet`);
});

// api 11 tweet replies requested by user whom he is following
app.delete(
  "/tweets/:tweetId/",
  authenticateUserMiddleware,
  async (req, res) => {
    const username = req.username;
    const { tweetId } = req.params;

    const getUserTweetsQuery = `
        SELECT 
            tweet.tweet_id as tweetId
        FROM
            user
        INNER JOIN tweet ON user.user_id = tweet.user_id
        INNER JOIN reply ON tweet.tweet_id = reply.tweet_id
        INNER JOIN like ON tweet.tweet_id = like.user_id
        WHERE user.username = '${username}'
        GROUP BY tweet.tweet_id;`;
    const dbUserTweets = await db.all(getUserTweetsQuery);
    const userTweets = dbUserTweets.map((tweet) => tweet.tweetId);
    if (userTweets.includes(parseInt(tweetId)) === true) {
      const deleteTweetQuery = `
        DELETE FROM tweet
        WHERE tweet_id = ${tweetId};`;
      const response = await db.run(deleteTweetQuery);
      res.status(200);
      res.send(`Tweet Removed`);
    } else {
      res.status(400);
      res.send(`Invalid request`);
    }
  }
);

module.exports = app;
