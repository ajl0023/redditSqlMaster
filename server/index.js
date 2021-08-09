const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();
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
          id: null
        };
      } else {
        req.user = payload;
      }
    });
  }

  next();
};
app.use(express.static(path.join(__dirname, "../client/build")));
app.use(checkauth);
app.listen(process.env.PORT || 6200, () => {});
require("./routes")(app, dbConnection.connect());

module.exports = app;
