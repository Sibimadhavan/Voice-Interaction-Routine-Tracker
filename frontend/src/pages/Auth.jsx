import React, { useState, useEffect, useRef } from 'react';
import { Phone, User, ShieldCheck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'calling' | 'name'
  const [digit, setDigit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  
  const pollIntervalRef = useRef(null);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleStartAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Ensure phone starts with +
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Quick regex validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      setError('Phone number must start with "+" followed by country code and digits (e.g., +919876543210)');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login/start' : '/api/auth/register/start';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to initiate verification call.');
      }
      
      setDigit(result.data.digit);
      setPhone(formattedPhone);
      setStep('calling');
      setStatusMessage('Initiating call via Twilio... Please wait.');
      
      // Start polling status
      startStatusPolling(formattedPhone);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = (verifiedPhone) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    let attempts = 0;
    const mode = isLogin ? 'login' : 'register';
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      setStatusMessage(`Waiting for call to connect and digit to be pressed (Attempt ${attempts})...`);
      
      try {
        const response = await fetch(`/api/auth/status?phone=${encodeURIComponent(verifiedPhone)}&mode=${mode}`);
        const result = await response.json();
        
        if (response.ok && result.data.verified) {
          clearInterval(pollIntervalRef.current);
          setStatusMessage('Phone verified successfully!');
          
          if (isLogin) {
            handleCompleteLogin(verifiedPhone);
          } else {
            setStep('name');
          }
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
      }
      
      // Stop polling after 120 seconds (60 attempts)
      if (attempts >= 60) {
        clearInterval(pollIntervalRef.current);
        setError('Verification timed out. Please try again.');
        setStep('input');
      }
    }, 2000);
  };

  const handleCompleteLogin = async (verifiedPhone) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone })
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Login completion failed.');
      }
      
      onLoginSuccess(result.data.token, result.data.user);
    } catch (err) {
      setError(err.message);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: name.trim() })
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Registration completion failed.');
      }
      
      onLoginSuccess(result.data.token, result.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // DEVELOPER UTILITY: Mocks Twilio webhook callback locally
  const triggerDeveloperMock = async () => {
    if (!phone || !digit) return;
    setStatusMessage('Simulating Twilio callback keypress...');
    
    try {
      // Build form-urlencoded body just like Twilio would
      const formData = new URLSearchParams();
      formData.append('Digits', digit.toString());
      
      const response = await fetch(`/api/webhooks/twilio/verify-digit?phone=${encodeURIComponent(phone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      
      if (response.ok) {
        console.log('Developer Mock successfully sent webhook response.');
      } else {
        console.error('Developer Mock failed.');
      }
    } catch (err) {
      console.error('Error triggering developer mock callback:', err);
    }
  };

  const resetFlow = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStep('input');
    setError('');
    setStatusMessage('');
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <div style={styles.header}>
          <div style={styles.logoContainer}>⏰</div>
          <h1 style={styles.title} className="text-gradient">HabitLoop</h1>
          <p style={styles.subtitle}>Daily Routine Tracker with Outbound Reminders</p>
        </div>

        {error && (
          <div style={styles.errorAlert} className="animate-shake">
            <span>⚠️ {error}</span>
          </div>
        )}

        {step === 'input' && (
          <div>
            <div style={styles.tabContainer}>
              <button 
                style={{ ...styles.tab, ...(isLogin ? styles.activeTab : {}) }}
                onClick={() => { setIsLogin(true); setError(''); }}
              >
                Sign In
              </button>
              <button 
                style={{ ...styles.tab, ...(!isLogin ? styles.activeTab : {}) }}
                onClick={() => { setIsLogin(false); setError(''); }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleStartAuth}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Mobile Number</label>
                <div style={styles.inputWrapper}>
                  <Phone size={18} style={styles.inputIcon} />
                  <input
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
                <small style={styles.helpText}>Include "+" and country code. E.g., +91 for India.</small>
              </div>

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>{isLogin ? 'Send Call Code' : 'Verify Phone Call'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'calling' && (
          <div style={styles.callingContainer}>
            <div style={styles.pulseContainer} className="animate-pulse-glow">
              <span style={styles.digitDisplay}>{digit}</span>
            </div>
            
            <h2 style={styles.callingTitle}>Answering Call Verification</h2>
            <p style={styles.callingDesc}>
              We are calling <strong>{phone}</strong>. Answer and press the digit shown above on your phone's keypad.
            </p>
            
            <div style={styles.statusBox}>
              <Loader2 className="animate-spin" size={16} style={{ color: 'var(--primary)' }} />
              <span style={styles.statusText}>{statusMessage}</span>
            </div>

            <button onClick={resetFlow} style={styles.secondaryButton}>
              <RefreshCw size={14} />
              <span>Restart Process</span>
            </button>
          </div>
        )}

        {step === 'name' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={styles.successIcon}>✓</div>
              <h2 style={styles.callingTitle}>Number Verified!</h2>
              <p style={styles.callingDesc}>Complete your profile to create your HabitLoop account.</p>
            </div>

            <form onSubmit={handleCompleteRegister}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Your Name</label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Complete Registration'}
              </button>
            </form>
          </div>
        )}
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
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px 30px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logoContainer: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  tabContainer: {
    display: 'flex',
    background: 'var(--bg-tertiary)',
    padding: '4px',
    borderRadius: '10px',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  activeTab: {
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: 'var(--text-primary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 44px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
  },
  inputFocus: {
    borderColor: 'var(--primary)',
  },
  helpText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  button: {
    width: '100%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '24px',
  },
  errorAlert: {
    background: 'var(--accent-red-glow)',
    border: '1px solid var(--accent-red)',
    color: '#f87171',
    padding: '12px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '13px',
    textAlign: 'left',
  },
  callingContainer: {
    textAlign: 'center',
    padding: '10px 0',
  },
  pulseContainer: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '2px solid var(--primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 24px auto',
  },
  digitDisplay: {
    fontSize: '36px',
    fontWeight: '700',
    color: 'var(--primary-hover)',
  },
  callingTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  callingDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'var(--bg-secondary)',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid var(--border-color)',
  },
  statusText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  secondaryButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: '6px',
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'var(--accent-green-glow)',
    border: '2px solid var(--accent-green)',
    color: 'var(--accent-green)',
    fontSize: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px auto',
  },
  devTools: {
    background: 'rgba(245, 158, 11, 0.05)',
    border: '1px dashed var(--accent-amber)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  devToolsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--accent-amber)',
    marginBottom: '10px',
  },
  devButton: {
    background: 'var(--accent-amber)',
    color: 'black',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  }
};
