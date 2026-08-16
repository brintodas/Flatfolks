const mysql = require('mysql2')
require('dotenv').config()

// Use a pool instead of a single connection so that:
//  1. Idle connections are transparently recycled (avoids PROTOCOL_CONNECTION_LOST
//     errors after MySQL's wait_timeout kicks in).
//  2. Concurrent requests each get their own connection slot.
const db = mysql.createPool({
  host              : process.env.DB_HOST     || 'localhost',
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASSWORD || '',
  database          : process.env.DB_NAME     || 'flatfolks',
  waitForConnections: true,
  connectionLimit   : 10,
  queueLimit        : 0,
})

// Verify connectivity at startup.
db.getConnection((err, conn) => {
  if (err) {
    console.log('DB connection failed:', err.message)
    return
  }
  console.log('Connected to MySQL database (pool)')
  conn.release()
})

module.exports = db
