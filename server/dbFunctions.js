const mysql = require("mysql");
module.exports = {
  connect: () => {
    const con = mysql.createPool({
      host: process.env.HOST,
      port: 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: "readditdb",
      multipleStatements: true,
    });

    return con;
  },
};
