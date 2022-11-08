const dbConfig = {
  user: 'adpsqladmin',
  password: 'Crazy2000000',
  server: 'adp-sql.database.windows.net',
  database: 'adp-sql',
  connectionTimeout: 300000,
  requestTimeout: 300000,
  pool: {
    max: 1000,
    min: 10,
    idleTimeoutMillis: 300000,
  },
};
module.exports = dbConfig;
