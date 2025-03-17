import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Dashboard.css';
import { 
  FaUser, 
  FaTruck,
  FaSignOutAlt, 
  FaSearch,
  FaDownload, 
  FaSync,
  FaEdit,
  FaTrash,
  FaTimes,
  FaClipboardList,
  FaUsers,
  FaClock,
  FaExclamationTriangle,
  FaDatabase,
  FaUserPlus,
  FaUserCheck,
  FaUserFriends,
  FaFilter,
  FaChevronLeft,
  FaKey,
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
  FaBars,
  FaFileInvoice
} from 'react-icons/fa';
import Notification from './Notification';
import * as XLSX from 'xlsx';
import InvoicesList from './invoices/InvoicesList';

function AdminDashboard() {
  const [userData, setUserData] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    created_at: '',
    loading: true,
    error: null
  });

  const [entriesData, setEntriesData] = useState({
    entries: [], 
    loading: true,
    error: null,
    totalEntries: 0,
    currentPage: 1,
    totalPages: 1
  });

  // const columns = useMemo(() => [
  //   {
  //     Header: 'Serial Number',
  //     accessor: 'serialNumber',
  //   },
  //   {
  //     Header: 'Date',
  //     accessor: 'date',
  //     Cell: ({ value }) => new Date(value).toLocaleDateString()
  //   },
  //   {
  //     Header: 'Driver Name',
  //     accessor: 'driverName',
  //   },
  //   {
  //     Header: 'Vehicle Number',
  //     accessor: 'vehicleNumber',
  //   },
  //   {
  //     Header: 'Vehicle Type',
  //     accessor: 'vehicleType',
  //   },
  //   {
  //     Header: 'Source',
  //     accessor: 'source',
  //   },
  //   {
  //     Header: 'Loading/Unload',
  //     accessor: 'loadingUnload',
  //   },
  //   {
  //     Header: 'Time In',
  //     accessor: 'timeIn',
  //   },
  //   {
  //     Header: 'Time Out',
  //     accessor: 'timeOut',
  //   },
  //   {
  //     Header: 'Check By',
  //     accessor: 'checkBy',
  //   },
  //   {
  //     Header: 'Remarks',
  //     accessor: 'remarks',
  //   },
  //   {
  //     Header: 'Recorded By',
  //     accessor: 'recordedBy',
  //     Cell: ({ value }) => (
  //       <div className="recorded-by">
  //         {value}
  //       </div>
  //     )
  //   }
  // ], []);

  const [usersData, setUsersData] = useState({
    users: [],
    loading: true,
    error: null
  });

  const [stats, setStats] = useState({
    totalEntries: 0,
    todayEntries: 0,
    totalUsers: 0,
    pendingEntries: 0,
    activeUsers: 0
  });

  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'users', 'entries', 'invoices'

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    serialNumber: '',
    date: '',
    driverName: '',
    driverMobile: '',
    vehicleNumber: '',
    vehicleType: '',
    source: '',
    loadingUnload: '',
    timeIn: '',
    timeOut: '',
    checkBy: '',
    remarks: '',
    recordedBy: ''
  });

  const [filters, setFilters] = useState({
    search: '',
    vehicleType: '',
    source: '',
    loadingStatus: '',
    startDate: null,
    endDate: null
  });

  const [userFilters, setUserFilters] = useState({
    search: '',
    role: ''
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalMode, setUserModalMode] = useState('add'); // 'add' or 'edit'
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    units: []
  });

  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    admin: 0,
    user: 0
  });

  const [columnFilters, setColumnFilters] = useState({
    date: [],
    driverName: [],
    vehicleType: [],
    source: [],
    loadingUnload: [],
    checkBy: [],  
    recordedBy: []
  });

  const [activeFilter, setActiveFilter] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [notifications, setNotifications] = useState([]);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1
  });

  const [filteredEntries, setFilteredEntries] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    serialNumber: true,
    date: true,
    driverName: true,
    driverMobile: true,
    vehicleNumber: true,
    vehicleType: true,
    source: true,
    loadingUnload: true,
    timeIn: true,
    timeOut: true,
    checkBy: true,
    remarks: true,
    recordedBy: true
  });

  const exportFields = [
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'date', label: 'Date' },
    { key: 'driverName', label: 'Driver Name' },
    { key: 'driverMobile', label: 'Driver Mobile' },
    { key: 'vehicleNumber', label: 'Vehicle Number' },
    { key: 'vehicleType', label: 'Vehicle Type' },
    { key: 'source', label: 'Source' },
    { key: 'loadingUnload', label: 'Loading/Unload' },
    { key: 'timeIn', label: 'Time In' },
    { key: 'timeOut', label: 'Time Out' },
    { key: 'checkBy', label: 'Check By' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'recordedBy', label: 'Recorded By' }
  ];

  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    units: []
  });

  const [showUnitFields, setShowUnitFields] = useState(true);

  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [invoices, setInvoices] = useState([]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []); // Initial data fetch

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch all data in parallel
      const [entriesResponse, usersResponse, statsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/entries`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/api/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setEntriesData({
        entries: entriesResponse.data || [], 
        loading: false,
        error: null,
        totalEntries: entriesResponse.data.length,
        currentPage: 1,
        totalPages: Math.ceil(entriesResponse.data.length / 10)
      });

      setUsersData({
        users: usersResponse.data || [],
        loading: false,
        error: null
      });

      setStats({
        totalEntries: statsResponse.data.totalEntries || 0,
        todayEntries: statsResponse.data.todayEntries || 0,
        totalUsers: statsResponse.data.totalUsers || 0,
        pendingEntries: statsResponse.data.pendingEntries || 0,
        activeUsers: statsResponse.data.activeUsers || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.message || 'Error fetching data';
      setEntriesData(prev => ({
        ...prev,
        entries: [], 
        loading: false,
        error: errorMessage
      }));
      setUsersData(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getToken = useCallback(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
      localStorage.clear();
      navigate('/login');
      return null;
    }
    return token;
  }, [navigate]);

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
      console.error('Error fetching user profile:', error);
      setUserData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      }));
      addNotification(error.response?.data?.message || 'Failed to fetch profile', 'error');
    }
  }, [getToken]);

  const fetchEntries = useCallback(async () => {
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    setEntriesData(prev => ({
      ...prev,
      loading: true,
      error: null
    }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntriesData(prev => ({
        ...prev,
        entries: response.data || [], 
        loading: false,
        error: null,
        totalEntries: response.data.length,
        currentPage: 1,
        totalPages: Math.ceil(response.data.length / 10)
      }));
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntriesData(prev => ({
        ...prev,
        entries: [], 
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch entries'
      }));
      addNotification(error.response?.data?.message || 'Failed to fetch entries', 'error');
    }
  }, [getToken]);

  const fetchUsers = useCallback(async () => {
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    setUsersData(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersData({
        users: response.data,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsersData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch users'
      }));
      addNotification(error.response?.data?.message || 'Failed to fetch users', 'error');
    }
  }, [getToken]);

  useEffect(() => {
    // Check for login success notification
    const showLoginSuccess = localStorage.getItem('showLoginSuccess');
    if (showLoginSuccess === 'true') {
      addNotification('Admin logged in successfully', 'success');
      localStorage.removeItem('showLoginSuccess');
    }

    fetchUserProfile();
    fetchEntries();
    fetchUsers();
  }, [fetchUserProfile, fetchEntries, fetchUsers]);

  useEffect(() => {
    if (usersData?.users) {
      setUserStats({
        total: usersData.users.length,
        active: usersData.users.filter(user => user.status === 'active').length,
        admin: usersData.users.filter(user => user.role === 'admin').length,
        user: usersData.users.filter(user => user.role === 'user').length
      });
    }
  }, [usersData?.users]);

  useEffect(() => {
    if (entriesData.entries) {
      const filtered = entriesData.entries.filter(entry => {
        return (
          (!filters.date || entry.date.includes(filters.date)) &&
          (!filters.vehicleType || entry.vehicleType === filters.vehicleType) &&
          (!filters.source || entry.source === filters.source) &&
          (!filters.loadingUnload || entry.loadingUnload === filters.loadingUnload) &&
          (!filters.checkBy || entry.checkBy === filters.checkBy) &&
          (!filters.recordedBy || entry.recordedBy === filters.recordedBy) &&
          (!columnFilters.date.length || columnFilters.date.includes(entry.date)) &&
          (!columnFilters.vehicleType.length || columnFilters.vehicleType.includes(entry.vehicleType)) &&
          (!columnFilters.source.length || columnFilters.source.includes(entry.source)) &&
          (!columnFilters.loadingUnload.length || columnFilters.loadingUnload.includes(entry.loadingUnload)) &&
          (!columnFilters.checkBy.length || columnFilters.checkBy.includes(entry.checkBy)) &&
          (!columnFilters.recordedBy.length || columnFilters.recordedBy.includes(entry.recordedBy))
        );
      });
      setFilteredEntries(filtered);
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalPages: Math.ceil(filtered.length / prev.itemsPerPage)
      }));
    }
  }, [entriesData.entries, filters, columnFilters]);

  useEffect(() => {
    if (filteredEntries.length > 0) {
      setPagination(prev => ({
        ...prev,
        totalPages: Math.ceil(filteredEntries.length / prev.itemsPerPage)
      }));
    }
  }, [filteredEntries]);

  useEffect(() => {
    console.log('Entry Data Sample:', entriesData.entries[0]);
  }, [entriesData.entries]);

  // const formatTime = (timeStr) => {
  //   if (!timeStr) return '';
    
  //   // If timeStr is already in HH:mm:ss format, convert to 12-hour format
  //   const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  //   if (timeMatch) {
  //     const [_, hours, minutes] = timeMatch;
  //     const hour = parseInt(hours, 10);
  //     const ampm = hour >= 12 ? 'PM' : 'AM';
  //     const hour12 = hour % 12 || 12;
  //     return `${hour12}:${minutes} ${ampm}`;
  //   }
    
  //   return timeStr; // Return original if not in expected format
  // };

  const handleColumnFilterChange = (column, value, checked) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: checked 
        ? [...prev[column], value]
        : prev[column].filter(item => item !== value)
    }));
  };

  const handleFilterClick = (filterName, event) => {
    event.stopPropagation();
    
    if (activeFilter === filterName) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filterName);
      // Position the dropdown below the filter icon
      const filterIcon = event.currentTarget;
      const rect = filterIcon.getBoundingClientRect();
      const dropdown = document.querySelector('.column-filter-dropdown');
      if (dropdown) {
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const filterContainers = document.querySelectorAll('.filter-container');
      const dropdowns = document.querySelectorAll('.column-filter-dropdown');
      let clickedInside = false;
      
      filterContainers.forEach(container => {
        if (container.contains(event.target)) {
          clickedInside = true;
        }
      });

      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedInside = true;
        }
      });

      if (!clickedInside) {
        setActiveFilter(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleExportToExcel = () => {
    setShowExportModal(true);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addNotification('Please log in to export data', 'error');
        return;
      }

      // Show loading notification
      addNotification('Preparing export...', 'info');

      // Fetch all entries first
      const response = await axios.get(`${API_BASE_URL}/api/all-entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allEntries = response.data.entries || [];

      if (allEntries.length === 0) {
        addNotification('No entries to export', 'warning');
        return;
      }

      // Map the entries with selected fields
      const selectedEntries = allEntries.map(entry => {
        const exportEntry = {};
        Object.keys(selectedFields).forEach(field => {
          if (selectedFields[field]) {
            switch (field) {
              case 'date':
                exportEntry['Date'] = entry.date || 'N/A';
                break;
              case 'serialNumber':
                exportEntry['Serial Number'] = entry.serialNumber || 'N/A';
                break;
              case 'driverName':
                exportEntry['Driver Name'] = entry.driverName || 'N/A';
                break;
              case 'driverMobile':
                exportEntry['Driver Mobile'] = entry.driverMobile || 'N/A';
                break;
              case 'vehicleNumber':
                exportEntry['Vehicle Number'] = entry.vehicleNumber || 'N/A';
                break;
              case 'vehicleType':
                exportEntry['Vehicle Type'] = entry.vehicleType || 'N/A';
                break;
              case 'source':
                exportEntry['Source'] = entry.source || 'N/A';
                break;
              case 'loadingUnload':
                exportEntry['Loading/Unload'] = entry.loadingUnload || 'N/A';
                break;
              case 'timeIn':
                exportEntry['Time In'] = entry.timeIn || 'N/A';
                break;
              case 'timeOut':
                exportEntry['Time Out'] = entry.timeOut || 'N/A';
                break;
              case 'checkBy':
                exportEntry['Check By'] = entry.checkBy || 'N/A';
                break;
              case 'remarks':
                exportEntry['Remarks'] = entry.remarks || 'N/A';
                break;
              case 'recordedBy':
                exportEntry['Recorded By'] = entry.recorded_by || entry.recordedBy || 'N/A';
                break;
              default:
                exportEntry[field] = entry[field] || 'N/A';
            }
          }
        });
        return exportEntry;
      });

      const ws = XLSX.utils.json_to_sheet(selectedEntries);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vehicle Entries");
      
      // Auto-size columns
      const colWidths = [];
      selectedEntries.forEach(row => {
        Object.keys(row).forEach((key, i) => {
          const cellLength = String(row[key]).length;
          colWidths[i] = Math.max(colWidths[i] || 0, cellLength, key.length);
        });
      });
      
      ws['!cols'] = colWidths.map(w => ({ wch: w + 2 }));
      
      XLSX.writeFile(wb, "vehicle_entries.xlsx");
      setShowExportModal(false);
      addNotification('Export completed successfully!', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to export data. Please try again.';
      addNotification(errorMessage, 'error');
    }
  };

  const handleLogout = () => {
    addNotification('Successfully logged out', 'success');
    setTimeout(() => {
      localStorage.clear();
      navigate('/login', { replace: true });
    }, 1000);
  };

  const handleEdit = (entry) => {
    const formattedDate = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';
    
    setEditFormData({
      id: entry.id,
      serialNumber: entry.serialNumber,
      date: formattedDate,
      driverName: entry.driverName || '',
      driverMobile: entry.driverMobile || '',
      vehicleNumber: entry.vehicleNumber || '',
      vehicleType: entry.vehicleType || '',
      source: entry.source || '',
      loadingUnload: entry.loadingUnload || '',
      timeIn: entry.timeIn || '',
      timeOut: entry.timeOut || '',
      checkBy: entry.checkBy || '',
      remarks: entry.remarks || '',
      recordedBy: entry.recordedBy || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const token = getToken();
    if (!token) {
      addNotification('Session expired. Please login again', 'error');
      navigate('/login');
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/api/entries/${editFormData.id}`, {
        ...editFormData,
        date: editFormData.date // Keep the date as is
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        addNotification('Entry updated successfully', 'success');
        setShowEditModal(false);
        fetchEntries(); // Refresh the entries list
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      addNotification(error.response?.data?.message || 'Failed to update entry', 'error');
    }
  };

  const handleDelete = (entry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    const token = getToken();
    if (!token) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/entries/${selectedEntry.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowDeleteModal(false);
      fetchEntries();
      addNotification('Entry deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting entry:', error);
      addNotification('Failed to delete entry', 'error');
    }
  };

  // const handleFilterChange = (name, value) => {
  //   setFilters(prev => ({
  //     ...prev,
  //     [name]: value
  //   }));
  // };

  const handleUserFilterChange = (field, value) => {
    setUserFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddUser = async () => {
    try {
      // Validate required fields
      if (!newUserData.name || !newUserData.email || !newUserData.password) {
        addNotification('Please fill in all required fields', 'error');
        return;
      }

      // Validate units if role is user
      if (newUserData.role === 'user' && newUserData.units.length === 0) {
        addNotification('Please add at least one unit for the user', 'error');
        return;
      }

      // Validate unit fields
      if (newUserData.role === 'user') {
        const invalidUnits = newUserData.units.some(unit => !unit.unit_number || !unit.unit_name);
        if (invalidUnits) {
          addNotification('Please fill in all unit details', 'error');
          return;
        }
      }

      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/users`,
        newUserData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.status === 201) {
        addNotification('User created successfully', 'success');
        setShowAddUserModal(false);
        // Reset form
        setNewUserData({
          name: '',
          email: '',
          password: '',
          role: 'user',
          units: []
        });
        // Refresh user list
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.message || 'Error creating user';
      addNotification(errorMessage, 'error');
    }
  };

  const handleEditUser = async (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      units: user.units || []
    });
    setUserModalMode('edit');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      const token = getToken();
      await axios.delete(`${API_BASE_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update users list
      fetchUsers();
      addNotification('User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting user';
      addNotification(errorMessage, 'error');
    }
  };

  const confirmDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteUserModal(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      handleDeleteUser(userToDelete.id);
    }
    setShowDeleteUserModal(false);
    setUserToDelete(null);
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = getToken();
      if (!token) return;

      if (userModalMode === 'add') {
        const response = await axios.post(`${API_BASE_URL}/api/users`, userForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 201) {
          setUsersData(prev => ({
            ...prev,
            users: [...prev.users, response.data]
          }));
          addNotification('User added successfully', 'success');
          setShowUserModal(false);
          resetUserForm();
        }
      } else {
        // For edit, only send password if it's been changed
        const response = await axios.put(
          `${API_BASE_URL}/api/users/${selectedUser.id}`, 
          userForm,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.status === 200) {
          setUsersData(prev => ({
            ...prev,
            users: prev.users.map(user => 
              user.id === selectedUser.id ? response.data : user
            )
          }));
          addNotification('User updated successfully', 'success');
          setShowUserModal(false);
          resetUserForm();
        }
      }
      
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save user';
      addNotification(errorMessage, 'error');
    }
  };

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'user',
      units: []
    });
  };

  const handleAddUnit = () => {
    if (userModalMode === 'add') {
      setNewUserData(prev => ({
        ...prev,
        units: [...prev.units, { unit_number: '', unit_name: '' }]
      }));
    } else {
      setUserForm(prev => ({
        ...prev,
        units: [...prev.units, { unit_number: '', unit_name: '' }]
      }));
    }
  };

  const handleRemoveUnit = (index) => {
    if (userModalMode === 'add') {
      setNewUserData(prev => ({
        ...prev,
        units: prev.units.filter((_, i) => i !== index)
      }));
    } else {
      setUserForm(prev => ({
        ...prev,
        units: prev.units.filter((_, i) => i !== index)
      }));
    }
  };

  const handleUnitChange = (index, field, value) => {
    if (userModalMode === 'add') {
      setNewUserData(prev => ({
        ...prev,
        units: prev.units.map((unit, i) => 
          i === index ? { ...unit, [field]: value } : unit
        )
      }));
    } else {
      setUserForm(prev => ({
        ...prev,
        units: prev.units.map((unit, i) => 
          i === index ? { ...unit, [field]: value } : unit
        )
      }));
    }
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    if (userModalMode === 'add') {
      setNewUserData(prev => ({
        ...prev,
        role: newRole,
        units: newRole === 'admin' ? [] : prev.units
      }));
      setShowUnitFields(newRole === 'user');
    } else {
      setUserForm(prev => ({
        ...prev,
        role: newRole,
        units: newRole === 'admin' ? [] : prev.units
      }));
    }
  };

  const renderUserStats = () => {
    return (
      <div className="user-stats-grid">
        <div className="user-stat-card">
          <FaUsers className="stat-icon" />
          <h3>Total Users</h3>
          <div className="stat-value">{userStats.total}</div>
        </div>
        <div className="user-stat-card">
          <FaUserCheck className="stat-icon" />
          <h3>Admin Users</h3>
          <div className="stat-value">{userStats.admin}</div>
        </div>
        <div className="user-stat-card">
          <FaUserFriends className="stat-icon" />
          <h3>Regular Users</h3>
          <div className="stat-value">{userStats.user}</div>
        </div>
      </div>
    );
  };

  const renderUserManagement = () => {
    if (activeSection !== 'users') return null;

    return (
      <div className="users-section">
        <div className="section-header">
          <div className="header-title">
            <h1>User Management</h1>
            <p className="header-subtitle">Manage system users and their roles</p>
          </div>
          <div className="header-actions">
            <button 
              className="primary-button" 
              onClick={handleShowAddUser}
            >
              <FaUserPlus />
              Add New User
            </button>
          </div>
        </div>

        {renderUserStats()}

        <div className="filters-bar">
          <div className="filters-group">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={userFilters.search}
                onChange={(e) => handleUserFilterChange('search', e.target.value)}
              />
            </div>
            <select
              value={userFilters.role}
              onChange={(e) => handleUserFilterChange('role', e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        <div className="users-list">
          {filteredUsers.map(user => (
            <div key={user.id} className="user-list-item">
              <div className="user-list-avatar">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-list-info">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
              <div className={`user-list-role ${user.role}`}>
                {user.role === 'admin' ? 'Admin' : 'User'}
              </div>
              <div className="user-list-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEditUser(user)}
                  title="Edit User"
                >
                  <FaEdit />
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => confirmDeleteUser(user)}
                  title="Delete User"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        {usersData.loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading users...</p>
          </div>
        )}

        {usersData.error && (
          <div className="message-banner error">
            <FaExclamationTriangle />
            {usersData.error}
          </div>
        )}

        {!usersData.loading && filteredUsers.length === 0 && (
          <div className="empty-state">
            <FaUsers className="empty-icon" />
            <h3>No Users Found</h3>
            <p>Try adjusting your filters or add a new user</p>
          </div>
        )}

        {/* User Edit/Add Modal */}
        {showUserModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>{userModalMode === 'add' ? 'Add New User' : 'Edit User'}</h2>
                <button 
                  className="close-button"
                  onClick={() => {
                    setShowUserModal(false);
                    resetUserForm();
                  }}
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleUserFormSubmit} className="modal-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={userForm.name}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Password {userModalMode === 'edit' && '(Leave blank to keep unchanged)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleUserFormChange}
                    required={userModalMode === 'add'}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={userForm.role}
                    onChange={handleUserFormChange}
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {userForm.role === 'user' && (
                  <div className="units-section">
                    <div className="units-header">
                      <h3>Assigned Units</h3>
                      <button type="button" className="btn btn-primary" onClick={handleAddUnit}>
                        Add Unit
                      </button>
                    </div>
                    {userForm.units && userForm.units.map((unit, index) => (
                      <div key={index} className="unit-fields">
                        <div className="unit-inputs">
                          <div className="form-group">
                            <label>Unit Number</label>
                            <input
                              type="number"
                              value={unit.unit_number}
                              onChange={(e) => handleUnitChange(index, 'unit_number', e.target.value)}
                              className="form-control"
                              min="1"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Unit Name</label>
                            <input
                              type="text"
                              value={unit.unit_name}
                              onChange={(e) => handleUnitChange(index, 'unit_name', e.target.value)}
                              className="form-control"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger remove-unit"
                          onClick={() => handleRemoveUnit(index)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="modal-actions">
                  <button type="submit" className="save-button">
                    {userModalMode === 'add' ? 'Add User' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowUserModal(false);
                      resetUserForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAddUserModal = () => {
    if (!showAddUserModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>Add New User</h2>
            <button className="close-button" onClick={() => setShowAddUserModal(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newUserData.name}
                onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={newUserData.role}
                onChange={handleRoleChange}
                className="form-control"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {showUnitFields && (
              <div className="units-section">
                <div className="units-header">
                  <h3>Assigned Units</h3>
                  <button type="button" className="btn btn-primary" onClick={handleAddUnit}>
                    Add Unit
                  </button>
                </div>
                {newUserData.units.map((unit, index) => (
                  <div key={index} className="unit-fields">
                    <div className="unit-inputs">
                      <div className="form-group">
                        <label>Unit Number</label>
                        <input
                          type="number"
                          value={unit.unit_number}
                          onChange={(e) => handleUnitChange(index, 'unit_number', e.target.value)}
                          className="form-control"
                          min="1"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Unit Name</label>
                        <input
                          type="text"
                          value={unit.unit_name}
                          onChange={(e) => handleUnitChange(index, 'unit_name', e.target.value)}
                          className="form-control"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger remove-unit"
                      onClick={() => handleRemoveUnit(index)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddUser}>
              Add User
            </button>
          </div>
        </div>
      </div>
    );
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
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

  useEffect(() => {
    if (usersData?.users) {
      const filtered = usersData.users.filter(user => {
        // Safely handle potentially undefined values
        const name = user?.name || '';
        const username = user?.username || '';
        const email = user?.email || '';
        const role = user?.role || '';
        const searchTerm = userFilters.search.toLowerCase();

        const matchesSearch = !userFilters.search || 
                          name.toLowerCase().includes(searchTerm) ||
                          username.toLowerCase().includes(searchTerm) ||
                          email.toLowerCase().includes(searchTerm);
                          
        const matchesRole = !userFilters.role || role === userFilters.role;
        
        return matchesSearch && matchesRole;
      });
      setFilteredUsers(filtered);
    }
  }, [usersData?.users, userFilters]);

  const getCurrentPageData = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  };

  const handlePageChange = async (newPage) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/entries?page=${newPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEntriesData({
        entries: response.data || [],
        loading: false,
        error: null,
        totalEntries: response.data.length,
        currentPage: 1,
        totalPages: Math.ceil(response.data.length / 10)
      });
    } catch (error) {
      console.error('Error changing page:', error);
      const errorMessage = error.response?.data?.message || 'Error changing page';
      setEntriesData(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  };

  // const getFilterOptions = useMemo(() => {
  //   if (!entriesData.entries) return {
  //     vehicleTypes: [],
  //     sources: []
  //   };

  //   return {
  //     vehicleTypes: [...new Set(entriesData.entries.map(entry => entry.vehicleType))]
  //       .filter(Boolean)
  //       .map(type => ({ text: type, value: type })),
  //     sources: [...new Set(entriesData.entries.map(entry => entry.source))]
  //       .filter(Boolean)
  //       .map(source => ({ text: source, value: source }))
  //   };
  // }, [entriesData.entries]);

  const getUniqueValues = useMemo(() => {
    if (!entriesData.entries || entriesData.entries.length === 0) {
      return {
        date: [],
        driverName: [],
        vehicleType: [],
        source: [],
        loadingUnload: [],
        checkBy: [],
        recordedBy: []
      };
    }

    const unique = {
      date: [...new Set(entriesData.entries.map(entry => entry.date))].sort(),
      driverName: [...new Set(entriesData.entries.map(entry => entry.driverName))].sort(),
      vehicleType: [...new Set(entriesData.entries.map(entry => entry.vehicleType))].sort(),
      source: [...new Set(entriesData.entries.map(entry => entry.source))].sort(),
      loadingUnload: [...new Set(entriesData.entries.map(entry => entry.loadingUnload))].sort(),
      checkBy: [...new Set(entriesData.entries.map(entry => entry.checkBy || '').filter(Boolean))].sort(),
      recordedBy: [...new Set(entriesData.entries.map(entry => entry.recordedBy || '').filter(Boolean))].sort()
    };
    return unique;
  }, [entriesData.entries]);

  const fetchInvoices = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      addNotification('Failed to fetch invoices', 'error');
    }
  }, [getToken]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (userData.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const renderDashboardSection = () => (
    <div className="dashboard-section">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FaClipboardList />
          </div>
          <div className="stat-details">
            <h3>Total Entries</h3>
            <p>{stats.totalEntries}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon today">
            <FaClock />
          </div>
          <div className="stat-details">
            <h3>Today's Entries</h3>
            <p>{stats.todayEntries}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon users">
            <FaUsers />
          </div>
          <div className="stat-details">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        </div>
      </div>

      <div className="recent-entries-section">
        <div className="section-header">
          <h3>Recent Entries</h3>
        </div>
        <div className="recent-entries-container">
          <table className="recent-entries-table">
            <thead>
              <tr>
                <th className="date-column">Date</th>
                <th className="driver-column">Driver Name</th>
                <th className="vehicle-column">Vehicle Number</th>
                <th className="source-column">Source</th>
                <th className="status-column">Status</th>
              </tr>
            </thead>
            <tbody>
              {entriesData.entries.slice(0, 10).map(entry => (
                <tr key={entry.id}>
                  <td className="date-column">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="driver-column">{entry.driverName}</td>
                  <td className="vehicle-column">{entry.vehicleNumber}</td>
                  <td className="source-column">{entry.source}</td>
                  <td className="status-column">
                    <span className={`status-badge ${entry.loadingUnload.toLowerCase()}`}>
                      {entry.loadingUnload}
                    </span>
                  </td>
                </tr>
              ))}
              {entriesData.entries.length === 0 && (
                <tr>
                  <td colSpan="5" className="no-data">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEntriesSection = () => (
    <div className="entries-section">
      <h2>All Entries</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>
                <div className="column-header">
                  Date
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.date.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('date', e)}
                    />
                    {activeFilter === 'date' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.date.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.date.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('date', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Driver Details
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.driverName.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('driverName', e)}
                    />
                    {activeFilter === 'driverName' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.driverName.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.driverName.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('driverName', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Vehicle Details
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.vehicleType.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('vehicleType', e)}
                    />
                    {activeFilter === 'vehicleType' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.vehicleType.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.vehicleType.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('vehicleType', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Source
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.source.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('source', e)}
                    />
                    {activeFilter === 'source' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.source.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.source.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('source', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Loading Status
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.loadingUnload.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('loadingUnload', e)}
                    />
                    {activeFilter === 'loadingUnload' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.loadingUnload.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.loadingUnload.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('loadingUnload', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Checked By
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.checkBy.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('checkBy', e)}
                    />
                    {activeFilter === 'checkBy' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.checkBy.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.checkBy.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('checkBy', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>
                <div className="column-header">
                  Recorded By
                  <div className="filter-container">
                    <FaFilter 
                      className={`filter-icon ${columnFilters.recordedBy?.length > 0 ? 'active' : ''}`} 
                      onClick={(e) => handleFilterClick('recordedBy', e)}
                    />
                    {activeFilter === 'recordedBy' && (
                      <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="filter-options">
                          {getUniqueValues.recordedBy?.map(value => (
                            <label key={value} className="filter-option">
                              <input
                                type="checkbox"
                                checked={columnFilters.recordedBy?.includes(value)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleColumnFilterChange('recordedBy', value, e.target.checked);
                                }}
                              />
                              <span>{value}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th>Time In/Out</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentPageData().map((entry, index) => (
              <tr key={entry.id}>
                <td>{entry.serialNumber}</td>
                <td>{new Date(entry.date).toLocaleDateString()}</td>
                <td>
                  <div className="driver-details">
                    <div>{entry.driverName}</div>
                    {entry.driverMobile && (
                      <div className="mobile">
                        {entry.driverMobile}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="vehicle-details">
                    <span className="vehicle-number">{entry.vehicleNumber}</span>
                    <span className="vehicle-type">
                      <FaTruck /> {entry.vehicleType}
                    </span>
                  </div>
                </td>
                <td>{entry.source}</td>
                <td>
                  <span className={`status-badge ${entry.loadingUnload?.toLowerCase()}`}>
                    {entry.loadingUnload}
                  </span>
                </td>
                <td>{entry.checkBy || 'N/A'}</td>
                <td>{entry.recordedBy || 'N/A'}</td>
                <td>
                  <div className="time-details">
                    <span>In: {entry.timeIn}</span>
                    {entry.timeOut && <span>Out: {entry.timeOut}</span>}
                  </div>
                </td>
                <td>{entry.remarks || 'N/A'}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(entry)}
                      title="Edit Entry"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(entry)}
                      title="Delete Entry"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(1)}
            disabled={entriesData.currentPage === 1}
            className="pagination-button"
          >
            <FaAngleDoubleLeft />
          </button>
          <button 
            onClick={() => handlePageChange(entriesData.currentPage - 1)}
            disabled={entriesData.currentPage === 1}
            className="pagination-button"
          >
            <FaAngleLeft />
          </button>
          <span className="pagination-info">
            Page {entriesData.currentPage} of {entriesData.totalPages}
          </span>
          <button 
            onClick={() => handlePageChange(entriesData.currentPage + 1)}
            disabled={entriesData.currentPage === entriesData.totalPages}
            className="pagination-button"
          >
            <FaAngleRight />
          </button>
          <button 
            onClick={() => handlePageChange(entriesData.totalPages)}
            disabled={entriesData.currentPage === entriesData.totalPages}
            className="pagination-button"
          >
            <FaAngleDoubleRight />
          </button>
        </div>
      </div>
    </div>
  );

  const renderExportModal = () => {
    if (!showExportModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal export-modal">
          <div className="modal-header">
            <h2>Select Fields to Export</h2>
            <button className="close-button" onClick={() => setShowExportModal(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="modal-body">
            <div className="export-fields">
              {exportFields.map(field => (
                <label key={field.key} className="export-field-option">
                  <input
                    type="checkbox"
                    checked={selectedFields[field.key]}
                    onChange={(e) => setSelectedFields(prev => ({
                      ...prev,
                      [field.key]: e.target.checked
                    }))}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              Export
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleShowAddUser = () => {
    setNewUserData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      units: []
    });
    setShowAddUserModal(true);
  };

  const renderInvoiceHistory = () => {
    if (activeSection !== 'invoices') return null;

    return (
      <div className="invoices-section">
        <InvoicesList 
          invoices={invoices} 
          onFilter={(filters) => {
            // Filter logic will be implemented if needed
          }}
          onSearch={(query) => {
            // Search logic will be implemented if needed
          }}
        />
      </div>
    );
  };

  return (
    <div className="modern-dashboard">
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <FaTruck className="company-logo" />
          <h2>Gate Entry</h2>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isSidebarOpen ? <FaChevronLeft /> : <FaBars />}
          </button>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar" onClick={toggleProfileDropdown}>
            <FaUser />
          </div>
          <div className="user-info">
            <h3 className="user-name">{userData.name}</h3>
            <p className="user-role">Administration</p>
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
            className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <FaDatabase /> Dashboard
          </button>
          <button 
            className={`menu-item ${activeSection === 'entries' ? 'active' : ''}`}
            onClick={() => setActiveSection('entries')}
          >
            <FaClipboardList /> Loading Entries
          </button>
          <button 
            className={`menu-item ${activeSection === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveSection('invoices')}
          >
            <FaFileInvoice /> Unloading Entries
          </button>
          <button 
            className={`menu-item ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            <FaUsers /> Users
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
              {activeSection === 'dashboard' && 'Admin Dashboard'}
              {activeSection === 'entries' && 'Vehicle Entries'}
              {activeSection === 'users' && 'User Management'}
              {activeSection === 'invoices' && 'Invoice History'}
            </h1>
            <p className="header-subtitle">
              {activeSection === 'dashboard' && 'Overview of system statistics and recent activity'}
              {activeSection === 'entries' && 'Manage and monitor all vehicle entries'}
              {activeSection === 'users' && 'Manage system users and their roles'}
              {activeSection === 'invoices' && 'View and manage all invoices'}
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FaSync className={`refresh-icon ${refreshing ? 'spinning' : ''}`} />
            </button>
            {activeSection === 'entries' && (
              <button className="export-button" onClick={handleExportToExcel} title="Export Data">
                <FaDownload className="export-icon" />
              </button>
            )}
          </div>
        </div>

        {activeSection === 'dashboard' && renderDashboardSection()}
        {activeSection === 'entries' && renderEntriesSection()}
        {activeSection === 'users' && renderUserManagement()}
        {activeSection === 'invoices' && renderInvoiceHistory()}

      </div>

      {/* Notifications Container */}
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Vehicle Entry</h2>
              <button 
                className="close-button"
                onClick={() => setShowEditModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label>Serial Number</label>
                <input
                  type="text"
                  value={editFormData.serialNumber}
                  onChange={(e) => setEditFormData({...editFormData, serialNumber: e.target.value})}
                  required
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Driver Mobile</label>
                <input
                  type="text"
                  value={editFormData.driverMobile}
                  onChange={(e) => setEditFormData({...editFormData, driverMobile: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input
                  type="text"
                  value={editFormData.driverName}
                  onChange={(e) => setEditFormData({...editFormData, driverName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  type="text"
                  value={editFormData.vehicleNumber}
                  onChange={(e) => setEditFormData({...editFormData, vehicleNumber: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={editFormData.vehicleType}
                  onChange={(e) => setEditFormData({...editFormData, vehicleType: e.target.value})}
                  required
                >
                  <option value="">Select Vehicle Type</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Source</label>
                <input
                  type="text"
                  value={editFormData.source}
                  onChange={(e) => setEditFormData({...editFormData, source: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Loading/Unloading</label>
                <select
                  value={editFormData.loadingUnload}
                  onChange={(e) => setEditFormData({...editFormData, loadingUnload: e.target.value})}
                  required
                >
                  <option value="">Select Status</option>
                  <option value="Loading">Loading</option>
                  <option value="Unloading">Unloading</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time In</label>
                <input
                  type="time"
                  value={editFormData.timeIn}
                  onChange={(e) => setEditFormData({...editFormData, timeIn: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time Out</label>
                <input
                  type="time"
                  value={editFormData.timeOut}
                  onChange={(e) => setEditFormData({...editFormData, timeOut: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Checked By</label>
                <input
                  type="text"
                  value={editFormData.checkBy}
                  onChange={(e) => setEditFormData({...editFormData, checkBy: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Recorded By</label>
                <input
                  type="text"
                  value={editFormData.recordedBy}
                  disabled
                  className="disabled-input"
                  title="This field cannot be edited"
                />
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({...editFormData, remarks: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-button">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Entry</h2>
              <button 
                className="close-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-form">
              <p>Are you sure you want to delete this entry?</p>
              <div className="modal-actions">
                <button 
                  className="delete-button"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete User</h2>
              <button 
                className="close-button"
                onClick={() => setShowDeleteUserModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-form">
              <p>Are you sure you want to delete user {userToDelete?.name}?</p>
              <div className="modal-actions">
                <button 
                  className="delete-button"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowDeleteUserModal(false)}
                >
                  Cancel
                </button>
              </div>
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
              <button className="close-button" onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordError('');
                setPasswordSuccess('');
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {passwordError && (
                <div className="alert alert-error">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="alert alert-success">{passwordSuccess}</div>
              )}
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="form-control"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleChangePassword}
                disabled={passwordSuccess !== ''}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="profile-info">
                <div className="profile-avatar">
                  <FaUser />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={userData.name}
                    readOnly
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={userData.email}
                    readOnly
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={userData.role === 'admin' ? 'Administrator' : 'User'}
                    readOnly
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Member Since</label>
                  <input
                    type="text"
                    value={new Date(userData.created_at).toLocaleDateString()}
                    readOnly
                    className="form-control"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {renderExportModal()}
      {renderAddUserModal()}
    </div>
  );
}

export default AdminDashboard;
