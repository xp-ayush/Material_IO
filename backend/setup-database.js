const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'seddb.cwqqlkcrophs.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'Sedl12345',
    database: 'role_based_auth',
    multipleStatements: true
  });

  try {
    console.log('Connected to database');

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'sql', 'create_invoices_table.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    await connection.query(sqlContent);
    console.log('Invoices table created successfully');

    // Verify table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "invoices"');
    if (tables.length > 0) {
      console.log('Verified: Invoices table exists');
      
      // Check table structure
      const [columns] = await connection.query('DESCRIBE invoices');
      console.log('Table structure:', columns);
    } else {
      console.log('Error: Invoices table was not created');
    }

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

setupDatabase();
