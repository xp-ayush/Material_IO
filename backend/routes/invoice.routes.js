const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Test route to check database connection
router.get('/test-invoices', verifyToken, async (req, res) => {
  try {
    const [result] = await db.promise().query('SELECT 1 + 1 as test');
    res.json({ message: 'Database connection successful', result });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Get next serial number
router.get('/next-serial-number', verifyToken, async (req, res) => {
  try {
    const [result] = await db.promise().query('SELECT MAX(CAST(serialNumber AS SIGNED)) as maxSerial FROM invoices');
    const nextSerial = (result[0].maxSerial || 0) + 1;
    res.json({ nextSerial });
  } catch (error) {
    console.error('Error getting next serial number:', error);
    res.status(500).json({ message: 'Error getting next serial number' });
  }
});

// Get suggestions from source table
router.get('/source-suggestions', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    const query = `
      SELECT DISTINCT name 
      FROM source 
      WHERE name LIKE ? 
      AND name IS NOT NULL
      ORDER BY name ASC 
      LIMIT 10
    `;
    const [results] = await db.promise().query(query, [`%${search}%`]);
    res.json(results.map(r => r.name));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// Add new invoice
router.post('/invoices', verifyToken, async (req, res) => {
  const connection = await db.promise();
  try {
    await connection.beginTransaction();

    // Get the next serial number
    const [serialResult] = await connection.query('SELECT MAX(CAST(serialNumber AS SIGNED)) as maxSerial FROM invoices');
    const nextSerial = (serialResult[0].maxSerial || 0) + 1;

    const {
      date,
      partyName,
      billNumber,
      materials,  // Array of materials
      billAmount,
      entryType,
      vehicleType,
      source,
      timeIn,
      timeOut,
      remarks
    } = req.body;

    // Validate date (must be today)
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) {
      await connection.rollback();
      return res.status(400).json({ message: 'Date must be today' });
    }

    // Validate timeOut if provided
    if (timeOut && timeIn && timeOut < timeIn) {
      await connection.rollback();
      return res.status(400).json({ message: 'Time out cannot be before time in' });
    }

    // Insert the invoice
    const query = `
      INSERT INTO invoices (
        serialNumber,
        date,
        partyName,
        billNumber,
        billAmount,
        entryType,
        vehicleType,
        source,
        timeIn,
        timeOut,
        remarks,
        recordedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nextSerial.toString(),
      date,
      partyName,
      billNumber,
      billAmount,
      entryType,
      vehicleType,
      source,
      timeIn,
      timeOut,
      remarks,
      req.user.id
    ];

    const [result] = await connection.query(query, values);
    const invoiceId = result.insertId;

    // Insert materials
    if (materials && materials.length > 0) {
      console.log('Inserting materials:', materials);
      const materialsQuery = 'INSERT INTO invoice_materials (invoice_id, material_name, quantity) VALUES ?';
      const materialValues = materials.map(m => [invoiceId, m.name, m.quantity]);
      console.log('Material values:', materialValues);
      await connection.query(materialsQuery, [materialValues]);
      console.log('Materials inserted successfully');
    }

    await connection.commit();
    console.log('Transaction committed successfully');

    res.json({ 
      message: 'Invoice added successfully', 
      id: invoiceId,
      serialNumber: nextSerial
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding invoice:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Bill number already exists' });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get user's invoices with materials
router.get('/user-invoices', verifyToken, async (req, res) => {
  const query = `
    SELECT 
      i.*,
      u.name as recordedByName,
      GROUP_CONCAT(
        JSON_OBJECT(
          'id', im.id,
          'name', im.material_name,
          'quantity', im.quantity
        ) SEPARATOR ','
      ) as materials
    FROM invoices i
    LEFT JOIN users u ON i.recordedBy = u.id
    LEFT JOIN invoice_materials im ON i.id = im.invoice_id
    WHERE i.recordedBy = ?
    GROUP BY i.id, i.serialNumber, i.date, i.partyName, i.billNumber, 
             i.billAmount, i.entryType, i.vehicleType,
             i.source, i.timeIn, i.timeOut, i.remarks, i.recordedBy,
             i.created_at, u.name
    ORDER BY i.date DESC, i.timeIn DESC
  `;

  try {
    const [results] = await db.promise().query(query, [req.user.id]);
    
    console.log('Raw results from invoices query:', results);
    
    // Parse the materials JSON string for each invoice
    const invoices = results.map(invoice => {
      console.log('Processing invoice:', invoice.id);
      console.log('Materials data:', invoice.materials);
      const parsedInvoice = {
        ...invoice,
        materials: invoice.materials ? JSON.parse(`[${invoice.materials}]`) : []
      };
      console.log('Parsed materials:', parsedInvoice.materials);
      return parsedInvoice;
    });

    console.log('Final invoices data:', invoices);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ message: 'Invoices table does not exist' });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get all invoices (admin only) with materials
router.get('/invoices', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const query = `
    SELECT 
      i.*,
      u.name as recordedByName,
      GROUP_CONCAT(
        JSON_OBJECT(
          'id', im.id,
          'name', im.material_name,
          'quantity', im.quantity
        )
      ) as materials
    FROM invoices i
    LEFT JOIN users u ON i.recordedBy = u.id
    LEFT JOIN invoice_materials im ON i.id = im.invoice_id
    GROUP BY i.id
    ORDER BY i.date DESC, i.timeIn DESC
  `;

  try {
    const [results] = await db.promise().query(query);
    
    // Parse the materials JSON string for each invoice
    const invoices = results.map(invoice => ({
      ...invoice,
      materials: invoice.materials ? JSON.parse(`[${invoice.materials}]`) : []
    }));

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ message: 'Invoices table does not exist' });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get party name suggestions
router.get('/party-suggestions', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    const query = `
      SELECT DISTINCT partyName 
      FROM invoices 
      WHERE partyName LIKE ? 
      ORDER BY partyName ASC 
      LIMIT 10
    `;
    const [results] = await db.promise().query(query, [`%${search}%`]);
    res.json(results.map(r => r.partyName));
  } catch (error) {
    console.error('Error fetching party suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// Get vehicle type suggestions
router.get('/vehicle-suggestions', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    const query = `
      SELECT DISTINCT vehicleType 
      FROM invoices 
      WHERE vehicleType LIKE ? 
      AND vehicleType IS NOT NULL
      ORDER BY vehicleType ASC 
      LIMIT 10
    `;
    const [results] = await db.promise().query(query, [`%${search}%`]);
    res.json(results.map(r => r.vehicleType));
  } catch (error) {
    console.error('Error fetching vehicle suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// Get material name suggestions
router.get('/material-suggestions', verifyToken, async (req, res) => {
  const { search } = req.query;
  try {
    const query = `
      SELECT DISTINCT materialName 
      FROM invoices 
      WHERE materialName LIKE ? 
      ORDER BY materialName ASC 
      LIMIT 10
    `;
    const [results] = await db.promise().query(query, [`%${search}%`]);
    res.json(results.map(r => r.materialName));
  } catch (error) {
    console.error('Error fetching material suggestions:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

// Get invoice by ID
router.get('/invoices/:id', verifyToken, (req, res) => {
  const invoiceId = req.params.id;
  
  const query = 'SELECT * FROM invoices WHERE id = ?';
  
  db.query(query, [invoiceId], (err, results) => {
    if (err) {
      console.error('Error fetching invoice:', err);
      return res.status(500).json({ message: 'Error fetching invoice' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json(results[0]);
  });
});

// Update invoice time out only
router.put('/invoices/:id', verifyToken, (req, res) => {
  const { timeOut } = req.body;
  const invoiceId = req.params.id;

  if (!timeOut) {
    return res.status(400).json({ message: 'Time out is required' });
  }

  // First check if the invoice exists and get its time in
  const checkQuery = 'SELECT timeIn FROM invoices WHERE id = ?';
  db.query(checkQuery, [invoiceId], (err, results) => {
    if (err) {
      console.error('Error checking invoice:', err);
      return res.status(500).json({ message: 'Error updating time out' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const timeIn = results[0].timeIn;

    // Check if time out is empty or zero
    if (!timeOut || timeOut === '00:00' || timeOut === '00:00:00' || timeOut === '0000') {
      return res.status(400).json({ message: 'Please enter a valid time out' });
    }

    if (timeOut < timeIn) {
      return res.status(400).json({ message: 'Time out cannot be before time in' });
    }

    // Update only the time out field
    const updateQuery = 'UPDATE invoices SET timeOut = ? WHERE id = ?';
    db.query(updateQuery, [timeOut, invoiceId], (err, result) => {
      if (err) {
        console.error('Error updating time out:', err);
        return res.status(500).json({ message: 'Error updating time out' });
      }

      res.json({ message: 'Time out updated successfully' });
    });
  });
});

module.exports = router;
