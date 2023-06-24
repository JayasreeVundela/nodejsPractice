const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db = null;
const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    // await db.run(`DROP TABLE todo;`);
    // await db.run(`
    // CREATE TABLE todo(
    //     id INTEGER,
    //     todo VARCHAR(300),
    //     priority VARCHAR(250),
    //     status VARCHAR(250));`);
    app.listen(3000, () => {
      console.log("server started listening on port 3000...");
    });
  } catch (error) {
    console.log(`Database error:${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

//api 1 get todos based on query params
app.get("/todos/", async (req, res) => {
  console.log(req.query);
  const { status = "", priority = "", search_q = "" } = req.query;
  let queryExpression = null;
  if (status.length > 0 && priority.length > 0) {
    queryExpression = `
        priority LIKE '${priority}'
        AND
        status LIKE '${status}'`;
  } else if (priority.length > 0) {
    queryExpression = `priority LIKE '${priority}'`;
  } else if (status.length > 0) {
    queryExpression = `status LIKE '${status}'`;
  } else if (search_q.length > 0) {
    queryExpression = `todo LIKE '%${search_q}%'`;
  }

  const getTodosQuery = `
    SELECT * 
    FROM todo
    WHERE ${queryExpression};`;
  const todos = await db.all(getTodosQuery);
  console.log(todos);
  res.send(todos);
});

//api 2 get todos
app.get("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const getTodoQuery = `
    SELECT *
    FROM 
    todo 
    WHERE id=${todoId};`;

  const todo = await db.get(getTodoQuery);
  // console.log(todo);
  res.send(todo);
});

// api 3 insert todo
app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status } = req.body;
  const insertTodoQuery = `
    INSERT INTO 
    todo (id,todo,priority,status)
    VALUES 
    (${id},'${todo}','${priority}','${status}');`;

  const response = await db.run(insertTodoQuery);
  res.send(`Todo Successfully Added`);
});

// api 4 modify todo
app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { todo = "", priority = "", status = "" } = req.body;
  // console.log(`todo:${todo}, status:${status}, priority:${priority}`);
  let queryExpression = null;
  let resWord = null;
  if (status.length > 0) {
    queryExpression = `status='${status}'`;
    resWord = "Status";
  } else if (priority.length > 0) {
    queryExpression = `priority='${priority}'`;
    resWord = "Priority";
  } else if (todo.length > 0) {
    queryExpression = `todo='${todo}'`;
    resWord = "Todo";
  }
  const todoUpdateQuery = `
  UPDATE todo
  SET ${queryExpression}
  WHERE id=${todoId};`;

  const response = await db.run(todoUpdateQuery);
  console.log(response);
  res.send(`${resWord} Updated`);
});

// api 5 delete respective todo
app.delete("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id=${todoId};`;
  const response = db.run(deleteTodoQuery);
  res.send(`Todo Deleted`);
});

module.exports = app;
