const mysql = require("mysql");
module.exports = {
  connect: async () => {
    const mysql = require("serverless-mysql")({
      config: {
        host: "192.168.0.249",
        database: "mydb",
        user: "vercel2",
        port: 3306,
        password: "1",
      },
      onConnect: (t) => {
        console.log(t);
      },
      onError: (err) => {
        console.log(err);
      },
    });
    await mysql.connect();

    return mysql;
  },
};
