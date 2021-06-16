const mysql = require("mysql");
const con = mysql.createConnection({
  host: "%.%.%.%",
  user: "newuser",
  password: "100962Austin",
  database: "mydb",
  multipleStatements: true,
});
console.log(con);
con.connect(function (err) {
  if (err) throw err;
});

module.exports = con;
