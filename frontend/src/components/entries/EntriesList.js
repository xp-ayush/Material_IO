import React, { useState } from 'react';
import { FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import './EntriesList.css';
import * as XLSX from 'xlsx';

const EntriesList = ({ entries, onFilter, onSearch }) => {
  const [filters, setFilters] = useState({
    search: '',
    vehicleType: '',
    source: '',
    loadingStatus: '',
    startDate: '',
    endDate: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    onFilter({ ...filters, [name]: value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(filters.search);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(entries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entries");
    XLSX.writeFile(workbook, "entries.xlsx");
  };

  return (
    <div className="entries-list">
      <div className="entries-header">
        <h2>Entries List</h2>
        <button className="export-btn" onClick={exportToExcel}>
          <FaDownload /> Export to Excel
        </button>
      </div>

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input">
            <input
              type="text"
              name="search"
              placeholder="Search entries..."
              value={filters.search}
              onChange={handleFilterChange}
            />
            <button type="submit">
              <FaSearch />
            </button>
          </div>
        </form>

        <div className="filters">
          <select
            name="vehicleType"
            value={filters.vehicleType}
            onChange={handleFilterChange}
          >
            <option value="">All Vehicle Types</option>
            <option value="Truck">Truck</option>
            <option value="Trailer">Trailer</option>
            <option value="Container">Container</option>
          </select>

          <select
            name="loadingStatus"
            value={filters.loadingStatus}
            onChange={handleFilterChange}
          >
            <option value="">All Status</option>
            <option value="Loading">Loading</option>
            <option value="Unloading">Unloading</option>
          </select>

          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            placeholder="Start Date"
          />

          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            placeholder="End Date"
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Serial Number</th>
              <th>Date</th>
              <th>Driver Name</th>
              <th>Vehicle Number</th>
              <th>Vehicle Type</th>
              <th>Source</th>
              <th>Loading/Unload</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Check By</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>{entry.serialNumber}</td>
                <td>{new Date(entry.date).toLocaleDateString()}</td>
                <td>{entry.driverName}</td>
                <td>{entry.vehicleNumber}</td>
                <td>{entry.vehicleType}</td>
                <td>{entry.source}</td>
                <td>{entry.loadingUnload}</td>
                <td>{entry.timeIn}</td>
                <td>{entry.timeOut}</td>
                <td>{entry.checkBy}</td>
                <td>{entry.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntriesList;
