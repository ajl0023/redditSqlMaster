module.exports = {
  connect: () => {
    const mysql = require("mysql");
    const con = mysql.createPool({
      host: "192.168.0.249",
      port: 3306,
      user: "vercel2",
      password: "1",
      database: "mydb",
      multipleStatements: true,
    });

    return con;
  },
};
