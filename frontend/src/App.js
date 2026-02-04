import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import './App.css';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Card Game Platform</h1>
        <div className="user-info">
          <span>Welcome, {user.username}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <p>You're logged in! Start building your decks and games.</p>
      </main>
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
