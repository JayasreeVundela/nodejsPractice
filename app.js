const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { format } = require("date-fns");

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

    app.listen(3000, () => {
      console.log("server started listening on port 3000...");
    });
  } catch (error) {
    console.log(`Database error:${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();
const getTitleCaseWord = (word) =>
  word
    .split("_")
    .map((eachWord) => eachWord.slice(0, 1).toUpperCase() + eachWord.slice(1))
    .join(" ");

const checkQueryValuesMiddleware = async (req, res, next) => {
  //console.log("middleware");
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  let {
    priority = "",
    category = "",
    status = "",
    search_q = "",
    date = "",
  } = req.query;
  let isInvalidValue = false;
  console.log(req.query);
  Object.entries(req.query).forEach((each) => {
    switch (each[0]) {
      case "status":
        if (statusValues.includes(status) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Status`);
        }
        break;
      case "priority":
        if (priorityValues.includes(priority) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Priority`);
        }
        break;
      case "category":
        if (categoryValues.includes(category) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Category`);
        }
        break;
      case "date":
        if (date.length !== 10) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Due Date`);
        }
        break;
      default:
        null;
    }
  });
  if (isInvalidValue !== true) {
    next();
  }
};

const checkReqBodyValuesMiddleware = async (req, res, next) => {
  const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  const priorityValues = ["HIGH", "MEDIUM", "LOW"];
  const categoryValues = ["WORK", "HOME", "LEARNING"];
  let isInvalidValue = false;
  let { priority = "", category = "", status = "", dueDate = "" } = req.body;

  Object.entries(req.body).forEach((each) => {
    switch (each[0]) {
      case "status":
        if (statusValues.includes(status) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Status`);
        }
        break;
      case "priority":
        if (priorityValues.includes(priority) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Priority`);
        }
        break;
      case "category":
        if (categoryValues.includes(category) === false) {
          isInvalidValue = true;
          res.status(400);
          res.send(`Invalid Todo Category`);
        }
        break;
      //   case "dueDate":
      //     if (dueDate.length !== 10) {
      //       isInvalidValue = true;
      //       res.status(400);
      //       res.send(`Invalid Todo Due Date`);
      //     }
      //     break;
      default:
        null;
    }
  });
  if (isInvalidValue !== true) {
    next();
  }
};

//api 1 get todos based on query params
app.get("/todos/", checkQueryValuesMiddleware, async (req, res) => {
  // console.log(req.query, "next function req.query");
  const queryParams = req.query;
  let queryExpression = "";
  Object.entries(queryParams).forEach((eachParam) => {
    const key = eachParam[0] === "search_q" ? "todo" : eachParam[0];
    const value =
      eachParam[0] === "search_q" ? `%${eachParam[1]}%` : `${eachParam[1]}`;
    queryExpression = `${queryExpression} AND ${key} LIKE '${value}'`;
  });
  queryExpression = queryExpression.slice(5);
  // console.log(queryExpression);

  const getTodosQuery = `
      SELECT *
      FROM todo
      WHERE ${queryExpression};`;
  const t = await db.all(getTodosQuery);
  const todos = t.map((eachTodo) => ({
    id: eachTodo.id,
    todo: eachTodo.todo,
    status: eachTodo.status,
    priority: eachTodo.priority,
    category: eachTodo.category,
    dueDate: eachTodo.due_date,
  }));
  res.send(todos);
});

//api 2 get todos
app.get("/todos/:todoId", checkQueryValuesMiddleware, async (req, res) => {
  const { todoId } = req.params;
  const getTodoQuery = `
    SELECT *
    FROM 
    todo 
    WHERE id=${todoId};`;

  const t = await db.get(getTodoQuery);
  const todo = {
    id: t.id,
    todo: t.todo,
    status: t.status,
    priority: t.priority,
    category: t.category,
    dueDate: t.due_date,
  };
  // console.log(todo);
  res.send(todo);
});

// api 3 agenda search with due date
app.get("/agenda", checkQueryValuesMiddleware, async (req, res) => {
  const { date } = req.query;

  // query to get todos of respective date
  const getTodosQuery = `
        SELECT * FROM todo
        WHERE due_date = '${date}';`;
  const t = await db.all(getTodosQuery);

  // converting todo keys to camelCased keys
  const todos = t.map((eachTodo) => ({
    id: eachTodo.id,
    todo: eachTodo.todo,
    status: eachTodo.status,
    priority: eachTodo.priority,
    category: eachTodo.category,
    dueDate: eachTodo.due_date,
  }));
  res.send(todos);
});

// api 4 insert todo
app.post("/todos/", checkReqBodyValuesMiddleware, async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const insertTodoQuery = `
    INSERT INTO 
    todo (id,todo,priority,status,category,due_date)
    VALUES 
    (${id},'${todo}','${priority}','${status}','${category}','${format(
    new Date(dueDate),
    "yyyy-MM-dd"
  )}');`;

  const response = await db.run(insertTodoQuery);
  res.send(`Todo Successfully Added`);
});

// api 5 modify todo
app.put("/todos/:todoId/", checkReqBodyValuesMiddleware, async (req, res) => {
  const { todoId } = req.params;
  const updateKeys = req.body;
  // console.log(req.params, req.body, "put api");

  // setting conditions for update query
  let queryExpression = "";
  let responseKey = "";
  Object.entries(updateKeys).forEach((each) => {
    let key = each[0] === "dueDate" ? "due_date" : each[0];
    queryExpression = `${queryExpression},${key} = '${each[1]}'`;
    responseKey = `${responseKey},${key}`;
  });
  queryExpression = queryExpression.slice(1);

  // setting key word of todo to show in response
  let words = responseKey.slice(1).split(",");
  responseKey = words.map((word) => getTitleCaseWord(word)).join(" ");

  // update query
  const todoUpdateQuery = `
    UPDATE todo
    SET ${queryExpression}
    WHERE id=${todoId};`;

  const response = await db.run(todoUpdateQuery);
  res.send(`${responseKey} Updated`);
});

// api 6 delete respective todo
app.delete("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  // query for deleting todo
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id=${todoId};`;
  const response = db.run(deleteTodoQuery);
  res.send(`Todo Deleted`);
});

module.exports = app;
