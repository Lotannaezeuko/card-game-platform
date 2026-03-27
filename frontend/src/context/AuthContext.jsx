import { createContext, useContext, useState, useEffect } from 'react';
import { decodeToken } from '../utils/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  function login(newToken) {
    const decoded = decodeToken(newToken);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(decoded);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, getToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
