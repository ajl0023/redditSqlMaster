const mysql = require("mysql");
module.exports = {
  connect: () => {
    const mysql = require("serverless-mysql")();

    return mysql;
  },
};
