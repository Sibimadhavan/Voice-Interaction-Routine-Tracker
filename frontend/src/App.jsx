import React, { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import { Calendar, History as HistoryIcon, LogOut, CheckSquare } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('habitloop_token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'history'
  const [appLoading, setAppLoading] = useState(!!localStorage.getItem('habitloop_token'));

  useEffect(() => {
    // Validate session on mount if token exists
    if (token) {
      validateSession();
    }
  }, [token]);

  const validateSession = async () => {
    try {
      // We can hit a lightweight endpoint like /api/tracker/today (or a profiles/me endpoint)
      // If unauthorized, it will return 401, which resets our session.
      const response = await fetch('/api/tracker/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        handleLogout();
      } else {
        // Load user info from localStorage
        const storedUser = localStorage.getItem('habitloop_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error('Session validation error:', err);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLoginSuccess = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('habitloop_token', newToken);
    localStorage.setItem('habitloop_user', JSON.stringify(userData));
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout-user', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    
    setToken('');
    setUser(null);
    localStorage.removeItem('habitloop_token');
    localStorage.removeItem('habitloop_user');
  };

  if (appLoading) {
    return (
      <div style={styles.loadingScreen}>
        <div className="animate-spin" style={styles.spinner}>⏰</div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading HabitLoop...</p>
      </div>
    );
  }

  // Not authenticated -> show Auth page
  if (!token || !user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated -> show Navigation Header and active page
  return (
    <div style={styles.appContainer}>
      <header style={styles.navHeader} className="glass-panel">
        <div style={styles.navBrand}>
          <span style={styles.brandIcon}>⏰</span>
          <h1 style={styles.brandName} className="text-gradient">HabitLoop</h1>
        </div>

        <nav style={styles.navLinks}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ 
              ...styles.navLinkButton, 
              ...(activeTab === 'dashboard' ? styles.activeNavLink : {}) 
            }}
          >
            <CheckSquare size={16} />
            <span>Checklist</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ 
              ...styles.navLinkButton, 
              ...(activeTab === 'history' ? styles.activeNavLink : {}) 
            }}
          >
            <HistoryIcon size={16} />
            <span>History</span>
          </button>
        </nav>

        <div style={styles.navUser}>
          <span style={styles.userName}>{user.name}</span>
          <button onClick={handleLogout} style={styles.iconLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        {activeTab === 'dashboard' ? (
          <Dashboard token={token} user={user} onLogout={handleLogout} />
        ) : (
          <History token={token} />
        )}
      </main>
    </div>
  );
}

const styles = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--bg-primary)',
  },
  spinner: {
    fontSize: '40px',
  },
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
  },
  navHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    margin: '12px 24px 0 24px',
    borderRadius: '12px',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  brandIcon: {
    fontSize: '22px',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  navLinks: {
    display: 'flex',
    gap: '6px',
    background: 'var(--bg-primary)',
    padding: '3px',
    borderRadius: '8px',
  },
  navLinkButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  activeNavLink: {
    background: 'var(--bg-secondary)',
    color: 'var(--primary-hover)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  iconLogout: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  }
};
