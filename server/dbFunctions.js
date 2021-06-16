const mysql = require("mysql");
const con = mysql.createConnection({
  host: "192.168.0.249",
  user: "newuser",
  port: "3306",
  password: "100962Austin",
  database: "mydb",
  multipleStatements: true,
});

con.connect(function (err) {
  console.log(err);
  if (err) throw err;
});

module.exports = con;
