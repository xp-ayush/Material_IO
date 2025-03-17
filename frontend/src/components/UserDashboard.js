import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Dashboard.css';
import { 
  FaUser, 
  FaTruck, 
  FaSignOutAlt, 
  FaCheck, 
  FaClock, 
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClipboardList,
  FaExclamationTriangle,
  FaHistory,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaSync,
  FaKey,
  FaDatabase,
  FaFileInvoice,
  FaPhoneAlt,
  FaFileExcel,
  FaSearch
} from 'react-icons/fa';
import Notification from './Notification';
import InvoiceForm from './invoices/InvoiceForm';
import * as XLSX from 'xlsx';

function UserDashboard() {
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

  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    created_at: '',
    loading: true,
    error: null
  });

  const [userUnits, setUserUnits] = useState([]);

  const [entriesData, setEntriesData] = useState({
    entries: [],
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
    itemsPerPage: 10
  });

  const [submitState, setSubmitState] = useState({
    loading: false,
    success: false,
    error: null
  });

  const [activeSection, setActiveSection] = useState('form'); // 'form', 'history', 'invoice-form', or 'invoices'

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [otherPurpose, setOtherPurpose] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError] = useState('');
  const [passwordSuccess] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const handlePurposeChange = (e) => {
    const { value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      loadingUnload: value
    }));
    if (value !== 'Other') {
      setOtherPurpose('');
    }
  };

  const [filters, /*setFilters*/] = useState({
    search: '',
    vehicleType: '',
    source: '',
    loadingStatus: '',
    startDate: null,
    endDate: null
  });

  const [columnFilters, setColumnFilters] = useState({
    date: [],
    driverName: [],
    vehicleType: [],
    source: [],
    loadingUnload: [],
    checkBy: [],
  });

  const [activeFilter, setActiveFilter] = useState(null);

  const [editingInvoice, setEditingInvoice] = useState(null);

  const [timeoutValues, setTimeoutValues] = useState({});

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('today');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [allEntries, setAllEntries] = useState([]); // Store all entries
  const [allInvoices, setAllInvoices] = useState([]); // Store all invoices

  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'user') {
      localStorage.clear();
      navigate('/login');
      return;
    }

    // Set up axios interceptor for token expiration
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  const getToken = useCallback(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'user') {
      localStorage.clear();
      navigate('/login');
      return null;
    }
    return token;
  }, [navigate]);

  const fetchUserData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData({
        name: response.data.name,
        loading: false,
        error: null
      });
    } catch (error) {
      setUserData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch user data'
      }));
    }
  }, [getToken]);

  const fetchUserProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData({
        ...response.data,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      }));
      addNotification(error.response?.data?.message || 'Failed to fetch profile', 'error');
    }
  }, [getToken]);

  const fetchUserUnits = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/units`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserUnits(response.data);
    } catch (error) {
      console.error('Error fetching user units:', error);
    }
  }, [getToken]);

  const fetchEntries = useCallback(async () => {
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    setEntriesData(prev => ({ ...prev, loading: true }));
    try {
      const endpoint = '/api/user-entries';
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Sort entries by date and time
      const sortedEntries = response.data.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.timeIn);
        const dateB = new Date(b.date + ' ' + b.timeIn);
        return dateB - dateA;
      });

      setAllEntries(sortedEntries);
      setEntriesData({
        entries: sortedEntries,
        loading: false,
        error: null,
        page: 1,
        totalPages: Math.ceil(sortedEntries.length / 10),
        itemsPerPage: 10
      });
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntriesData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch entries'
      }));
      addNotification(error.response?.data?.message || 'Failed to fetch entries', 'error');
    }
  }, [getToken, navigate]);

  const fetchInvoices = useCallback(async () => {
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllInvoices(response.data);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      addNotification(error.response?.data?.message || 'Failed to fetch invoices', 'error');
    }
  }, [getToken, navigate]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleDriverMobileChange = async (e) => {
    const mobile = e.target.value.trim(); // Remove any whitespace
    setFormData(prev => ({ ...prev, driverMobile: mobile }));

    if (mobile.length >= 10) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/driver-info/${encodeURIComponent(mobile)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && response.data.driverName) {
          setFormData(prev => ({ 
            ...prev, 
            driverName: response.data.driverName,
            driverMobile: mobile // Ensure mobile number is set correctly
          }));
          addNotification('Driver information found and auto-filled', 'success');
        } else {
          setFormData(prev => ({ ...prev, driverName: '' }));
        }
      } catch (error) {
        console.error('Error fetching driver info:', error);
        if (error.response && error.response.status === 404) {
          setFormData(prev => ({ ...prev, driverName: '' }));
        } else if (error.response && error.response.status === 500) {
          addNotification('Server error occurred while fetching driver info', 'error');
        } else {
          addNotification('Only numbers are accepted', 'error');
        }
      }
    } else {
      setFormData(prev => ({ ...prev, driverName: '' }));
    }
  };

  const handleVehicleNumberChange = async (e) => {
    const number = e.target.value.toUpperCase(); // Convert to uppercase for consistency
    setFormData(prev => ({ ...prev, vehicleNumber: number }));
    
    if (number.length >= 4) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/vehicle-info/${encodeURIComponent(number)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.vehicleType) {
          setFormData(prev => ({ ...prev, vehicleType: response.data.vehicleType }));
        }
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.error('Error fetching vehicle info:', error);
        }
      }
    }
  };

  const handleSourceChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, source: value }));

    if (value.length > 0) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/source-locations/suggestions?search=${value}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSourceSuggestions(response.data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching source suggestions:', error);
      }
    } else {
      setSourceSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSource = (source) => {
    setFormData(prev => ({ ...prev, source }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState({ loading: true, success: false, error: null });

    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    // Validate required fields
    const requiredFields = ['driverName', 'driverMobile', 'vehicleNumber', 'vehicleType', 'source', 'loadingUnload'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setSubmitState({
        loading: false,
        success: false,
        error: `Please fill in all required fields: ${missingFields.join(', ')}`
      });
      addNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    // Automatically set current time for timeIn if not provided
    if (!formData.timeIn) {
      const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      formData.timeIn = currentTime;
    }

    try {
      // Save driver info
      await axios.post(`${API_BASE_URL}/api/driver-info`, {
        driverMobile: formData.driverMobile,
        driverName: formData.driverName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Save vehicle info
      await axios.post(`${API_BASE_URL}/api/vehicle-info`, {
        vehicleNumber: formData.vehicleNumber,
        vehicleType: formData.vehicleType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Save the source location for suggestions
      if (formData.source) {
        await axios.post(`${API_BASE_URL}/api/source-locations`, 
          { location: formData.source },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }

      // Submit the entry
      const response = await axios.post(`${API_BASE_URL}/api/entries`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSubmitState({
        loading: false,
        success: true,
        error: null
      });

      addNotification('Entry submitted successfully', 'success');

      // Reset form
      setFormData({
        serialNumber: '',
        date: new Date().toISOString().split('T')[0],
        driverMobile: '',
        driverName: '',
        vehicleNumber: '',
        vehicleType: '',
        source: '',
        loadingUnload: '',
        timeIn: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // Set current time
        timeOut: '',
        checkBy: '',
        remarks: ''
      });
      
      fetchEntries();

    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitState({
        loading: false,
        success: false,
        error: error.response?.data?.message || 'Failed to submit entry'
      });
      addNotification(error.response?.data?.message || 'Failed to submit entry', 'error');
    }
  };

  const handleSubmitInvoice = async (formData) => {
    try {
      const token = getToken();
      await axios.post(`${API_BASE_URL}/api/invoices`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInvoices();
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error submitting invoice');
    }
  };

  const handleTimeOutChange = (invoiceId, value) => {
    setTimeoutValues(prev => ({
      ...prev,
      [invoiceId]: value
    }));
  };

  const handleTimeOutUpdate = async (invoiceId, newTimeOut) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.put(
        `${API_BASE_URL}/api/invoices/${invoiceId}`,
        { timeOut: newTimeOut },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data) {
        setInvoices(prevInvoices =>
          prevInvoices.map(invoice =>
            invoice.id === invoiceId
              ? { ...invoice, timeOut: newTimeOut }
              : invoice
          )
        );
        setEditingInvoice(null);
        setTimeoutValues(prev => {
          const newValues = { ...prev };
          delete newValues[invoiceId];
          return newValues;
        });
        addNotification('Time out updated successfully', 'success');
      }
    } catch (error) {
      addNotification('Error updating time out', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Add validation for driver mobile number
    if (name === 'driverMobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prevState => ({
        ...prevState,
        [name]: numericValue
      }));
      return;
    }

    // Prevent date from being changed
    if (name === 'date') {
      return;
    }

    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchQuery(''); // Clear search on refresh
    
    try {
      await fetchEntries();
      await fetchInvoices();
     
    } catch (error) {
      addNotification('Failed to refresh data', 'error');
    }
    
    setRefreshing(false);
  };

  const handleSearch = () => {
    setIsSearching(true);
    const query = searchQuery.toLowerCase().trim();
    
    try {
      if (activeSection === 'history') {
        if (!query) {
          // If search is empty, restore all entries
          setEntriesData({
            entries: allEntries,
            page: 1
          });
        } else {
          // Filter entries
          const filteredEntries = allEntries.filter(entry => {
            return (
              (entry.serialNumber?.toString().toLowerCase().includes(query)) ||
              (entry.date?.toLowerCase().includes(query)) ||
              (entry.driverName?.toLowerCase().includes(query)) ||
              (entry.driverMobile?.toLowerCase().includes(query)) ||
              (entry.vehicleNumber?.toLowerCase().includes(query)) ||
              (entry.vehicleType?.toLowerCase().includes(query)) ||
              (entry.source?.toLowerCase().includes(query)) ||
              (entry.loadingUnload?.toLowerCase().includes(query)) ||
              (entry.timeIn?.toLowerCase().includes(query)) ||
              (entry.timeOut?.toLowerCase().includes(query)) ||
              (entry.checkBy?.toLowerCase().includes(query)) ||
              (entry.remarks?.toLowerCase().includes(query))
            );
          });

          setEntriesData({
            entries: filteredEntries,
            page: 1
          });
          addNotification(`Found ${filteredEntries.length} matching entries`, 'success');
        }
      } else {
        if (!query) {
          // If search is empty, restore all invoices
          setInvoices(allInvoices);
        } else {
          // Filter invoices
          const filteredInvoices = allInvoices.filter(invoice => {
            return (
              (invoice.serialNumber?.toString().toLowerCase().includes(query)) ||
              (invoice.date?.toLowerCase().includes(query)) ||
              (invoice.partyName?.toLowerCase().includes(query)) ||
              (invoice.billNumber?.toLowerCase().includes(query)) ||
              (invoice.materialName?.toLowerCase().includes(query)) ||
              (invoice.billAmount?.toString().toLowerCase().includes(query)) ||
              (invoice.entryType?.toLowerCase().includes(query)) ||
              (invoice.vehicleType?.toLowerCase().includes(query)) ||
              (invoice.source?.toLowerCase().includes(query)) ||
              (invoice.timeIn?.toLowerCase().includes(query)) ||
              (invoice.timeOut?.toLowerCase().includes(query))
            );
          });

          setInvoices(filteredInvoices);
          addNotification(`Found ${filteredInvoices.length} matching invoices`, 'success');
        }
      }
    } catch (error) {
      console.error('Error during search:', error);
      addNotification('Error occurred while searching', 'error');
    }

    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value === '') {
      // Reset to original data when search is cleared
      if (activeSection === 'history') {
        setEntriesData({
          entries: allEntries,
          page: 1
        });
      } else {
        setInvoices(allInvoices);
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      addNotification('All password fields are required', 'error');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      addNotification('New password must be at least 6 characters long', 'error');
      return;
    }

    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/change-password`, passwordForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      addNotification('Password changed successfully', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        setShowChangePasswordModal(false);
      }, 2000);
    } catch (error) {
      addNotification(error.response?.data?.message || 'Failed to change password', 'error');
    }
  };

  const handleLogout = () => {
    addNotification('Successfully logged out', 'success');
    setTimeout(() => {
      localStorage.clear();
      navigate('/login', { replace: true });
    }, 1000);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Check for login success notification
    const showLoginSuccess = localStorage.getItem('showLoginSuccess');
    if (showLoginSuccess === 'true') {
      addNotification('User logged in successfully', 'success');
      localStorage.removeItem('showLoginSuccess');
    }

    fetchUserProfile();
    fetchUserUnits();
    fetchEntries();
    fetchInvoices();
  }, [fetchUserProfile, fetchUserUnits, fetchEntries, fetchInvoices]);

  useEffect(() => {
    if (activeSection === 'form') {
      setFormData(prevState => ({
        ...prevState,
        timeIn: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // Set current time
      }));
    }
  }, [activeSection]);

  const handlePageChange = (newPage) => {
    setEntriesData(prev => ({ ...prev, page: newPage }));
  };

  // const applyFilters = (filterType, value) => {
  //   setFilters(prev => ({ ...prev, [filterType]: value }));
  //   setEntriesData(prev => ({ ...prev, page: 1 }));
  // };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    handleRefresh();
    if (section === 'form') {
      setFormData(prevState => ({
        ...prevState,
        timeIn: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // Set current time
      }));
    }
  };

  const renderProfile = () => {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <FaUser className="profile-icon" />
          <h2>Profile Information</h2>
        </div>
        <div className="profile-details">
          <p><strong>Name:</strong> {userData.name}</p>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Joined:</strong> {new Date(userData.created_at).toLocaleDateString()}</p>
          <div className="units-section">
            <h3>Assigned Units</h3>
            <div className="units-list">
              {userUnits.map(unit => (
                <div key={unit.id} className="unit-item">
                  <span className="unit-number">Unit {unit.unit_number}</span>
                  <span className="unit-name">{unit.unit_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to check if time is empty or zero
  const isEmptyTime = (time) => {
    return !time || time === '00:00' || time === '00:00:00' || time === '0000';
  };

  const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  };

  const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const checkDate = new Date(date);
    return checkDate.toDateString() === yesterday.toDateString();
  };

  const handleExportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExportConfirm = () => {
    if (activeSection === 'history') {
      exportEntries(selectedDate);
    } else {
      exportInvoices(selectedDate);
    }
    setShowExportModal(false);
  };

  const exportEntries = (dateType) => {
    const recentEntries = allEntries.filter(entry => 
      dateType === 'today' ? isToday(entry.date) : isYesterday(entry.date)
    );

    if (recentEntries.length === 0) {
      addNotification(`No entries found for ${dateType}`, "info");
      return;
    }

    const formattedEntries = recentEntries.map(entry => ({
      'Serial Number': entry.serialNumber,
      'Date': new Date(entry.date).toLocaleDateString(),
      'Driver Name': entry.driverName,
      'Driver Mobile': entry.driverMobile,
      'Vehicle Number': entry.vehicleNumber,
      'Vehicle Type': entry.vehicleType,
      'Source': entry.source,
      'Loading/Unloading': entry.loadingUnload,
      'Time In': entry.timeIn,
      'Time Out': entry.timeOut,
      'Checked By': entry.checkBy,
      'Remarks': entry.remarks
    }));
    
    handleExportToExcel(formattedEntries, `Gate_Entries_${dateType}`);
    addNotification(`Exported ${recentEntries.length} entries from ${dateType}`, "success");
  };

  const exportInvoices = (dateType) => {
    const recentInvoices = allInvoices.filter(invoice => 
      dateType === 'today' ? isToday(invoice.date) : isYesterday(invoice.date)
    );
  
    if (recentInvoices.length === 0) {
      addNotification(`No invoices found for ${dateType}`, "info");
      return;
    }
  
    // Sort invoices by serial number in ascending order
    recentInvoices.sort((a, b) => a.serialNumber - b.serialNumber);
  
    const formattedInvoices = recentInvoices.map(invoice => {
      const materialsNames = invoice.materials && invoice.materials.length > 0 
        ? invoice.materials.map(material => material.name).join('\n') 
        : invoice.materialName;
      const materialsQuantities = invoice.materials && invoice.materials.length > 0 
        ? invoice.materials.map(material => material.quantity).join('\n') 
        : '';
  
      return {
        'Serial No.': invoice.serialNumber,
        'Date': new Date(invoice.date).toLocaleDateString(),
        'Party Name': invoice.partyName,
        'Bill No.': invoice.billNumber,
        'Description': materialsNames,
        'Quantity': materialsQuantities,
        'Bill Amount': invoice.billAmount,
        'Entry Type': invoice.entryType,
        'Vehicle Type': invoice.vehicleType,
        'Source': invoice.source,
        'Time In': invoice.timeIn,
        'Time Out': invoice.timeOut,
        'Status': !isEmptyTime(invoice.timeOut) ? 'Completed' : 'Pending'
      };
    });
  
    handleExportToExcel(formattedInvoices, `Invoices_${dateType}`);
    addNotification(`Exported ${recentInvoices.length} invoices from ${dateType}`, "success");
  };


  if (userData.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      <div className="notifications-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <FaTruck className="company-logo" />
          <h2>Gate Entry</h2>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar" onClick={toggleProfileDropdown}>
            <FaUser />
          </div>
          <div className="user-info">
            <h3 className="user-name">{userData.name}</h3>
            <p className="user-role">Gate Operator</p>
          </div>
          {/* Profile Dropdown */}
          <div className={`profile-dropdown ${showProfileDropdown ? 'show' : ''}`}>
            <button className="profile-dropdown-item" onClick={() => setShowProfileModal(true)}>
              <FaUser />
              <span>My Profile</span>
            </button>
            <button className="profile-dropdown-item" onClick={() => setShowChangePasswordModal(true)}>
              <FaKey />
              <span>Change Password</span>
            </button>
            <div className="profile-dropdown-divider" />
            <button className="profile-dropdown-item" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="sidebar-menu">
          <button 
            className={`menu-item ${activeSection === 'form' ? 'active' : ''}`}
            onClick={() => handleSectionChange('form')}
          >
            <FaClipboardList className="menu-icon" />
            {isSidebarOpen && <span>Outward Entry</span>}
          </button>

          <button 
            className={`menu-item ${activeSection === 'invoice-form' ? 'active' : ''}`}
            onClick={() => handleSectionChange('invoice-form')}
          >
            <FaFileInvoice className="menu-icon" />
            {isSidebarOpen && <span>Inward Entry</span>}
          </button>

          <button 
            className={`menu-item ${activeSection === 'history' ? 'active' : ''}`}
            onClick={() => handleSectionChange('history')}
          >
            <FaHistory className="menu-icon" />
            {isSidebarOpen && <span>Outward History</span>}
          </button>

          <button 
            className={`menu-item ${activeSection === 'invoices' ? 'active' : ''}`}
            onClick={() => handleSectionChange('invoices')}
          >
            <FaHistory className="menu-icon" />
            {isSidebarOpen && <span>Inward History</span>}
          </button>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="menu-item logout">
            <FaSignOutAlt className="menu-icon" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <div className="content-header">
          <div className="header-title">
            <h1>
              {activeSection === 'form' 
                ? 'Outward Entry' 
                : activeSection === 'invoice-form' 
                  ? 'New Invoice' 
                  : activeSection === 'history' 
                    ? 'My Recent Entries' 
                    : 'My Recent Invoices'}
            </h1>
            <p className="header-subtitle">
              {activeSection === 'form' 
                ? 'Fill in the details below to create a new entry'
                : activeSection === 'invoice-form' 
                  ? 'Fill in the details below to create a new invoice'
                  : activeSection === 'history' 
                    ? 'View and manage your recent entries'
                    : 'View and manage your recent invoices'}
            </p>
          </div>
          {activeSection !== 'form' && activeSection !== 'invoice-form' && (
            <div className="header-actions">
              <div className="search-input-group">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search in all fields..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  className="search-input"
                />
                <button 
                  className="search-button"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : (
                    <>
                      <FaSearch />
                      Search
                    </>
                  )}
                </button>
              </div>
              <div className="action-group">
                <button
                  className="refresh-btn"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <FaSync className={`refresh-icon ${refreshing ? 'spinning' : ''}`} />
                </button>
                <button 
                  className="export-button"
                  onClick={handleExportClick}
                >
                  <FaFileExcel />
                  Export to Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {activeSection === 'form' ? (
          <form onSubmit={handleSubmit} className="form-sections-container">
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="serialNumber">
                    <span className="label-icon">#</span>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    className="form-control"
                    value={formData.serialNumber}
                    onChange={handleChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter serial number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date">
                    <FaCalendarAlt className="label-icon" />
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="driverMobile">
                    <FaPhoneAlt className="label-icon" />
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    id="driverMobile"
                    name="driverMobile"
                    className="form-control"
                    value={formData.driverMobile}
                    onChange={handleDriverMobileChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                  />
                  {formData.driverMobile && formData.driverMobile.length !== 10 && (
                    <small className="validation-error">Mobile number must be exactly 10 digits</small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="driverName">
                    <FaUser className="label-icon" />
                    Driver Name
                  </label>
                  <input
                    type="text"
                    id="driverName"
                    name="driverName"
                    className="form-control"
                    value={formData.driverName}
                    onChange={handleChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter driver's name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="vehicleNumber">
                    <span className="label-icon">#</span>
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    id="vehicleNumber"
                    name="vehicleNumber"
                    className="form-control"
                    value={formData.vehicleNumber}
                    onChange={handleVehicleNumberChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter vehicle number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="vehicleType">
                    <FaTruck className="label-icon" />
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    id="vehicleType"
                    name="vehicleType"
                    className="form-control"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter vehicle type"
                  />
                </div>

                {/* <div className="form-group">
                  <label><FaMapMarkerAlt className="label-icon" /> Source</label>
                  <div className="suggestion-container">
                    <input
                      type="text"
                      name="source"
                      value={formData.source}
                      onChange={handleSourceChange}
                      onFocus={() => formData.source && handleSourceChange({ target: { value: formData.source } })}
                      required
                      disabled={submitState.loading}
                      placeholder="Enter source location"
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
                </div> */}

<div className="form-group">
  <label><FaMapMarkerAlt className="label-icon" /> Source</label>
  <div className="suggestion-container">
    <select
      name="source"
      value={formData.source}
      onChange={handleSourceChange}
      required
      disabled={submitState.loading}
      placeholder="Select source location"
    >
      <option value="" disabled>Select source location</option>
      <option value="Baddi Unit 1">Baddi Unit 1</option>
      <option value="Baddi Unit 2">Baddi Unit 2</option>
      <option value="Baddi Unit 3">Baddi Unit 3</option>
    </select>
  </div>
</div>

{ <div className="form-group">
  <label htmlFor="loadingUnload">
    <FaTruck className="label-icon" />
    Purpose
  </label>
  <select
    id="loadingUnload"
    name="loadingUnload"
    className="form-control"
    value={formData.loadingUnload}
    onChange={handlePurposeChange}
    required
    disabled={submitState.loading}
  >
    <option value="">Select Purpose</option>
    <option value="Sale">Sale</option>
    <option value="Inter Unit Transfer">Inter Unit Transfer</option>
    <option value="RGP">RGP</option>
    <option value="Other">Other</option>
  </select>
</div> }
{formData.loadingUnload === 'Other' && (
  <div className="form-group">
    <label htmlFor="otherPurpose">
      <FaTruck className="label-icon" />
      Specify Other Purpose
    </label>
    <input
      type="text"
      id="otherPurpose"
      name="otherPurpose"
      className="form-control"
      value={otherPurpose}
      onChange={(e) => setOtherPurpose(e.target.value)}
      required
      disabled={submitState.loading}
      placeholder="Enter purpose"
    />
  </div>
)}

                <div className="form-group">
                  <label htmlFor="timeIn">
                    <FaClock className="label-icon" />
                    Time In
                  </label>
                  <input
                    type="time"
                    id="timeIn"
                    name="timeIn"
                    className="form-control"
                    value={formData.timeIn}
                    readOnly // Make the field non-editable
                  />
                </div>

                {/* <div className="form-group">
                  <label htmlFor="timeOut">
                    <FaClock className="label-icon" />
                    Time Out
                  </label>
                  <input
                    type="time"
                    id="timeOut"
                    name="timeOut"
                    className="form-control"
                    value={formData.timeOut}
                    onChange={handleChange}
                    disabled={submitState.loading}
                  />
                </div> */}

                <div className="form-group">
                  <label htmlFor="checkBy">
                    <FaUser className="label-icon" />
                    Checked By
                  </label>
                  <input
                    type="text"
                    id="checkBy"
                    name="checkBy"
                    className="form-control"
                    value={formData.checkBy}
                    onChange={handleChange}
                    required
                    disabled={submitState.loading}
                    placeholder="Enter checker's name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="remarks">
                    <FaClipboardList className="label-icon" />
                    Remarks
                  </label>
                  <input
                    type="text"
                    id="remarks"
                    name="remarks"
                    className="form-control"
                    value={formData.remarks}
                    onChange={handleChange}
                    disabled={submitState.loading}
                    placeholder="Enter your remarks"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button" 
                disabled={submitState.loading}
              >
                {submitState.loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>Submit Entry</span>
                  </>
                )}
              </button>
            </div>

            {submitState.error && (
              <div className="message-banner error">
                <FaExclamationTriangle />
                <span>{submitState.error}</span>
              </div>
            )}
            
            {submitState.success && (
              <div className="message-banner success">
                <FaCheck />
                <span>Vehicle entry recorded successfully!</span>
              </div>
            )}
          </form>
        ) : activeSection === 'invoice-form' ? (
          <InvoiceForm
            onSubmit={handleSubmitInvoice}
            onNotification={addNotification}
            isEditing={false}
          />
        ) : (
          <div className="entries-section">
            <div className="section-title">
              {activeSection === 'history' ? (
                <>
                  <FaHistory className="section-icon" />
                  <h2>Outward History</h2>
                </>
              ) : (
                <>
                  <FaFileInvoice className="section-icon" />
                  <h2>Inward History</h2>
                </>
              )}
            </div>

            <div className="table-section">
              {activeSection === 'history' ? (
                <div className="table-container">
                  <table className="entries-table">
                    <thead>
                      <tr>
                        <th>Serial No.</th>
                        <th>Date</th>
                        <th>Driver Mobile</th>
                        <th>Driver Name</th>
                        <th>Vehicle Number</th>
                        <th>Vehicle Type</th>
                        <th>Source</th>
                        <th>Purpose</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Checked By</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entriesData.entries
                        .filter(entry => {
                          const searchTerm = filters.search.toLowerCase();
                          return (
                            entry.serialNumber?.toString().toLowerCase().includes(searchTerm) ||
                            entry.date?.toLowerCase().includes(searchTerm) ||
                            entry.driverName?.toLowerCase().includes(searchTerm) ||
                            entry.driverMobile?.toLowerCase().includes(searchTerm) ||
                            entry.vehicleNumber?.toLowerCase().includes(searchTerm) ||
                            entry.vehicleType?.toLowerCase().includes(searchTerm) ||
                            entry.source?.toLowerCase().includes(searchTerm) ||
                            entry.loadingUnload?.toLowerCase().includes(searchTerm) ||
                            entry.timeIn?.toLowerCase().includes(searchTerm) ||
                            entry.timeOut?.toLowerCase().includes(searchTerm) ||
                            entry.checkBy?.toLowerCase().includes(searchTerm) ||
                            entry.remarks?.toLowerCase().includes(searchTerm)
                          );
                        })
                        .slice((entriesData.page - 1) * 10, entriesData.page * 10)
                        .map((entry) => (
                          <tr key={entry.id}>
                            <td>{entry.serialNumber}</td>
                            <td>{new Date(entry.date).toLocaleDateString()}</td> 
                            <td>{entry.driverMobile}</td>
                            <td>{entry.driverName}</td>
                            <td>{entry.vehicleNumber}</td>
                            <td>{entry.vehicleType}</td>
                            <td>{entry.source}</td>
                            <td>{entry.loadingUnload} </td>
                            <td>{entry.timeIn}</td>
                            <td>{entry.timeOut}</td>
                            <td>{entry.checkBy}</td>
                            <td>{entry.remarks}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-container">
                  <table className="invoices-table">
                    <thead>
                      <tr>
                        <th>Serial Number</th>
                        <th>Date</th>
                        <th>Party Name</th>
                        <th>Bill Number</th>
                        <th>Descriptions</th>
                        <th>Bill Amount</th>
                        <th>Entry Type</th>
                        <th>Vehicle Type</th>
                        <th>Source</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
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
                          <td>{invoice.billAmount}</td>
                          <td>{invoice.entryType}</td>
                          <td>{invoice.vehicleType}</td>
                          <td>{invoice.source}</td>
                          <td>{invoice.timeIn}</td>
                          <td>{isEmptyTime(invoice.timeOut) ? '-' : invoice.timeOut}</td>
                          <td>
                            {!isEmptyTime(invoice.timeOut) ? (
                              <span className="status-completed">Completed</span>
                            ) : (
                              <span className="status-pending">Pending</span>
                            )}
                          </td>
                          <td>
                            {isEmptyTime(invoice.timeOut) && (
                              editingInvoice?.id === invoice.id ? (
                                <div className="time-out-input-group">
                                  <input
                                    type="time"
                                    defaultValue={invoice.timeIn}
                                    min={invoice.timeIn}
                                    onChange={(e) => handleTimeOutChange(invoice.id, e.target.value)}
                                    className="time-input"
                                  />
                                  <div className="time-out-actions">
                                    <button
                                      className="action-button save-button"
                                      onClick={() => handleTimeOutUpdate(invoice.id, timeoutValues[invoice.id])}
                                      disabled={!timeoutValues[invoice.id]}
                                    >
                                      <FaCheck /> Save
                                    </button>
                                    <button
                                      className="action-button cancel-button"
                                      onClick={() => {
                                        setEditingInvoice(null);
                                        setTimeoutValues(prev => {
                                          const newValues = { ...prev };
                                          delete newValues[invoice.id];
                                          return newValues;
                                        });
                                      }}
                                    >
                                      <FaTimes />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="action-button update-button"
                                  onClick={() => setEditingInvoice(invoice)}
                                >
                                  <FaClock /> Update
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="table-footer">
                {activeSection === 'history' ? (
                  entriesData.entries.length === 0 ? (
                    <div className="no-entries">
                      <FaDatabase className="no-data-icon" />
                      <p>No entries found</p>
                    </div>
                  ) : (
                    <div className="pagination">
                      <div className="pagination-info">
                        <span>
                          Showing {Math.min(((entriesData.page - 1) * 10) + 1, entriesData.entries.length)} to{' '}
                          {Math.min(entriesData.page * 10, entriesData.entries.length)} of{' '}
                          {entriesData.entries.length} entries
                        </span>
                      </div>
                      <div className="pagination-controls">
                        <button
                          onClick={() => handlePageChange(entriesData.page - 1)}
                          disabled={entriesData.page === 1}
                          className="pagination-button"
                        >
                          <FaChevronLeft /> Previous
                        </button>
                        <span className="page-info">
                          Page {entriesData.page} of {Math.ceil(entriesData.entries.length / 10)}
                        </span>
                        <button
                          onClick={() => handlePageChange(entriesData.page + 1)}
                          disabled={entriesData.page >= Math.ceil(entriesData.entries.length / 10)}
                          className="pagination-button"
                        >
                          Next <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  invoices.length === 0 && (
                    <div className="no-entries">
                      <FaDatabase className="no-data-icon" />
                      <p>No invoices found</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>My Profile</h2>
              <button className="close-button" onClick={() => setShowProfileModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {renderProfile()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Change Password</h2>
              <button 
                className="close-button"
                onClick={() => setShowChangePasswordModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-form">
              {passwordError && <div className="alert alert-error">{passwordError}</div>}
              {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="save-button"
                  onClick={handleChangePassword}
                >
                  Change Password
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowChangePasswordModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Export {activeSection === 'history' ? 'Gate Entries' : 'Invoices'}</h3>
            <p>Select which entries to export:</p>
            <div className="export-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="exportDate"
                  value="today"
                  checked={selectedDate === 'today'}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                Today's Entries
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="exportDate"
                  value="yesterday"
                  checked={selectedDate === 'yesterday'}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                Yesterday's Entries
              </label>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-button cancel"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button confirm"
                onClick={handleExportConfirm}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
