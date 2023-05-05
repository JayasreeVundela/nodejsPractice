const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "./moviesData.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`server started running at http://localhost:3000/`);
    });
  } catch (error) {
    console.log(`Error while getting DB:${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/movies/", async (req, res) => {
  const getMoviesQuery = `SELECT * FROM movie;`;
  const dbMovies = await db.all(getMoviesQuery);
  const movies = dbMovies.map((movie) => {
    return { movieName: movie.movie_name };
  });
  res.send(movies);
});

app.get("/movies/:movieId/", async (req, res) => {
  const { movieId } = req.params;
  const getMovieQuery = `SELECT * FROM movie WHERE movie_id = ${movieId}`;
  const dbMovie = await db.get(getMovieQuery);
  const movie = {
    movieId: dbMovie.movie_id,
    directorId: dbMovie.director_id,
    movieName: dbMovie.movie_name,
    leadActor: dbMovie.lead_actor,
  };
  res.send(movie);
});

app.post("/movies/", async (req, res) => {
  const { directorId, movieName, leadActor } = req.body;
  const postMovieQuery = `
                            INSERT INTO
                            movie 
                            (director_id,movie_name,lead_actor)
                            VALUES 
                            (${directorId},'${movieName}','${leadActor}');
                            `;
  await db.run(postMovieQuery);
  res.send(`Movie Successfully Added`);
});

app.put("/movies/:movieId/", async (req, res) => {
  const { movieId } = req.params;
  const { directorId, movieName, leadActor } = req.body;
  const putMovieQuery = `
                            UPDATE
                            movie 
                            SET
                            director_id = ${directorId},
                            movie_name = '${movieName}',
                            lead_actor = '${leadActor}'
                            WHERE
                            movie_id = ${movieId};
                            `;
  await db.run(putMovieQuery);
  res.send(`Movie Details Updated`);
});

app.delete("/movies/:movieId", async (req, res) => {
  const { movieId } = req.params;
  const deleteQuery = `DELETE FROM movie WHERE movie_id = ${movieId}`;
  await db.run(deleteQuery);
  res.send(`Movie Removed`);
});

app.get("/directors/", async (req, res) => {
  const getDirectorsQuery = `SELECT * FROM director;`;
  const dbDirectors = await db.all(getDirectorsQuery);
  const directors = dbDirectors.map((dbDirector) => {
    return {
      directorId: dbDirector.director_id,
      directorName: dbDirector.director_name,
    };
  });
  res.send(directors);
});

app.get("/directors/:directorId/movies", async (req, res) => {
  const { directorId } = req.params;
  const getDirectorMoviesQuery = `SELECT * FROM movie WHERE director_id = ${directorId}`;
  const dbDirectorMovies = await db.all(getDirectorMoviesQuery);
  const movies = dbDirectorMovies.map((movie) => {
    return { movieName: movie.movie_name };
  });
  res.send(movies);
});

module.exports = app;
