import React, { useState } from 'react';
import { FaSearch, FaDownload } from 'react-icons/fa';
import './InvoicesList.css';
import * as XLSX from 'xlsx';

const InvoicesList = ({ invoices, onFilter, onSearch }) => {
  const [filters, setFilters] = useState({
    search: '',
    entryType: '',
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
    const worksheet = XLSX.utils.json_to_sheet(invoices);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "invoices.xlsx");
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <div className="invoices-list">
      <div className="invoices-header">
        <h2>Invoices List</h2>
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
              placeholder="Search invoices..."
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
            name="entryType"
            value={filters.entryType}
            onChange={handleFilterChange}
          >
            <option value="">All Entry Types</option>
            <option value="Cash">Cash</option>
            <option value="Challan">Challan</option>
            <option value="Bill">Bill</option>
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
              <th>Party Name</th>
              <th>Bill Number</th>
              <th>Material Name</th>
              <th>Bill Amount</th>
              <th>Entry Type</th>
              <th>Vehicle Type</th>
              <th>Source</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.serialNumber}</td>
                <td>{new Date(invoice.date).toLocaleDateString()}</td>
                <td>{invoice.partyName}</td>
                <td>{invoice.billNumber}</td>
                <td>
                            {invoice.materials && invoice.materials.length > 0 ? (
                              <ul className="materials-list">
                                {invoice.materials.map((material, index) => (
                                  <li key={index}>
                                    {material.name} - {material.quantity}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              invoice.materialName || '-'
                            )}
                          </td>
                <td>₹{formatAmount(invoice.billAmount)}</td>
                <td>{invoice.entryType}</td>
                <td>{invoice.vehicleType || '-'}</td>
                <td>{invoice.source || '-'}</td>
                <td>{invoice.timeIn || '-'}</td>
                <td>{invoice.timeOut || '-'}</td>
                <td>{invoice.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesList;
