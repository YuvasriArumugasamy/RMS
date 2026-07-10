import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect when user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join role-based room so server can broadcast to specific roles
      socket.emit('join-room', 'kitchen');
      socket.emit('join-room', 'staff');
      socket.emit('join-room', `role-${user.role.toLowerCase()}`);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    // ── Push Notifications via socket events ─────────────────
    const sendPush = (title, body, icon = '/favicon.png') => {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon, badge: '/favicon.png' });
        } catch (e) {
          // push notification not supported or blocked
        }
      }
    };

    socket.on('new-order', (order) => {
      sendPush(
        '🆕 New Order!',
        `${order.orderId || order.id} — ${order.table || 'Takeaway'} · ₹${order.total}`
      );
    });

    socket.on('order-status-update', (update) => {
      if (update.status === 'Ready') {
        sendPush('✅ Order Ready!', `${update.orderId} is ready for pickup — ${update.table}`);
      }
    });

    socket.on('new-reservation', (res) => {
      sendPush('📅 New Reservation!', `${res.customerName} — ${res.tableName} at ${res.time}`);
    });

    socket.on('low-stock-alert', (item) => {
      sendPush('⚠️ Low Stock Alert!', `${item.name} is running low: ${item.stock} ${item.unit} remaining`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  // Helper: emit an event
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Helper: listen to an event (returns cleanup fn)
  // Uses socketRef so it always attaches to the current socket, not a stale one
  const on = useCallback((event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [connected]); // re-memoize when connection changes so consumers get fresh handlers

  // Helper: remove listener
  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  // Helper: request browser push permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on, off, requestNotificationPermission }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
