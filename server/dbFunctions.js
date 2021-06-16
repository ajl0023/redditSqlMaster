const mysql = require("mysql");
const con = mysql.createConnection({
  host: "192.168.0.249",
  user: "testuser",
  password: "test",
  database: "mydb",
  multipleStatements: true,
});
console.log(con);
con.connect(function (err) {
  console.log(err);
  if (err) throw err;
});

module.exports = con;
