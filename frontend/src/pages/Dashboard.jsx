import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  LogOut, 
  Calendar, 
  Sparkles, 
  Info,
  PhoneCall
} from 'lucide-react';

export default function Dashboard({ token, user, onLogout }) {
  const [tracks, setTracks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('today'); // 'today' | 'manage'
  
  // Forms state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [editingTemplate, setEditingTemplate] = useState(null); // template object
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  
  // Today quick add states
  const [showTodayAddForm, setShowTodayAddForm] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('08:00');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper to format browser date in YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalDateFormatted = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchTodayTracks();
    fetchTemplates();
  }, []);

  const fetchTodayTracks = async () => {
    const localDate = getLocalDateString();
    try {
      const response = await fetch(`/api/tracker/today?date=${localDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setTracks(result.data);
      } else {
        setError(result.detail || 'Failed to fetch today\'s routines.');
      }
    } catch (err) {
      setError('Connection error. Could not reach server.');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/routines', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleToggleStatus = async (trackId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      const response = await fetch(`/api/tracker/${trackId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        // Optimistic UI update or refresh
        setTracks(tracks.map(t => t.id === trackId ? { ...t, status: newStatus, isMissed: newStatus === 'Pending' ? t.isMissed : false } : t));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle.trim(), time: newTime })
      });
      
      const result = await response.json();
      if (response.ok) {
        setTemplates([...templates, result.data]);
        setNewTitle('');
        setShowAddForm(false);
        setSuccessMsg('Routine template created! It will take effect tomorrow.');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(result.detail || 'Failed to create routine template.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickTime) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: quickTitle.trim(), time: quickTime })
      });
      
      const result = await response.json();
      if (response.ok) {
        // Reload today's tracks and template list
        await fetchTodayTracks();
        await fetchTemplates();
        setQuickTitle('');
        setShowTodayAddForm(false);
        setSuccessMsg('Task added successfully for today!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(result.detail || 'Failed to add task.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (template) => {
    setEditingTemplate(template);
    setEditTitle(template.title);
    setEditTime(template.time);
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editTime || !editingTemplate) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/routines/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle.trim(), time: editTime, isActive: true })
      });
      
      if (response.ok) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...t, title: editTitle.trim(), time: editTime } : t));
        setEditingTemplate(null);
        setSuccessMsg('Routine template updated! It will take effect tomorrow.');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        const result = await response.json();
        setError(result.detail || 'Failed to update routine template.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this routine?')) return;
    
    try {
      const response = await fetch(`/api/routines/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        setSuccessMsg('Routine template deleted! It will be removed starting tomorrow.');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Progress computation
  const completedCount = tracks.filter(t => t.status === 'Completed').length;
  const totalCount = tracks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header welcome bar */}
      <div style={styles.welcomeBar} className="glass-panel">
        <div>
          <h2 style={styles.welcomeText}>Hello, {user.name} 👋</h2>
          <p style={styles.phoneText}>📱 Phone: {user.phone}</p>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button 
          onClick={() => setActiveSubTab('today')}
          style={{ ...styles.tabButton, ...(activeSubTab === 'today' ? styles.activeTabButton : {}) }}
        >
          <Calendar size={18} />
          <span>Today's Checklist</span>
        </button>
        <button 
          onClick={() => setActiveSubTab('manage')}
          style={{ ...styles.tabButton, ...(activeSubTab === 'manage' ? styles.activeTabButton : {}) }}
        >
          <Sparkles size={18} />
          <span>Manage Patterns</span>
        </button>
      </div>

      {error && (
        <div style={styles.errorAlert} className="animate-shake">
          <span>⚠️ {error}</span>
        </div>
      )}

      {successMsg && (
        <div style={styles.successAlert}>
          <span>💡 {successMsg}</span>
        </div>
      )}

      {/* TODAY'S CHECKLIST PANEL */}
      {activeSubTab === 'today' && (
        <div style={styles.panel} className="glass-panel">
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}> Checklist for Today</h3>
              <p style={styles.dateLabel}>{getLocalDateFormatted()}</p>
            </div>
            
            {totalCount > 0 && (
              <div style={styles.progressContainer}>
                <span style={styles.progressText}>{completedCount} of {totalCount} Completed</span>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Form on Today's Checklist */}
          <div style={styles.quickAddRow}>
            {showTodayAddForm ? (
              <form onSubmit={handleQuickAdd} style={styles.quickAddForm} className="animate-fade-in">
                <input 
                  type="text" 
                  placeholder="Task title (e.g., Meditate)" 
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  required
                  style={styles.quickInputText}
                />
                <input 
                  type="time" 
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  required
                  style={styles.quickInputTime}
                />
                <button type="submit" disabled={loading} style={styles.quickAddSaveBtn}>
                  Add Task
                </button>
                <button type="button" onClick={() => setShowTodayAddForm(false)} style={styles.quickAddCancelBtn}>
                  Cancel
                </button>
              </form>
            ) : (
              <button onClick={() => setShowTodayAddForm(true)} style={styles.quickAddTriggerBtn}>
                <Plus size={14} />
                <span>Add Task to Today's Checklist</span>
              </button>
            )}
          </div>

          {tracks.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No routines active for today.</p>
              <p style={styles.emptySubText}>Head over to the "Manage Patterns" tab to set up your routine template checklist!</p>
            </div>
          ) : (
            <div style={styles.trackList}>
              {tracks.map((track) => {
                const isMissed = track.isMissed;
                let statusBadgeStyle = styles.badgePending;
                if (track.status === 'Completed') statusBadgeStyle = styles.badgeCompleted;
                if (track.status === 'Will Complete Later') statusBadgeStyle = styles.badgeLater;

                return (
                  <div 
                    key={track.id} 
                    style={{ 
                      ...styles.trackCard, 
                      ...(isMissed ? styles.missedCardBorder : {}),
                      ...(track.status === 'Completed' ? styles.completedCardOpacity : {})
                    }}
                  >
                    <div style={styles.trackCardLeft}>
                      <button 
                        onClick={() => handleToggleStatus(track.id, track.status)}
                        style={styles.checkButton}
                      >
                        {track.status === 'Completed' ? (
                          <CheckCircle size={24} style={{ color: 'var(--accent-green)' }} />
                        ) : (
                          <Circle size={24} style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </button>

                      <div style={styles.trackTextInfo}>
                        <h4 style={{ 
                          ...styles.trackTitle, 
                          ...(track.status === 'Completed' ? styles.lineThroughText : {}) 
                        }}>
                          {track.title}
                        </h4>
                        
                        <div style={styles.trackMeta}>
                          <span style={styles.metaItem}>
                            <Clock size={12} />
                            {track.time}
                          </span>
                          
                          {track.reminderCalled && (
                            <span style={styles.phoneBadge}>
                              <PhoneCall size={10} />
                              Called
                            </span>
                          )}

                          {track.reminderResponse !== null && (
                            <span style={styles.responseBadge}>
                              Resp: {
                                track.reminderResponse === '1' ? 'Completed' :
                                track.reminderResponse === '0' ? 'Pending' : 'Later'
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.trackCardRight}>
                      {isMissed && (
                        <div style={styles.missedBadge}>
                          <AlertTriangle size={12} />
                          <span>Missed</span>
                        </div>
                      )}
                      
                      <span style={{ ...styles.statusBadge, ...statusBadgeStyle }}>
                        {track.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANAGE ROUTINE PATTERNS PANEL */}
      {activeSubTab === 'manage' && (
        <div style={styles.panel} className="glass-panel">
          <div style={styles.panelHeaderRow}>
            <div>
              <h3 style={styles.panelTitle}>Routine Patterns</h3>
              <p style={styles.dateLabel}>Your recurring weekly/daily habits checklist.</p>
            </div>
            
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setEditingTemplate(null); }}
              style={styles.addButton}
            >
              <Plus size={16} />
              <span>New Routine</span>
            </button>
          </div>

          <div style={styles.infoBanner}>
            <Info size={16} style={{ color: 'var(--accent-cyan)' }} />
            <p style={styles.infoText}>
              Note: Routine updates, additions, or deletions take effect starting the <strong>following day onwards</strong>.
            </p>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddTemplate} style={styles.formCard} className="animate-fade-in">
              <h4 style={styles.formTitle}>Add New Habit Pattern</h4>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Routine Title</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Yoga, Morning Walk, Read paper"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Scheduled Time (24h)</label>
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowAddForm(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={styles.saveButton}>
                  Create Pattern
                </button>
              </div>
            </form>
          )}

          {/* Edit Form */}
          {editingTemplate && (
            <form onSubmit={handleUpdateTemplate} style={styles.formCard} className="animate-fade-in">
              <h4 style={styles.formTitle}>Edit Habit Pattern</h4>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Routine Title</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Scheduled Time (24h)</label>
                  <input 
                    type="time" 
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" onClick={() => setEditingTemplate(null)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={styles.saveButton}>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {templates.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No routine templates set.</p>
              <p style={styles.emptySubText}>Add your first daily habit using the button above to begin tracking habits.</p>
            </div>
          ) : (
            <div style={styles.templateGrid}>
              {templates.map((template) => (
                <div key={template.id} style={styles.templateCard}>
                  <div style={styles.templateInfo}>
                    <h4 style={styles.templateTitle}>{template.title}</h4>
                    <span style={styles.templateTime}>
                      <Clock size={12} />
                      {template.time}
                    </span>
                  </div>
                  <div style={styles.templateActions}>
                    <button 
                      onClick={() => handleStartEdit(template)}
                      style={styles.iconButtonEdit}
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      style={styles.iconButtonDelete}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcomeBar: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  phoneText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  logoutButton: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tabBar: {
    display: 'flex',
    gap: '12px',
  },
  tabButton: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    padding: '10px 16px',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  activeTabButton: {
    background: 'var(--primary)',
    color: 'white',
    borderColor: 'var(--primary)',
    boxShadow: '0 4px 12px var(--primary-glow)',
  },
  panel: {
    padding: '24px 24px 30px 24px',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  panelHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
  },
  dateLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  progressContainer: {
    textAlign: 'right',
  },
  progressText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '6px',
  },
  progressBarBg: {
    width: '140px',
    height: '6px',
    background: 'var(--bg-tertiary)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent-cyan) 100%)',
    borderRadius: '3px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  emptySubText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  trackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  trackCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedCardOpacity: {
    opacity: 0.75,
  },
  missedCardBorder: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    background: 'rgba(239, 68, 68, 0.02)',
  },
  trackCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  checkButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTextInfo: {
    textAlign: 'left',
  },
  trackTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  lineThroughText: {
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
  },
  trackMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
  },
  metaItem: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  phoneBadge: {
    background: 'var(--primary-glow)',
    color: 'var(--primary-hover)',
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  },
  responseBadge: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary)',
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  trackCardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  missedBadge: {
    background: 'var(--accent-red-glow)',
    border: '1px solid var(--accent-red)',
    color: '#f87171',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusBadge: {
    fontSize: '11px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '500',
  },
  badgePending: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  },
  badgeCompleted: {
    background: 'var(--accent-green-glow)',
    color: 'var(--accent-green)',
  },
  badgeLater: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--accent-amber)',
  },
  addButton: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  infoBanner: {
    background: 'rgba(6, 182, 212, 0.05)',
    border: '1px solid rgba(6, 182, 212, 0.15)',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    textAlign: 'left',
  },
  infoText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  formCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '14px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  formInput: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  saveButton: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  templateGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  templateCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateInfo: {
    textAlign: 'left',
  },
  templateTitle: {
    fontSize: '14px',
    fontWeight: '500',
  },
  templateTime: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  templateActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButtonEdit: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  iconButtonDelete: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ef4444',
    cursor: 'pointer',
  },
  errorAlert: {
    background: 'var(--accent-red-glow)',
    border: '1px solid var(--accent-red)',
    color: '#f87171',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    textAlign: 'left',
  },
  successAlert: {
    background: 'var(--accent-green-glow)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    textAlign: 'left',
  },
  quickAddRow: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  quickAddTriggerBtn: {
    background: 'var(--bg-tertiary)',
    border: '1px dashed var(--primary)',
    color: 'var(--primary-hover)',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  quickAddForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    background: 'var(--bg-secondary)',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
  },
  quickInputText: {
    flexGrow: 1,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  quickInputTime: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  quickAddSaveBtn: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  quickAddCancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
  }
};
