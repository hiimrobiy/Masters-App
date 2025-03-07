require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool using the connection string from the environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
