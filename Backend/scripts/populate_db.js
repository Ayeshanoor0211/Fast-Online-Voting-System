
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const { getPool, connectDB } = require('../config/dbConfig');

const populateDB = async () => {
  try {
    await connectDB();
    const pool = await getPool();
    const sqlScript = fs.readFileSync(path.join(__dirname, 'insert_campuses.sql'), 'utf8');
    await pool.request().query(sqlScript);
    console.log('Database populated successfully.');
  } catch (err) {
    console.error('Error populating database:', err);
  } finally {
    process.exit();
  }
};

populateDB();
