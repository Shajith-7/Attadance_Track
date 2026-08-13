import React, { useState, useEffect } from 'react';
import { Lock, UserCheck, AlertCircle, User, Mail, Hash, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

const SetupAccount = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('details'); // details, otp, success
  const [status, setStatus] = useState('loading_user'); // loading_user, idle, loading, error
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Extract token from URL
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing invitation token.');
      return;
    }

    const fetchUserDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/setup/${token}`);
        if (res.ok) {
          const data = await res.json();
          setUserDetails(data);
          setStatus('idle');
        } else {
          setStatus('error');
          setMessage('Invalid or expired invitation link.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Cannot connect to server.');
      }
    };

    fetchUserDetails();
  }, [token]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (!agreed) {
      setStatus('error');
      setMessage('You must agree to the company terms.');
      return;
    }
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing invitation token.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/auth/setup/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, employeeId })
      });
      
      const data = await response.json();
      if (response.ok) {
        setStatus('idle');
        setStep('otp');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Cannot connect to server.');
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    
    if (otp.length < 6) {
      setStatus('error');
      setMessage('Please enter a valid 6-digit OTP.');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, firstName, lastName, employeeId, otp })
      });
      
      const data = await response.json();
      if (response.ok) {
        setStatus('idle');
        setStep('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to setup account');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Cannot connect to server.');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex items-center" style={{ justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-panel text-center animate-fade-in" style={{ maxWidth: '400px' }}>
          <UserCheck size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 className="text-h2">Account Activated</h2>
          <p className="text-subtitle" style={{ marginBottom: '1.5rem' }}>Your account is securely set up and ready to use.</p>
          <a href="/" className="btn btn-primary" style={{ display: 'block', width: '100%', padding: '1rem', textDecoration: 'none' }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (status === 'loading_user') {
    return <div className="flex items-center" style={{ justifyContent: 'center', minHeight: '80vh' }}>Loading...</div>;
  }

  return (
    <div className="flex items-center" style={{ justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="flex-col items-center gap-2" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div className="avatar" style={{ width: 64, height: 64, marginBottom: '1rem', background: 'var(--primary)' }}>
            {step === 'otp' ? <ShieldCheck size={32} color="white" /> : <Lock size={32} color="white" />}
          </div>
          <h2 className="text-h2">{step === 'otp' ? 'Email Verification' : 'Activate Your Account'}</h2>
          <p className="text-subtitle">{step === 'otp' ? 'Enter the 6-digit OTP sent to your email.' : 'Verify your details and create a password.'}</p>
        </div>

        {status === 'error' && (
          <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px', whiteSpace: 'normal', textAlign: 'left' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {message}
          </div>
        )}

        {step === 'otp' && status === 'idle' && message && !message.includes('error') && (
          <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px', whiteSpace: 'normal', textAlign: 'left' }}>
            <ShieldCheck size={16} style={{ flexShrink: 0 }} /> {message}
          </div>
        )}

        {userDetails && step === 'details' && (
          <form onSubmit={handleSendOtp} className="flex-col gap-4 animate-fade-in">
            {/* Editable Details */}
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
              <div className="flex-col gap-1">
                <span className="text-subtitle" style={{ fontSize: '0.75rem' }}>First Name</span>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                  className="glass-input" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                  required
                />
              </div>
              <div className="flex-col gap-1">
                <span className="text-subtitle" style={{ fontSize: '0.75rem' }}>Last Name</span>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                  className="glass-input" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                  required
                />
              </div>
              <div className="flex-col gap-1">
                <span className="text-subtitle" style={{ fontSize: '0.75rem' }}>Employee ID</span>
                <input 
                  type="number" 
                  value={employeeId} 
                  onChange={e => setEmployeeId(e.target.value)} 
                  className="glass-input" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                  required
                />
              </div>
              <div className="flex-col gap-1">
                <span className="text-subtitle" style={{ fontSize: '0.75rem' }}>Official Email</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <Mail size={14} /> <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{userDetails.email}</span>
                </div>
              </div>
            </div>

            <div className="flex-col gap-2">
              <label className="text-subtitle">Create Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }} 
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex-col gap-2">
              <label className="text-subtitle">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }} 
                placeholder="••••••••"
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
              <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>I agree to the company terms</span>
            </label>

            <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
              {status === 'loading' ? 'Sending OTP...' : 'Send OTP to Email'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleSetup} className="flex-col gap-4 animate-fade-in">
            <div className="flex-col gap-2">
              <label className="text-subtitle" style={{ textAlign: 'center' }}>One-Time Password</label>
              <input 
                type="text" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }} 
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            
            <div className="flex gap-4" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('details')} disabled={status === 'loading'} style={{ width: '100%', padding: '1rem', borderRadius: '8px' }}>
                Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ width: '100%', padding: '1rem', borderRadius: '8px' }}>
                {status === 'loading' ? 'Verifying...' : 'Activate Account'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default SetupAccount;
