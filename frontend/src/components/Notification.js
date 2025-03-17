import React, { useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const Notification = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon" />;
      case 'error':
        return <FaTimesCircle className="notification-icon" />;
      case 'warning':
        return <FaExclamationTriangle className="notification-icon" />;
      default:
        return <FaInfoCircle className="notification-icon" />;
    }
  };

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        {getIcon()}
        <span className="notification-message">{message}</span>
      </div>
      {onClose && (
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
