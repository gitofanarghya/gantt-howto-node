const get = require('./poolManager')

class QueryExecutor {
  async executeQuery (query) {
    const pool = await get('default')
    return pool.request().query(query)
  }
}
// Creating a Singleton QueryExecutor Instance
const queryExecutor = new QueryExecutor();
Object.freeze(queryExecutor);
module.exports = queryExecutor;
