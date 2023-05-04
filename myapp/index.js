const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "./goodreads.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(
        `server started running in the port http://localhost:3000...`
      );
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeDBAndServer();
app.get("/books/", async (request, response) => {
  let query = `SELECT * FROM book ORDER BY book_id`;
  let booksArray = await db.all(query);
  response.send(booksArray);
});
app.get("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;
  const query = `SELECT * FROM book WHERE book_id = ${bookId};`;
  const book = await db.get(query);
  res.send(book);
});
app.post("/books/", async (req, res) => {
  const bookDetails = req.body;
  const {
    title,
    author_id,
    rating,
    rating_count,
    review_count,
    description,
    pages,
    date_of_publication,
    edition_language,
    price,
    online_stores,
  } = bookDetails;
  const query = `INSERT INTO book (title,author_id,rating,
        rating_count,review_count,description,pages,
        date_of_publication,edition_language,
        price,online_stores) VALUES ('${title}',${author_id},${rating},
            ${rating_count},${review_count},'${description}',${pages},
            '${date_of_publication}','${edition_language}',${price},
            '${online_stores}');`;
  const dbResponse = await db.run(query);
  const lastId = dbResponse.lastID;
  res.send({ bookId: lastId });
});

app.put("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;
  const bookDetails = req.body;
  const {
    title,
    authorId,
    rating,
    ratingCount,
    reviewCount,
    description,
    pages,
    dateOfPublication,
    editionLanguage,
    price,
    onlineStores,
  } = bookDetails;
  const query = `
                UPDATE 
                    book 
                SET
                    title = '${title}',
                    author_id = ${authorId},
                    rating = ${rating},
                    rating_count = ${ratingCount},
                    review_count = ${reviewCount},
                    description = '${description}',
                    pages = ${pages},
                    date_of_publication = '${dateOfPublication}',
                    edition_language = '${editionLanguage}',
                    price = ${price},
                    online_stores = '${onlineStores}'
                WHERE
                    book_id = ${bookId};`;
  await db.run(query);
  res.send("Book Updated Successfully");
});
app.delete("/books/:bookId/", async (req, res) => {
  const { bookId } = req.params;
  const query = `DELETE * FROM book WHERE book_id = ${bookId};`;
  await db.RUN(query);
  res.send(`BOOK DELETED SUCCESSFULLY`);
});
module.exports = app;
