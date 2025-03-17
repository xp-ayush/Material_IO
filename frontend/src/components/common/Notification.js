import React from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
  return (
    <div className={`notification ${type}`}>
      <span className="message">{message}</span>
      {onClose && (
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
