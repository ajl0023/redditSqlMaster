module.exports = {
  connect: () => {
    const mysql = require("mysql");
    const con = mysql.createPool({
      host: "127.0.0.1",
      port: 3306,
      user: "newuser",
      password: "1234",
      database: "mydb",
      multipleStatements: true,
    });

    return con;
  },
};
