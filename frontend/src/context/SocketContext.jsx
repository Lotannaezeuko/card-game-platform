import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Opens a single Socket.IO connection when the user is authenticated and closes
// it automatically when they log out. Uses window.location.hostname so the
// socket URL works when testing from other devices on the local network.
export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Prefer the storage value over the React state token to avoid sending a
    // stale token when the effect runs before state settles
    const activeToken = sessionStorage.getItem('token') || localStorage.getItem('token') || token;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;
    const s = io(socketUrl, {
      auth: { token: activeToken },
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
