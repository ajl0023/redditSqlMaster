const mysql = require("mysql");
const con = mysql.createConnection({
  host: "",
  user: "testuser",
  password: "test",
  database: "mydb",
  multipleStatements: true,
});
console.log(con);
con.connect(function (err) {
  if (err) throw err;
});

module.exports = con;
