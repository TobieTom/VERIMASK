import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import webSocketService from '../services/WebSocketService';
import AuthService from '../services/AuthService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    
    // Subscribe to notifications
    const unsubscribe = webSocketService.subscribe('notifications', (data) => {
      // Add new notification
      const newNotification = {
        id: Date.now(),
        message: data.message,
        timestamp: new Date(),
        read: false
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast(data.message);
    });
    
    // Connect to WebSocket
    webSocketService.connect();
    
    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, []);
  
  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    ));
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };
  
  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);