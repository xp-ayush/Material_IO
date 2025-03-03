import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTruck, FaUser, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import './EntryForm.css';

const EntryForm = ({ onSubmit, onNotification }) => {
  const [formData, setFormData] = useState({
    serialNumber: '',
    date: new Date().toISOString().split('T')[0],
    driverMobile: '',
    driverName: '',
    vehicleNumber: '',
    vehicleType: '',
    source: '',
    loadingUnload: '',
    timeIn: '',
    timeOut: '',
    checkBy: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        ...formData,
        serialNumber: '',
        driverMobile: '',
        driverName: '',
        vehicleNumber: '',
        vehicleType: '',
        source: '',
        loadingUnload: '',
        timeIn: '',
        timeOut: '',
        checkBy: '',
        remarks: ''
      });
      onNotification('Entry added successfully', 'success');
    } catch (error) {
      onNotification(error.message || 'Error submitting entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="entry-form">
      <h2>New Entry</h2>
      
      <div className="form-section">
        <h3><FaTruck /> Vehicle Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Serial Number</label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Vehicle Type</label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              <option value="Truck">Truck</option>
              <option value="Trailer">Trailer</option>
              <option value="Container">Container</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><FaUser /> Driver Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Driver Name</label>
            <input
              type="text"
              name="driverName"
              value={formData.driverName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Driver Mobile</label>
            <input
              type="tel"
              name="driverMobile"
              value={formData.driverMobile}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3><FaMapMarkerAlt /> Source & Loading</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Source</label>
            <input
              type="text"
              name="source"
              value={formData.source}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Loading/Unload</label>
            <select
              name="loadingUnload"
              value={formData.loadingUnload}
              onChange={handleChange}
              required
            >
              <option value="">Select Status</option>
              <option value="Loading">Loading</option>
              <option value="Unloading">Unloading</option>
            </select>
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
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Time Out</label>
            <input
              type="time"
              name="timeOut"
              value={formData.timeOut}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-row">
          <div className="form-group">
            <label>Check By</label>
            <input
              type="text"
              name="checkBy"
              value={formData.checkBy}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
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

      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Entry'}
      </button>
    </form>
  );
};

export default EntryForm;
