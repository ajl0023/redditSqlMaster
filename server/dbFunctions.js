const mysql = require("mysql");
const con = mysql.createConnection({
  host: "localhost",
  user: "newuser",
  password: "100962Austin",
  database: "mydb",
  multipleStatements: true,
});
con.connect(function (err) {
  if (err) throw err;
});

module.exports = con;
