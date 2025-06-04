// src/components/SystemMessage.js
import React, { useEffect, useState } from 'react';
import './SystemMessage.css';

const SystemMessage = ({ message, type = 'info', duration = 3000, onDismiss, key }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration, key]);

  if (!visible || !message) return null;

  const getIcon = () => {
    switch(type) {
        case 'success': return '✔️';
        case 'levelup': return '🌟';
        case 'error': return '⚠️'; // Changed from skull for HP loss for better clarity
        case 'info':
        default: return 'ℹ️';
    }
  }

  return (
    <div className={`system-message ${type} ${visible ? 'visible' : ''}`}>
      <span className="message-icon">
        {getIcon()}
      </span>
      {message}
    </div>
  );
};
export default SystemMessage;