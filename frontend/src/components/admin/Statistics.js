import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaDatabase, FaTruck, FaUser, FaBox } from 'react-icons/fa';
import { API_BASE_URL } from '../../config';
import './Statistics.css';

const Statistics = ({ onNotification }) => {
  const [stats, setStats] = useState({
    totalEntries: 0,
    uniqueVehicles: 0,
    uniqueDrivers: 0,
    uniqueMaterials: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      onNotification('Error fetching statistics', 'error');
    }
  };

  return (
    <div className="statistics">
      <h2>Dashboard Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaDatabase />
          </div>
          <div className="stat-info">
            <h3>Total Entries</h3>
            <p>{stats.totalEntries}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaTruck />
          </div>
          <div className="stat-info">
            <h3>Unique Vehicles</h3>
            <p>{stats.uniqueVehicles}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaUser />
          </div>
          <div className="stat-info">
            <h3>Unique Drivers</h3>
            <p>{stats.uniqueDrivers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaBox />
          </div>
          <div className="stat-info">
            <h3>Unique Materials</h3>
            <p>{stats.uniqueMaterials}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
