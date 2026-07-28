import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  PhoneIncoming, 
  AlertTriangle 
} from 'lucide-react';

export default function History({ token }) {
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tracker/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setHistory(result.data);
      } else {
        setError(result.detail || 'Failed to fetch history data.');
      }
    } catch (err) {
      setError('Connection error. Could not load history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateHeader = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    // Create Date object in local timezone
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const dateKeys = Object.keys(history);

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title} className="text-gradient">Habit History</h2>
          <p style={styles.subtitle}>Review your performance over previous days</p>
        </div>
        <button onClick={fetchHistory} style={styles.refreshButton} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={14} /> : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={styles.errorAlert} className="animate-shake">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingContainer}>
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
          <p style={styles.loadingText}>Fetching history log...</p>
        </div>
      ) : dateKeys.length === 0 ? (
        <div style={styles.emptyCard} className="glass-panel">
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={styles.emptyText}>No historical logs available yet.</p>
          <p style={styles.emptySubText}>
            Historical data will appear here starting from the day after you configure your routines checklist.
          </p>
        </div>
      ) : (
        <div style={styles.timeline}>
          {dateKeys.map((dateKey) => {
            const dayTracks = history[dateKey];
            const completedCount = dayTracks.filter(t => t.status === 'Completed').length;
            const totalCount = dayTracks.length;
            const completionRate = Math.round((completedCount / totalCount) * 100);

            return (
              <div key={dateKey} style={styles.daySection}>
                <div style={styles.dayHeader}>
                  <h3 style={styles.dayTitle}>{formatDateHeader(dateKey)}</h3>
                  <span style={styles.dayStats}>
                    {completedCount}/{totalCount} Completed ({completionRate}%)
                  </span>
                </div>

                <div style={styles.dayTracksContainer} className="glass-panel">
                  {dayTracks.map((track) => {
                    const isCompleted = track.status === 'Completed';
                    const isLater = track.status === 'Will Complete Later';
                    const isMissed = track.isMissed; // Pending is missed in history

                    return (
                      <div 
                        key={track.id} 
                        style={{
                          ...styles.trackRow,
                          ...(isMissed ? styles.trackRowMissed : {})
                        }}
                      >
                        <div style={styles.trackInfo}>
                          {isCompleted ? (
                            <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                          ) : isLater ? (
                            <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
                          ) : (
                            <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                          )}
                          
                          <div style={styles.trackText}>
                            <span style={{
                              ...styles.trackTitleText,
                              ...(isCompleted ? styles.completedText : {})
                            }}>
                              {track.title}
                            </span>
                            <span style={styles.trackTime}>
                              <Clock size={10} />
                              {track.time}
                            </span>
                          </div>
                        </div>

                        <div style={styles.trackStatusSection}>
                          {track.reminderResponse && (
                            <span style={styles.responseBadge}>
                              <PhoneIncoming size={10} />
                              Call Answer: {
                                track.reminderResponse === '1' ? 'Done' :
                                track.reminderResponse === '2' ? 'Later' : 'Pending'
                              }
                            </span>
                          )}
                          
                          {isCompleted ? (
                            <span style={{ ...styles.statusBadge, ...styles.badgeCompleted }}>
                              ✓ Ticked
                            </span>
                          ) : isLater ? (
                            <span style={{ ...styles.statusBadge, ...styles.badgeLater }}>
                              Postponed
                            </span>
                          ) : (
                            <span style={{ ...styles.statusBadge, ...styles.badgeMissed }}>
                              Missed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
    marginTop: '4px',
  },
  refreshButton: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    marginTop: '12px',
  },
  emptyCard: {
    padding: '60px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  emptySubText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '6px',
    maxWidth: '400px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  daySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'left',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '0 4px',
  },
  dayTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  dayStats: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  dayTracksContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  trackRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  trackRowMissed: {
    background: 'rgba(239, 68, 68, 0.01)',
  },
  trackInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  trackText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  trackTitleText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  completedText: {
    color: 'var(--text-secondary)',
  },
  trackTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  trackStatusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  responseBadge: {
    background: 'var(--primary-glow)',
    color: 'var(--primary-hover)',
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusBadge: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  badgeCompleted: {
    background: 'var(--accent-green-glow)',
    color: 'var(--accent-green)',
  },
  badgeLater: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--accent-amber)',
  },
  badgeMissed: {
    background: 'var(--accent-red-glow)',
    color: '#ef4444',
  },
  errorAlert: {
    background: 'var(--accent-red-glow)',
    border: '1px solid var(--accent-red)',
    color: '#f87171',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    textAlign: 'left',
  }
};
