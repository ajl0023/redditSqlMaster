const mysql = require("mysql");
const con = mysql.createConnection({
  host: "reddit-sql-master.vercel.app",
  user: "newuser",
  port: 3306,
  password: "1",
  database: "mydb",
  connectTimeout: 30000,
  multipleStatements: true,
});

con.connect(function (err) {
  console.log("🚀 ~ file: dbFunctions.js ~ line 12 ~ err", err);
  console.log(err);
  if (err) throw err;
});

module.exports = con;
