const db = require('./config/db');

db.query('SELECT * FROM listings WHERE id = 31', (err, rows) => {
  if (err) throw err;
  console.log('Listing 31:', rows);
  process.exit(0);
});
