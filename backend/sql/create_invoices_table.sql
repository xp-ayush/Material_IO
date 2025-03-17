CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serialNumber VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    partyName VARCHAR(100) NOT NULL,
    billNumber VARCHAR(50) NOT NULL UNIQUE,
    materialName VARCHAR(100),
    billAmount DECIMAL(10, 2) NOT NULL,
    entryType ENUM('Cash', 'Challan', 'Bill') NOT NULL,
    vehicleType VARCHAR(50),
    source VARCHAR(100),
    timeIn TIME,
    timeOut TIME,
    remarks TEXT,
    recordedBy INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recordedBy) REFERENCES users(id),
    INDEX idx_bill_number (billNumber),
    INDEX idx_party_name (partyName),
    INDEX idx_date (date)
);

-- Create invoice_materials table if not exists
CREATE TABLE IF NOT EXISTS invoice_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
