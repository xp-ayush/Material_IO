const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized - Admin access required' });
  }
  next();
};

// Get all users
router.get('/users', verifyToken, isAdmin, (req, res) => {
  const query = 'SELECT id, name, email, role, created_at FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results);
  });
});

// Create new user
router.post('/users', verifyToken, isAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
    
    db.query(query, [name, email, hashedPassword, role], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Email already exists' });
        }
        console.error('Error creating user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json({ message: 'User created successfully', id: result.insertId });
    });
  } catch (err) {
    console.error('Error hashing password:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, isAdmin, (req, res) => {
  const userId = req.params.id;
  
  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// Get statistics
router.get('/stats', verifyToken, isAdmin, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as totalEntries,
      COUNT(DISTINCT vehicleNumber) as uniqueVehicles,
      COUNT(DISTINCT driverName) as uniqueDrivers,
      COUNT(DISTINCT material) as uniqueMaterials
    FROM entries
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching statistics:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results[0]);
  });
});

module.exports = router;
