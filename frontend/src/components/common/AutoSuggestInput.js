import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AutoSuggestInput.css';

const AutoSuggestInput = ({ 
  name, 
  value, 
  onChange, 
  placeholder, 
  required, 
  suggestionUrl,
  className 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Add click outside listener
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (searchText) => {
    if (!searchText) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${suggestionUrl}?search=${searchText}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    onChange(e);
    fetchSuggestions(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ target: { name, value: suggestion } });
    setShowSuggestions(false);
  };

  return (
    <div className="autosuggest-wrapper" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && fetchSuggestions(value)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-item"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="suggestions-loading">Loading...</div>}
    </div>
  );
};

export default AutoSuggestInput;
