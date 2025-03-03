const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'seddb.cwqqlkcrophs.ap-south-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Sedl12345',
  database: 'role_based_auth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Handle database connection errors
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;
