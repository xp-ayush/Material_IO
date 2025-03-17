import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { 
  FaFileInvoice,
  FaBuilding,
  FaTruck,
  FaClock,
  FaMoneyBillWave,
  FaBox
} from 'react-icons/fa';
import './InvoiceForm.css';

const InvoiceForm = ({ onSubmit, onNotification, isEditing }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    partyName: '',
    billNumber: '',
    materials: [{ name: '', quantity: '' }],
    billAmount: '',
    entryType: '',
    vehicleType: '',
    source: '',
    timeIn: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    timeOut: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [showVehicleTypeSuggestions, setShowVehicleTypeSuggestions] = useState(false);
  const [vehicleTypeSuggestions, setVehicleTypeSuggestions] = useState([]);

  useEffect(() => {
    // Fetch next serial number
    const fetchNextSerial = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/next-serial-number`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSerialNumber(response.data.nextSerial);
      } catch (error) {
        onNotification('Error fetching serial number', 'error');
      }
    };

    fetchNextSerial();
  }, []);

  const handleSourceChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, source: value }));

    if (value.length > 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/source-locations/suggestions?search=${value}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSourceSuggestions(response.data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setSourceSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleVehicleTypeChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, vehicleType: value }));

    if (value.length > 0) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/vehicle-types/suggestions?search=${value}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVehicleTypeSuggestions(response.data);
        setShowVehicleTypeSuggestions(true);
      } catch (error) {
        console.error('Error fetching vehicle type suggestions:', error);
      }
    } else {
      setVehicleTypeSuggestions([]);
      setShowVehicleTypeSuggestions(false);
    }
  };

  const selectSource = (source) => {
    setFormData(prev => ({ ...prev, source }));
    setShowSuggestions(false);
  };

  const selectVehicleType = (vehicleType) => {
    setFormData(prev => ({ ...prev, vehicleType }));
    setShowVehicleTypeSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Time out validation
    if (name === 'timeOut' && value < formData.timeIn) {
      onNotification('Time out cannot be before time in', 'error');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { name: '', quantity: '' }]
    }));
  };

  const removeMaterial = (index) => {
    if (formData.materials.length > 1) {
      setFormData(prev => ({
        ...prev,
        materials: prev.materials.filter((_, i) => i !== index)
      }));
    }
  };

  const handleMaterialChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure date is today
      const today = new Date().toISOString().split('T')[0];
      if (formData.date !== today) {
        throw new Error('Date must be today');
      }

      // Validate time out if provided
      if (formData.timeOut && formData.timeOut < formData.timeIn) {
        throw new Error('Time out cannot be before time in');
      }

      await onSubmit(formData);
      
      // Save the source location for suggestions
      if (formData.source) {
        await axios.post(`${API_BASE_URL}/api/source-locations`, 
          { location: formData.source },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
        );
      }

      // Save vehicle type to vehicleinfo table
      if (formData.vehicleType) {
        await axios.post(`${API_BASE_URL}/api/vehicle-info`, 
          { 
            vehicleNumber: 'TEMP', // Using temporary number since we don't have real number
            vehicleType: formData.vehicleType 
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
        );
      }

      setFormData({
        ...formData,
        partyName: '',
        billNumber: '',
        materials: [{ name: '', quantity: '' }],
        billAmount: '',
        entryType: '',
        vehicleType: '',
        source: '',
        timeOut: '',
        remarks: ''
      });
      onNotification('Invoice added successfully', 'success');
    } catch (error) {
      onNotification(error.message || 'Error submitting invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="invoice-form">
      <h2><FaFileInvoice /> Inward Entry</h2>

      <div className="form-section">
        <h3><FaBuilding /> Basic Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Serial Number</label>
            <input
              type="text"
              value={serialNumber}
              disabled
              className="disabled-input"
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              disabled
              className="disabled-input"
            />
          </div>
          <div className="form-group">
            <label>Party Name</label>
            <input
              type="text"
              name="partyName"
              value={formData.partyName}
              onChange={handleChange}
              required
              placeholder="Enter party name"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><FaMoneyBillWave /> Bill Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Bill Number</label>
            <input
              type="text"
              name="billNumber"
              value={formData.billNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Bill Amount</label>
            <input
              type="number"
              name="billAmount"
              value={formData.billAmount}
              onChange={handleChange}
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label>Entry Type</label>
            <select
              name="entryType"
              value={formData.entryType}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              <option value="Cash">Cash</option>
              <option value="Challan">Challan</option>
              <option value="Bill">Bill</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><FaBox /> Material Details</h3>
        <div className="materials-container">
          {formData.materials.map((material, index) => (
            <div key={index} className="material-row">
              <div className="form-group">
                <label>Material Name {index + 1}</label>
                <input
                  type="text"
                  value={material.name}
                  onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Quantity {index + 1}</label>
                <input
                  type="number"
                  value={material.quantity}
                  onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                  required
                />
              </div>
              {formData.materials.length > 1 && (
                <button
                  type="button"
                  className="remove-material-btn"
                  onClick={() => removeMaterial(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="add-material-btn"
            onClick={addMaterial}
          >
            Add Material
          </button>
        </div>
      </div>

      <div className="form-section">
        <h3><FaTruck /> Vehicle Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Vehicle Type</label>
            <div className="suggestion-input-container">
              <input
                type="text"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleVehicleTypeChange}
                onFocus={() => formData.vehicleType && handleVehicleTypeChange({ target: { value: formData.vehicleType } })}
                placeholder="Enter vehicle type"
                className="suggestion-input"
              />
              {showVehicleTypeSuggestions && vehicleTypeSuggestions.length > 0 && (
                <ul className="suggestions-list">
                  {vehicleTypeSuggestions.map((suggestion, index) => (
                    <li key={index} onClick={() => selectVehicleType(suggestion)}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Source</label>
            <div className="suggestion-input-container">
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleSourceChange}
                onFocus={() => formData.source && handleSourceChange({ target: { value: formData.source } })}
                placeholder="Enter source"
                className="suggestion-input"
              />
              {showSuggestions && sourceSuggestions.length > 0 && (
                <ul className="suggestions-list">
                  {sourceSuggestions.map((suggestion, index) => (
                    <li key={index} onClick={() => selectSource(suggestion)}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><FaClock /> Time Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Time In</label>
            <input
              type="time"
              name="timeIn"
              value={formData.timeIn}
              disabled
              className="disabled-input"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-row">
          <div className="form-group full-width">
            <label>Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
            />
          </div>
        </div>
      </div>

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Invoice'}
      </button>
    </form>
  );
};

export default InvoiceForm;
