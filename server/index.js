const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const path = require("path");
const dbConnection = require("./dbFunctions");
const jwt = require("jsonwebtoken");
app.use(cookieParser());
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
app.use(express.static(path.join(__dirname, "./client")));
app.use(express.json());
const checkauth = (req, res, next) => {
  if (req.headers.authorization) {
    const refreshToken = req.cookies.refresh;
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err, payload) => {
      if (err) {
        req.user = {
          _id: "a90ba451-cbf7-11eb-be87-7085c27ba6fd",
        };
      } else {
        req.user = payload;
      }
    });
  }

  next();
};
app.use(express.static(path.join(__dirname, "../client/build")));

app.listen(process.env.PORT || 5000, () => {
  app.use(checkauth);

  // require("./routes")(app, dbConnection.connect);
});
app.get("/api/posts", (req, res) => {
  res.json(50444);
});
module.exports = app;
