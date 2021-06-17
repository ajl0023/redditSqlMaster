const mysql = require("mysql");
module.exports = {
  connect: () => {
    const con = mysql.createPool({
      host: "database-1.c0yjxjsy2dww.us-west-1.rds.amazonaws.com",
      port: 3306,

      password: "100962austin",
      database: "readditdb",
      multipleStatements: true,
    });

    return con;
  },
};
