const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get user entries
router.get('/user-entries', verifyToken, (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.serialNumber,
      e.vehicleNumber,
      e.driverName,
      e.driverNumber,
      e.material,
      e.quantity,
      e.unit,
      e.date,
      e.time,
      e.recordedBy,
      e.status,
      e.vehicleType,
      e.partyName,
      e.remarks
    FROM entries e
    WHERE e.recordedBy = ?
    ORDER BY e.date DESC, e.time DESC
  `;

  db.query(query, [req.user.id], (err, results) => {
    if (err) {
      console.error('Error fetching entries:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results);
  });
});

// Add new entry
router.post('/entries', verifyToken, (req, res) => {
  const {
    serialNumber,
    vehicleNumber,
    driverName,
    driverNumber,
    material,
    quantity,
    unit,
    date,
    time,
    vehicleType,
    partyName,
    remarks
  } = req.body;

  const query = `
    INSERT INTO entries (
      serialNumber,
      vehicleNumber,
      driverName,
      driverNumber,
      material,
      quantity,
      unit,
      date,
      time,
      recordedBy,
      status,
      vehicleType,
      partyName,
      remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    serialNumber,
    vehicleNumber,
    driverName,
    driverNumber,
    material,
    quantity,
    unit,
    date,
    time,
    req.user.id,
    'pending',
    vehicleType,
    partyName,
    remarks
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error adding entry:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ message: 'Entry added successfully', id: result.insertId });
  });
});

module.exports = router;
