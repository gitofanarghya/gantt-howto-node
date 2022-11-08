const mssql = require('mssql')
const pools = new Map();
const dbConfig = require("./dbConfig");

const get = async (name) => {
  if (!pools.has(name)) {
    let pool;
    pool = new mssql.ConnectionPool(dbConfig);
    const close = pool.close.bind(pool);
    pool.close = (...args) => {
      pools.delete(name);
      return close(...args);
    }
    pools.set(name, pool.connect());
  }
  return pools.get(name);
}

module.exports = get