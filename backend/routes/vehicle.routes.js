const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Add or update vehicle info
router.post('/vehicle-info', verifyToken, (req, res) => {
  const { vehicleNumber, vehicleType } = req.body;
  
  const query = 'INSERT INTO vehicleinfo (vehiclenumber, vehicletype) VALUES (?, ?) ON DUPLICATE KEY UPDATE vehicletype = ?';
  
  db.query(query, [vehicleNumber, vehicleType, vehicleType], (err, result) => {
    if (err) {
      console.error('Error adding/updating vehicle info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Vehicle info saved successfully' });
  });
});

// Get vehicle info
router.get('/vehicle-info/:vehicleNumber', verifyToken, (req, res) => {
  const vehicleNumber = req.params.vehicleNumber;
  
  const query = 'SELECT * FROM vehicleinfo WHERE vehiclenumber = ?';
  
  db.query(query, [vehicleNumber], (err, results) => {
    if (err) {
      console.error('Error fetching vehicle info:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    res.json(results[0]);
  });
});

// Get vehicle type suggestions
router.get('/vehicle-types/suggestions', verifyToken, (req, res) => {
  const { search } = req.query;
  
  let query = 'SELECT DISTINCT vehicletype FROM vehicleinfo';
  let params = [];
  
  if (search) {
    query += ' WHERE vehicletype LIKE ?';
    params.push(`${search}%`);
  }
  
  query += ' ORDER BY vehicletype ASC LIMIT 10';
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error getting vehicle type suggestions:', err);
      return res.status(500).json({ message: 'Error getting suggestions' });
    }
    res.json(results.map(row => row.vehicletype));
  });
});

module.exports = router;
