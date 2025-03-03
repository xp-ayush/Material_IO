const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'seddb.cwqqlkcrophs.ap-south-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Sedl12345', // Add your MySQL password here
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

  // Verify entries table exists
  db.query('SHOW TABLES LIKE "entries"', (err, results) => {
    if (err) {
      console.error('Error checking entries table:', err);
      return;
    }
    if (results.length === 0) {
      console.error('Warning: entries table does not exist!');
      console.log('Please create the entries table using the SQL commands provided.');
    } else {
      console.log('Entries table exists');
    }
  });

  // Add recordedBy column if it doesn't exist
  const checkColumnQuery = `
    SELECT COUNT(*) as count 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'role_based_auth' 
    AND TABLE_NAME = 'entries' 
    AND COLUMN_NAME = 'recordedBy'`;

  db.query(checkColumnQuery, (err, result) => {
    if (err) {
      console.error('Error checking column:', err);
      return;
    }

    if (result[0].count === 0) {
      const alterTableQuery = `ALTER TABLE entries ADD COLUMN recordedBy VARCHAR(100) NOT NULL DEFAULT 'System' AFTER remarks;`;
      db.query(alterTableQuery, (err, result) => {
        if (err) {
          console.error('Error adding recordedBy column:', err);
          return;
        }
        console.log('Added recordedBy column successfully');
      });
    }
  });
});

// Handle database errors
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Reconnecting...');
    db.connect();
  } else {
    throw err;
  }
});

// JWT secret key
const JWT_SECRET = 'your-secret-key'; // Change this to a secure secret key

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Query for user
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ message: 'Server error during login' });
      }

      if (results.length === 0) {
        console.log('No user found with email:', email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = results[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });

      try {
        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', validPassword);

        if (!validPassword) {
          console.log('Invalid password for user:', email);
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            name: user.name 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Send response
        console.log('Login successful for user:', email);
        res.json({ 
          token, 
          role: user.role,
          name: user.name,
          message: 'Login successful' 
        });
      } catch (bcryptError) {
        console.error('Bcrypt error:', bcryptError);
        return res.status(500).json({ message: 'Error verifying password' });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user data endpoint
app.get('/api/user-data', verifyToken, (req, res) => {
  const query = 'SELECT id, name, email, role FROM users WHERE id = ?';
  db.query(query, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(results[0]);
  });
});

// Get all users (admin only)
app.get('/api/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const query = 'SELECT id, name, email, role FROM users';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(results);
  });
});

// Create new user (admin only)
app.post('/api/users', verifyToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }

  const { name, email, password, role, units } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    // Check if email already exists
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
      db.query(insertQuery, [name, email, hashedPassword, role || 'user'], async (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ message: 'Failed to create user' });
        }

        const userId = result.insertId;

        // If units are provided and role is user, assign units
        if (role !== 'admin' && units && units.length > 0) {
          const unitValues = units.map(unit => [unit.unit_number, unit.unit_name, userId]);
          const insertUnitsQuery = 'INSERT INTO units (unit_number, unit_name, userId) VALUES ?';
          
          db.query(insertUnitsQuery, [unitValues], (err) => {
            if (err) {
              console.error('Error assigning units:', err);
              return res.status(500).json({ message: 'User created but failed to assign units' });
            }
            
            res.status(201).json({ 
              message: 'User created successfully with units assigned',
              userId: userId
            });
          });
        } else {
          res.status(201).json({ 
            message: 'User created successfully',
            userId: userId
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in user creation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', verifyToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }

  const userId = req.params.id;
  const { name, email, password, role, units } = req.body;

  try {
    // Start transaction
    await db.promise().query('START TRANSACTION');

    let updateQuery = 'UPDATE users SET name = ?, email = ?, role = ?';
    let queryParams = [name, email, role];

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(userId);

    // Update user
    await db.promise().query(updateQuery, queryParams);

    // Handle units if user role is 'user'
    if (role === 'user') {
      // Delete existing units for this user
      await db.promise().query('DELETE FROM units WHERE userId = ?', [userId]);
      
      // Insert new units
      if (units && units.length > 0) {
        const insertUnitsQuery = 'INSERT INTO units (unit_number, unit_name, userId) VALUES ?';
        const unitValues = units.map(unit => [unit.unit_number, unit.unit_name, userId]);
        await db.promise().query(insertUnitsQuery, [unitValues]);
      }
    }

    // Commit transaction
    await db.promise().query('COMMIT');

    // Return updated user data with units
    const [updatedUser] = await db.promise().query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    );

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user role is 'user', fetch their units
    if (updatedUser[0].role === 'user') {
      const [units] = await db.promise().query(
        'SELECT unit_number, unit_name FROM units WHERE userId = ?',
        [userId]
      );
      updatedUser[0].units = units;
    }

    res.json(updatedUser[0]);
  } catch (error) {
    // Rollback transaction on error
    await db.promise().query('ROLLBACK');
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', verifyToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }

  const userId = req.params.id;

  try {
    // Check if user exists
    const [user] = await db.promise().query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user[0].role === 'admin') {
      const [adminCount] = await db.promise().query(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
      );
      
      if (adminCount[0].count <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }
    }

    // Delete user
    await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// Vehicle Entry endpoint
app.post('/api/vehicle-entry', verifyToken, async (req, res) => {
  const {
    serialNumber,
    date,
    driverMobile,
    driverName,
    vehicleNumber,
    vehicleType,
    source,
    loadingUnload,
    timeIn,
    timeOut,
    checkBy,
    remarks
  } = req.body;

  try {
    const query = `
      INSERT INTO vehicle_entries 
      (serialNumber, date, driverMobile, driverName, vehicleNumber, 
       vehicleType, source, loadingUnload, timeIn, timeOut, checkBy, 
       remarks, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.promise().execute(query, [
      serialNumber,
      date,
      driverMobile,
      driverName,
      vehicleNumber,
      vehicleType,
      source,
      loadingUnload,
      timeIn,
      timeOut,
      checkBy,
      remarks,
      req.user.id
    ]);

    res.json({ message: 'Vehicle entry recorded successfully' });
  } catch (error) {
    console.error('Error recording vehicle entry:', error);
    res.status(500).json({ message: 'Error recording vehicle entry' });
  }
});

// Get all vehicle entries (for admin)
app.get('/api/vehicle-entries', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [entries] = await db.promise().query(`
      SELECT ve.*, u.name as recorded_by 
      FROM vehicle_entries ve 
      LEFT JOIN users u ON ve.user_id = u.id 
      ORDER BY ve.created_at DESC
    `);

    res.json(entries);
  } catch (error) {
    console.error('Error fetching vehicle entries:', error);
    res.status(500).json({ message: 'Error fetching vehicle entries' });
  }
});

// Submit new entry
app.post('/api/entries', verifyToken, async (req, res) => {
  const {
    serialNumber,
    date,
    driverMobile,
    driverName,
    vehicleNumber,
    vehicleType,
    source,
    loadingUnload,
    timeIn,
    timeOut,
    checkBy,
    remarks,
    materials // Array of {name, quantity}
  } = req.body;

  const userId = req.user.id;

  // Start transaction
  db.beginTransaction(async (err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    try {
      // First insert the entry
      const entryQuery = `
        INSERT INTO entries (
          userId, serialNumber, date, driverMobile, driverName,
          vehicleNumber, vehicleType, source, loadingUnload,
          timeIn, timeOut, checkBy, remarks, recordedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        entryQuery,
        [
          userId, serialNumber, date, driverMobile, driverName,
          vehicleNumber, vehicleType, source, loadingUnload,
          timeIn, timeOut, checkBy, remarks, req.user.name
        ],
        (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error inserting entry:', err);
              res.status(500).json({ message: 'Error creating entry' });
            });
          }

          const entryId = result.insertId;

          // If there are materials, insert them
          if (materials && materials.length > 0) {
            const materialValues = materials.map(m => [entryId, m.name, m.quantity]);
            const materialQuery = 'INSERT INTO materials (entry_id, material_name, quantity) VALUES ?';

            db.query(materialQuery, [materialValues], (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error inserting materials:', err);
                  res.status(500).json({ message: 'Error creating entry materials' });
                });
              }

              // Commit transaction
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ message: 'Error creating entry' });
                  });
                }
                res.json({ message: 'Entry created successfully', id: entryId });
              });
            });
          } else {
            // If no materials, just commit the entry
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ message: 'Error creating entry' });
                });
              }
              res.json({ message: 'Entry created successfully', id: entryId });
            });
          }
        }
      );
    } catch (error) {
      db.rollback(() => {
        console.error('Error in transaction:', error);
        res.status(500).json({ message: 'Server error' });
      });
    }
  });
});

// Get user's entries
app.get('/api/user-entries', verifyToken, (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.serialNumber,
      e.date,
      e.driverMobile,
      e.driverName,
      e.vehicleNumber,
      e.vehicleType,
      e.source,
      e.loadingUnload,
      TIME_FORMAT(e.timeIn, '%H:%i') as timeIn,
      TIME_FORMAT(e.timeOut, '%H:%i') as timeOut,
      e.checkBy,
      e.remarks,
      e.recordedBy,
      u.name as userName
    FROM entries e
    LEFT JOIN users u ON e.userId = u.id
    WHERE e.userId = ?
    ORDER BY e.date DESC, e.timeIn DESC
  `;

  db.query(query, [req.user.id], (err, results) => {
    if (err) {
      console.error('Error fetching user entries:', err);
      return res.status(500).json({ message: 'Failed to fetch entries', error: err.message });
    }
    res.json(results);
  });
});

// Get all entries (admin only)
app.get('/api/entries', verifyToken, (req, res) => {
  const query = `
    SELECT 
      e.*,
      u.name as userName,
      GROUP_CONCAT(
        JSON_OBJECT(
          'id', m.id,
          'name', m.material_name,
          'quantity', m.quantity
        )
      ) as materials
    FROM entries e
    LEFT JOIN users u ON e.userId = u.id
    LEFT JOIN materials m ON e.id = m.entry_id
    GROUP BY e.id
    ORDER BY e.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching entries:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // Parse the materials JSON string for each entry
    const entries = results.map(entry => ({
      ...entry,
      materials: entry.materials ? JSON.parse(`[${entry.materials}]`) : []
    }));

    res.json(entries);
  });
});

// Get all entries (no pagination) for export
app.get('/api/all-entries', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const query = `
      SELECT 
        e.id,
        e.serialNumber,
        DATE_FORMAT(e.date, '%Y-%m-%d') as date,
        e.driverMobile,
        e.driverName,
        e.vehicleNumber,
        e.vehicleType,
        e.source,
        e.loadingUnload,
        TIME_FORMAT(e.timeIn, '%H:%i') as timeIn,
        TIME_FORMAT(e.timeOut, '%H:%i') as timeOut,
        e.checkBy,
        e.remarks,
        e.recordedBy,
        u.name as user_name,
        GROUP_CONCAT(DISTINCT CONCAT('Unit ', un.unit_number) SEPARATOR ', ') as user_units
      FROM entries e
      LEFT JOIN users u ON e.userId = u.id
      LEFT JOIN units un ON e.userId = un.userId
      GROUP BY e.id
      ORDER BY e.createdAt DESC
    `;

    const [entries] = await db.promise().query(query);
    
    if (!entries || entries.length === 0) {
      return res.json({ entries: [] });
    }
    
    // Format the results to include units in recordedBy
    const formattedEntries = entries.map(entry => ({
      ...entry,
      recorded_by: entry.user_units 
        ? `${entry.user_name} (${entry.user_units})`
        : entry.user_name
    }));
    
    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error('Error fetching all entries:', error);
    res.status(500).json({ message: 'Failed to fetch entries' });
  }
});

// Get dashboard stats
app.get('/api/stats', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];
  
  const statsQueries = [
    'SELECT COUNT(*) as totalEntries FROM entries',
    `SELECT COUNT(*) as todayEntries FROM entries WHERE date = '${today}'`,
    'SELECT COUNT(*) as totalUsers FROM users WHERE role = "user"',
    'SELECT COUNT(*) as pendingEntries FROM entries WHERE timeOut IS NULL'
  ];

  Promise.all(statsQueries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        resolve(results[0]);
      });
    });
  }))
  .then(([totalEntries, todayEntries, totalUsers, pendingEntries]) => {
    res.json({
      totalEntries: totalEntries.totalEntries,
      todayEntries: todayEntries.todayEntries,
      totalUsers: totalUsers.totalUsers,
      pendingEntries: pendingEntries.pendingEntries
    });
  })
  .catch(error => {
    res.status(500).json({ message: 'Server error' });
  });
});

// Get active users count
app.get('/api/active-users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT COUNT(DISTINCT userId) as activeUsers 
    FROM entries 
    WHERE date = ?
  `;
  
  db.query(query, [today], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json({ activeUsers: results[0].activeUsers });
  });
});

// Export entries
app.get('/api/export', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const query = `
    SELECT 
      e.serialNumber as 'Serial Number',
      DATE_FORMAT(e.date, '%Y-%m-%d') as 'Date',
      e.driverName as 'Driver Name',
      e.driverMobile as 'Driver Mobile',
      e.vehicleNumber as 'Vehicle Number',
      e.vehicleType as 'Vehicle Type',
      e.source as 'Source',
      e.loadingUnload as 'Loading/Unloading',
      TIME_FORMAT(e.timeIn, '%H:%i') as 'Time In',
      TIME_FORMAT(e.timeOut, '%H:%i') as 'Time Out',
      e.checkBy as 'Checked By',
      e.remarks as 'Remarks',
      e.recordedBy as 'Recorded By',
      u.name as 'User Name'
    FROM entries e
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.date DESC, e.timeIn DESC
  `;

  try {
    const [results] = await db.promise().query(query);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'No entries found' });
    }

    // Convert results to CSV
    const fields = Object.keys(results[0]);
    const csv = [
      fields.join(','), // Header row
      ...results.map(row => 
        fields.map(field => 
          JSON.stringify(row[field] || '')
        ).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vehicle_entries.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting entries:', error);
    res.status(500).json({ message: 'Failed to export entries' });
  }
});

// Delete entry
app.delete('/api/entries/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    await db.promise().query('DELETE FROM entries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ message: 'Failed to delete entry' });
  }
});

// Update entry
app.put('/api/entries/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const {
    date,
    driverMobile,
    driverName,
    vehicleNumber,
    vehicleType,
    source,
    loadingUnload,
    timeIn,
    timeOut,
    checkBy,
    remarks
  } = req.body;

  try {
    await db.promise().query(
      `UPDATE entries SET 
        date = ?,
        driverMobile = ?,
        driverName = ?,
        vehicleNumber = ?,
        vehicleType = ?,
        source = ?,
        loadingUnload = ?,
        timeIn = ?,
        timeOut = ?,
        checkBy = ?,
        remarks = ?
      WHERE id = ?`,
      [
        date,
        driverMobile,
        driverName,
        vehicleNumber,
        vehicleType,
        source,
        loadingUnload,
        timeIn,
        timeOut,
        checkBy,
        remarks,
        req.params.id
      ]
    );
    res.json({ message: 'Entry updated successfully' });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ message: 'Failed to update entry' });
  }
});

// Get user profile endpoint
app.get('/api/profile', verifyToken, (req, res) => {
  const userId = req.user.id;
  
  const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    res.json(user);
  });
});

// Change password endpoint
app.put('/api/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  // Validate passwords
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All password fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New passwords do not match' });
  }

  try {
    // Get user's current password
    const query = 'SELECT password FROM users WHERE id = ?';
    db.query(query, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = results[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password in database
      const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
      db.query(updateQuery, [hashedPassword, userId], (updateErr) => {
        if (updateErr) {
          console.error('Error updating password:', updateErr);
          return res.status(500).json({ message: 'Error updating password' });
        }

        res.json({ message: 'Password updated successfully' });
      });
    });
  } catch (error) {
    console.error('Error in change password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get driver info by mobile number
app.get('/api/driver-info/:mobile', verifyToken, (req, res) => {
  const mobile = req.params.mobile.trim();
  
  // Validate mobile number format
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ message: 'Invalid mobile number format' });
  }

  const query = `
    SELECT driverName 
    FROM driverInfo 
    WHERE driverMobile = ? 
    COLLATE utf8mb4_general_ci
    LIMIT 1
  `;
  
  db.query(query, [mobile], (err, results) => {
    if (err) {
      console.error('Error fetching driver info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(results[0]);
  });
});

// Save driver info
app.post('/api/driver-info', verifyToken, (req, res) => {
  const { driverMobile, driverName } = req.body;
  
  // Validate inputs
  if (!driverMobile || !driverName) {
    return res.status(400).json({ message: 'Driver mobile and name are required' });
  }
  
  // Validate mobile number format
  if (!/^\d{10}$/.test(driverMobile.trim())) {
    return res.status(400).json({ message: 'Invalid mobile number format' });
  }

  const query = `
    INSERT INTO driverInfo (driverMobile, driverName) 
    VALUES (?, ?) 
    ON DUPLICATE KEY UPDATE driverName = ?
  `;
  
  db.query(query, [driverMobile.trim(), driverName.trim(), driverName.trim()], (err, results) => {
    if (err) {
      console.error('Error saving driver info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Driver info saved successfully' });
  });
});

// Get vehicle info by vehicle number
app.get('/api/vehicle-info/:number', verifyToken, (req, res) => {
  const vehicleNumber = req.params.number;
  const query = 'SELECT vehicletype FROM vehicleinfo WHERE vehiclenumber = ?';
  
  db.query(query, [vehicleNumber], (err, results) => {
    if (err) {
      console.error('Error fetching vehicle info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    // Return in camelCase to match frontend
    res.json({
      vehicleType: results[0].vehicletype
    });
  });
});

// Save vehicle info
app.post('/api/vehicle-info', verifyToken, (req, res) => {
  const { vehicleNumber, vehicleType } = req.body;
  
  const query = 'INSERT INTO vehicleinfo (vehiclenumber, vehicletype) VALUES (?, ?) ON DUPLICATE KEY UPDATE vehicletype = ?';
  
  db.query(query, [vehicleNumber, vehicleType, vehicleType], (err, results) => {
    if (err) {
      console.error('Error saving vehicle info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Vehicle info saved successfully' });
  });
});

// Source location suggestions endpoints
app.post('/api/source-locations', verifyToken, (req, res) => {
  const { location } = req.body;
  
  if (!location) {
    return res.status(400).json({ message: 'Location is required' });
  }

  // First check if location exists
  db.query('SELECT id, frequency FROM source_locations WHERE location = ?', [location], (err, results) => {
    if (err) {
      console.error('Error checking source location:', err);
      return res.status(500).json({ message: 'Error saving source location' });
    }

    if (results.length > 0) {
      // Update existing location frequency
      db.query('UPDATE source_locations SET frequency = frequency + 1 WHERE id = ?', [results[0].id], (err) => {
        if (err) {
          console.error('Error updating source location frequency:', err);
          return res.status(500).json({ message: 'Error updating source location' });
        }
        res.json({ message: 'Source location updated successfully' });
      });
    } else {
      // Insert new location
      db.query('INSERT INTO source_locations (location) VALUES (?)', [location], (err) => {
        if (err) {
          console.error('Error saving new source location:', err);
          return res.status(500).json({ message: 'Error saving source location' });
        }
        res.json({ message: 'Source location saved successfully' });
      });
    }
  });
});

app.get('/api/source-locations/suggestions', verifyToken, (req, res) => {
  const { search } = req.query;
  
  let query = 'SELECT location FROM source_locations';
  let params = [];
  
  if (search) {
    query += ' WHERE location LIKE ?';
    params.push(`${search}%`);
  }
  
  query += ' ORDER BY frequency DESC LIMIT 10';
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error getting source suggestions:', err);
      return res.status(500).json({ message: 'Error getting suggestions' });
    }
    res.json(results.map(row => row.location));
  });
});

// Unit management endpoints
app.post('/api/units', verifyToken, (req, res) => {
  const { unit_number, unit_name } = req.body;
  const userId = req.user.id;

  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Admin cannot be assigned units' });
  }

  const query = 'INSERT INTO units (unit_number, unit_name, userId) VALUES (?, ?, ?)';
  db.query(query, [unit_number, unit_name, userId], (err, result) => {
    if (err) {
      console.error('Error creating unit:', err);
      return res.status(500).json({ message: 'Error creating unit' });
    }
    res.status(201).json({ message: 'Unit created successfully', id: result.insertId });
  });
});

// Get units for logged-in user
app.get('/api/user/units', verifyToken, (req, res) => {
  const userId = req.user.id;

  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Admin does not have assigned units' });
  }

  const query = 'SELECT * FROM units WHERE userId = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching units:', err);
      return res.status(500).json({ message: 'Error fetching units' });
    }
    res.json(results);
  });
});

const invoiceRoutes = require('./routes/invoice.routes');
app.use('/api', invoiceRoutes);

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const entryRoutes = require('./routes/entries.routes');
app.use('/api', entryRoutes);

const vehicleRoutes = require('./routes/vehicle.routes');
app.use('/api', vehicleRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/api', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
