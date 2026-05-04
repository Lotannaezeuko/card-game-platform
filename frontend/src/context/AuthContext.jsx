import { createContext, useContext, useState, useEffect } from 'react';
import { decodeToken } from '../utils/token';

const AuthContext = createContext(null);

// Provides authentication state and helpers to the entire app.
// Guest sessions are stored in sessionStorage so they are cleared when the tab closes.
// Registered users are stored in localStorage for persistence across sessions.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate auth state from storage on first render
  useEffect(() => {
    const stored = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        // Token is malformed, clear it
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const isGuest = user?.isGuest === true;

  // Persists the token in localStorage (survives tab close)
  function login(newToken) {
    const decoded = decodeToken(newToken);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(decoded);
  }

  // Persists the token in sessionStorage only (cleared when the tab closes)
  function loginAsGuest(newToken) {
    const decoded = decodeToken(newToken);
    sessionStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(decoded);
  }

  function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  // Returns the live token value from storage rather than React state to avoid
  // stale closures in async callbacks
  function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  return (
    <AuthContext.Provider value={{ user, token, isGuest, login, loginAsGuest, logout, getToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
