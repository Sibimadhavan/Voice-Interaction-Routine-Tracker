import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  User as UserIcon, 
  LogOut, 
  AlertTriangle, 
  Check, 
  History as HistoryIcon, 
  FileEdit, 
  Info,
  PhoneCall,
  Activity
} from 'lucide-react';

export default function App() {
  // Navigation & Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [activePage, setActivePage] = useState(token ? 'dashboard' : 'login');
  
  // Auth Form State
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [authDigit, setAuthDigit] = useState(null);
  const [verificationCompleted, setVerificationCompleted] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // App Data State
  const [routines, setRoutines] = useState([]);
  const [dashboardList, setDashboardList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [historyRange, setHistoryRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Editor Form State
  const [editMode, setEditMode] = useState(false); // false | 'add' | 'edit'
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTime, setFormTime] = useState('08:00');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState(null);
  const pollTimerRef = useRef(null);

  // Show dynamic toast alert
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync token to storage
  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    setActivePage('dashboard');
    showToast(`Welcome back, ${userData.name}!`);
  };

  // Sign out
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setActivePage('login');
    setIsVerificationPending(false);
    setVerificationCompleted(false);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    showToast('Signed out successfully.');
  };

  // Format local date and time
  const getLocalDateTimeInfo = () => {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0');
    return { dateStr, timeStr };
  };

  // Call Poll Verification API during login/register call
  const startVerificationPolling = (phoneNum, flowType) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/verify?phone=${encodeURIComponent(phoneNum)}`);
        const json = await response.json();
        
        if (json.success && json.data.verified) {
          clearInterval(pollTimerRef.current);
          setIsVerificationPending(false);

          if (json.data.registered) {
            // Already registered, logged in immediately
            handleLoginSuccess(json.data.token, json.data.user);
          } else {
            // New registration, OTP verified, show name entry next
            setVerificationCompleted(true);
            showToast('Phone verified! Please complete registration by entering your name.');
          }
        }
      } catch (err) {
        console.error('Error polling verification:', err);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Initiate Auth Call (Register or Login)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Authentication request failed');
      }

      setAuthDigit(json.data.digit);
      setIsVerificationPending(true);
      showToast('Calling phone for verification...', 'success');
      startVerificationPolling(phone, authTab);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Complete registration by saving name
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name })
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Registration failed');
      }

      handleLoginSuccess(json.data.token, json.data.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch Dashboard Checklist
  const fetchDashboardChecklist = async () => {
    if (!token) return;
    const { dateStr, timeStr } = getLocalDateTimeInfo();
    try {
      const response = await fetch(`/api/dashboard?date=${dateStr}&time=${timeStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setDashboardList(json.data);
      }
    } catch (err) {
      showToast('Failed to fetch dashboard', 'error');
    }
  };

  // Check off routine manually on dashboard
  const handleToggleLog = async (routineId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const { dateStr } = getLocalDateTimeInfo();
    try {
      const response = await fetch('/api/dashboard/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          routineId,
          date: dateStr,
          status: nextStatus
        })
      });
      const json = await response.json();
      if (json.success) {
        fetchDashboardChecklist();
        showToast(nextStatus === 'completed' ? 'Routine completed!' : 'Routine reverted to pending.');
      } else {
        throw new Error(json.error?.message);
      }
    } catch (err) {
      showToast('Error updating routine log', 'error');
    }
  };

  // Fetch User Routines
  const fetchRoutines = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/routines', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setRoutines(json.data);
      }
    } catch (err) {
      showToast('Error fetching routines', 'error');
    }
  };

  // Fetch User Log History
  const fetchHistory = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/history?startDate=${historyRange.start}&endDate=${historyRange.end}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setHistoryList(json.data);
      }
    } catch (err) {
      showToast('Error fetching history', 'error');
    }
  };

  // Load correct data depending on page navigation
  useEffect(() => {
    if (token) {
      if (activePage === 'dashboard') {
        fetchDashboardChecklist();
      } else if (activePage === 'routines') {
        fetchRoutines();
      } else if (activePage === 'history') {
        fetchHistory();
      }
    }
  }, [activePage, token, historyRange]);

  // Create or Edit Routine form submit
  const handleRoutineSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitLoading(true);
    try {
      let response;
      if (editMode === 'add') {
        response = await fetch('/api/routines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: formTitle, description: formDesc, time: formTime })
        });
      } else {
        response = await fetch(`/api/routines/${selectedRoutine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: formTitle, description: formDesc, time: formTime })
        });
      }
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save routine');
      }

      showToast(`Routine successfully ${editMode === 'add' ? 'created' : 'updated'}. Take effect from tomorrow.`);
      setEditMode(false);
      fetchRoutines();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete routine
  const handleDeleteRoutine = async (routineId) => {
    if (!window.confirm('Are you sure you want to delete this routine?')) return;
    try {
      const response = await fetch(`/api/routines/${routineId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        showToast('Routine deleted successfully.');
        fetchRoutines();
      }
    } catch (err) {
      showToast('Failed to delete routine', 'error');
    }
  };

  // Launch modal for adding a routine
  const triggerAddRoutine = () => {
    setEditMode('add');
    setSelectedRoutine(null);
    setFormTitle('');
    setFormDesc('');
    setFormTime('08:00');
  };

  // Launch modal for editing a routine
  const triggerEditRoutine = (r) => {
    setEditMode('edit');
    setSelectedRoutine(r);
    setFormTitle(r.title);
    setFormDesc(r.description || '');
    setFormTime(r.time);
  };

  return (
    <div className="app-container">
      {/* Background Glowing Orbs */}
      <div className="orb orb-primary"></div>
      <div className="orb orb-secondary"></div>

      {/* Header (Only show if logged in) */}
      {token && (
        <header className="header">
          <div className="logo">
            <Activity size={28} className="text-primary" />
            <span>Routine Tracker</span>
          </div>
          <nav className="nav">
            <button 
              className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActivePage('dashboard')}
            >
              Today's Checklist
            </button>
            <button 
              className={`nav-link ${activePage === 'routines' ? 'active' : ''}`}
              onClick={() => setActivePage('routines')}
            >
              My Routines
            </button>
            <button 
              className={`nav-link ${activePage === 'history' ? 'active' : ''}`}
              onClick={() => setActivePage('history')}
            >
              History Stats
            </button>
            <button className="nav-link" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </nav>
        </header>
      )}

      {/* Main Pages */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TOAST POPUP */}
        {toast && (
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            {toast.type === 'error' ? <AlertTriangle size={20} className="text-danger" /> : <CheckCircle size={20} className="text-success" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. LOGIN / SIGNUP SCREEN */}
        {!token && (
          <div className="auth-wrapper">
            <div className="glass-panel auth-panel">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', gap: '10px', alignItems: 'center' }}>
                <Activity size={36} style={{ color: 'var(--color-primary)' }} />
                <h1 style={{ fontSize: '1.8rem' }}>Routine Tracker</h1>
              </div>

              {!isVerificationPending && !verificationCompleted ? (
                <>
                  <div className="auth-tabs">
                    <div 
                      className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                      onClick={() => setAuthTab('login')}
                    >
                      Login
                    </div>
                    <div 
                      className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                      onClick={() => setAuthTab('register')}
                    >
                      Register
                    </div>
                  </div>

                  <form onSubmit={handleAuthSubmit}>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        placeholder="+919876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={authLoading}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                      {authLoading ? <div className="loading-ring"></div> : 'Send Verification Call'}
                    </button>
                  </form>
                </>
              ) : isVerificationPending ? (
                <div style={{ textAlign: 'center' }}>
                  <PhoneCall size={48} style={{ color: 'var(--color-secondary)', animation: 'pulse 1.5s infinite' }} />
                  <h2 style={{ margin: '16px 0 8px 0' }}>Verification Call Sent</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                    Calling your mobile number {phone}. When you receive the call, press:
                  </p>
                  <div className="verification-code-display">
                    {authDigit}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                    <div className="loading-ring" style={{ width: '16px', height: '16px', borderTopColor: 'var(--color-primary)' }}></div>
                    <span>Waiting for phone keypad press...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCompleteRegistration}>
                  <h2 style={{ marginBottom: '8px' }}>One Last Step</h2>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Phone call verification succeeded. Please enter your name to build your workspace.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={authLoading}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                    {authLoading ? <div className="loading-ring"></div> : 'Complete Setup & Log In'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 2. TODAY'S DASHBOARD CHECKLIST */}
        {token && activePage === 'dashboard' && (
          <div className="dashboard-grid">
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Today's Tasks</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Check off routine items you complete today.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary)' }}>
                  <Calendar size={18} />
                  <span style={{ fontWeight: 600 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>

              {dashboardList.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={64} strokeWidth={1} />
                  <h3>No pending routines for today</h3>
                  <p>Check "My Routines" to create new reminders. Newly created routines will trigger from tomorrow onwards.</p>
                  <button className="btn btn-secondary" onClick={() => setActivePage('routines')}>Create Routine</button>
                </div>
              ) : (
                <div className="routine-list">
                  {dashboardList.map((item) => (
                    <div 
                      key={item.routineId} 
                      className={`routine-card ${item.status === 'completed' ? 'completed' : ''} ${item.flagged ? 'flagged' : ''}`}
                    >
                      <div className="routine-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="routine-title">{item.title}</span>
                          {item.status === 'completed' && <span className="badge badge-completed">Completed</span>}
                          {item.status === 'later' && <span className="badge badge-later">Later</span>}
                          {item.flagged && <span className="badge badge-missed" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><AlertTriangle size={12} /> Missed</span>}
                        </div>
                        {item.description && <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{item.description}</span>}
                        <span className="routine-time">
                          <Clock size={14} /> {item.time}
                        </span>
                      </div>
                      
                      <button 
                        className={`check-btn ${item.status === 'completed' ? 'checked' : ''}`}
                        onClick={() => handleToggleLog(item.routineId, item.status)}
                      >
                        <Check size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ height: 'fit-content' }}>
              <h3 style={{ marginBottom: '16px' }}>Twilio Reminders Active</h3>
              <div className="alert-info" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Info size={24} style={{ flexShrink: 0 }} />
                <span>
                  <strong> Keypad Check-in calls</strong> will ring your phone at each scheduled time if items remain unchecked. Complete them before the deadline to prevent alerts!
                </span>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Remind Call Ring:</span>
                  <span style={{ fontWeight: 600 }}>Max 10s Ring Limit</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Verification:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Active (DTMF Keypad)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. MY ROUTINES LIST & EDITOR */}
        {token && activePage === 'routines' && (
          <div className="dashboard-grid">
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>My Routines</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Create, update, and manage your checklist schedules.</p>
                </div>
                <button className="btn btn-primary" onClick={triggerAddRoutine}>
                  <Plus size={18} /> Add Routine
                </button>
              </div>

              {routines.length === 0 ? (
                <div className="empty-state">
                  <Activity size={64} strokeWidth={1} />
                  <h3>You haven't defined any routines yet</h3>
                  <p>Set daily habits, trigger reminder schedules, and log results.</p>
                  <button className="btn btn-primary" onClick={triggerAddRoutine}>Get Started</button>
                </div>
              ) : (
                <div className="routine-list">
                  {routines.map((r) => (
                    <div key={r.id} className="routine-card">
                      <div className="routine-info">
                        <span className="routine-title">{r.title}</span>
                        {r.description && <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{r.description}</span>}
                        <span className="routine-time">
                          <Clock size={14} /> {r.time}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => triggerEditRoutine(r)}>
                          <FileEdit size={16} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--color-danger)' }} onClick={() => handleDeleteRoutine(r.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ROUTINE EDITOR SIDEBAR PANEL */}
            {editMode && (
              <div className="glass-panel" style={{ height: 'fit-content' }}>
                <h3 style={{ marginBottom: '20px' }}>
                  {editMode === 'add' ? 'Create New Routine' : 'Edit Routine'}
                </h3>
                <div className="alert-info" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                  <Info size={20} style={{ flexShrink: 0 }} />
                  <span>Updates apply starting tomorrow.</span>
                </div>

                <form onSubmit={handleRoutineSubmit}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Gym Session, Medication, etc."
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (Optional)</label>
                    <textarea 
                      className="form-control"
                      placeholder="Additional notes..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Time (Daily)</label>
                    <input 
                      type="time" 
                      className="form-control"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitLoading}>
                      {submitLoading ? <div className="loading-ring"></div> : 'Save Routine'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 4. HISTORICAL STATS LOG PAGE */}
        {token && activePage === 'history' && (
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Completion History</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Check logging completion states from previous runs.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  className="form-control"
                  style={{ width: 'auto', padding: '8px 12px' }}
                  value={historyRange.start}
                  onChange={(e) => setHistoryRange({ ...historyRange, start: e.target.value })}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>to</span>
                <input 
                  type="date" 
                  className="form-control"
                  style={{ width: 'auto', padding: '8px 12px' }}
                  value={historyRange.end}
                  onChange={(e) => setHistoryRange({ ...historyRange, end: e.target.value })}
                />
              </div>
            </div>

            {historyList.length === 0 ? (
              <div className="empty-state">
                <HistoryIcon size={64} strokeWidth={1} />
                <h3>No routine logs recorded for this range</h3>
                <p>Ensure you have created active routines and wait for scheduled times to pass or log them manually.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="history-list">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Routine</th>
                      <th>Status</th>
                      <th>Checked Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((log) => (
                      <tr key={log.logId}>
                        <td style={{ fontWeight: 600 }}>{log.date}</td>
                        <td>{log.time}</td>
                        <td style={{ color: '#fff', fontWeight: 500 }}>{log.title}</td>
                        <td>
                          {log.status === 'completed' && <span className="badge badge-completed">Completed</span>}
                          {log.status === 'pending' && <span className="badge badge-missed">Missed / Pending</span>}
                          {log.status === 'later' && <span className="badge badge-later">Complete Later</span>}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer footer information */}
      <footer style={{ marginTop: '40px', padding: '20px 0', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <span>&copy; {new Date().getFullYear()} Routine Tracker. Powered by Twilio.</span>
        <span>Version 1.0.0</span>
      </footer>
    </div>
  );
}
