const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const sqlFilePath = path.join(__dirname, '../database/meal_plans_schema.sql');
const sqlFileContent = fs.readFileSync(sqlFilePath, 'utf8');

// Split the SQL file into separate statements
const statements = sqlFileContent
  .split(';')
  .map((stmt) => stmt.trim())
  .filter((stmt) => stmt.length > 0);

let executed = 0;
let hasError = false;

console.log('Seeding meal plans dummy data...');

// Execute each statement sequentially
function executeNext(index) {
  if (index >= statements.length) {
    if (!hasError) {
      console.log('Successfully seeded meal plans dummy data!');
    }
    process.exit(hasError ? 1 : 0);
  }

  const query = statements[index];
  
  db.query(query, (err) => {
    if (err) {
      // Ignore "Table already exists" errors when seeding
      if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error(`Error executing statement ${index + 1}:`, err.message);
        hasError = true;
      }
    }
    executeNext(index + 1);
  });
}

// Clear tables first
db.query('SET FOREIGN_KEY_CHECKS = 0', () => {
  db.query('DELETE FROM meal_subscriptions', () => {
    db.query('DELETE FROM meal_plans', () => {
      db.query('DELETE FROM meal_providers', () => {
        db.query('SET FOREIGN_KEY_CHECKS = 1', () => {
          executeNext(0);
        });
      });
    });
  });
});
