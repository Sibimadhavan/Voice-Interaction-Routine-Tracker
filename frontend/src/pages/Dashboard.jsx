import React from 'react';
import { 
  User, 
  Phone, 
  ShieldCheck, 
  LogOut, 
  Clock
} from 'lucide-react';

export default function Dashboard({ token, user, onLogout }) {
  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        
        {/* Top Header */}
        <div style={styles.header}>
          {/* Main Greeting */}
          <h1 className="text-gradient" style={{ ...styles.mainTitle, textTransform: 'none' }}>
            HELLO WELDER!
          </h1>
        </div>

        {/* User Profile Info Grid */}
        <div style={styles.infoSection}>
          <h3 style={styles.infoTitle}>Profile Specifications</h3>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoRow}>
              <div style={styles.iconContainer}>
                <User size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={styles.infoDetails}>
                <span style={styles.infoLabel}>Full Name</span>
                <span style={styles.infoValue}>{user.name || 'N/A'}</span>
              </div>
            </div>

            <div style={styles.infoRow}>
              <div style={styles.iconContainer}>
                <Phone size={16} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div style={styles.infoDetails}>
                <span style={styles.infoLabel}>Registered Phone</span>
                <span style={styles.infoValue}>{user.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions / Log Out */}
        <div style={styles.footer}>
          <button onClick={onLogout} style={styles.logoutButton}>
            <LogOut size={16} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    padding: '40px 20px',
    background: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    padding: '40px',
    borderRadius: '24px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
  },
  glowSpot: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--accent-green-glow)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  badgeText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-green)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: '36px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    textTransform: 'lowercase',
    lineHeight: '1.2',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '280px',
    margin: '0 auto',
  },
  infoSection: {
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '30px',
  },
  infoTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid var(--border-color)',
  },
  infoDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
  },
  logoutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    outline: 'none',
  },
};
