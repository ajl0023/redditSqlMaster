const mysql = require("mysql");
const con = mysql.createPool({
  host: "192.168.0.249",
  user: "testuser",
  password: "test",
  database: "mydb",
  multipleStatements: true,
});
console.log(con);

module.exports = con;
