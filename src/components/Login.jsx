import React, { useState } from 'react';
import { Lock, User, ShieldAlert } from 'lucide-react';
import { API_URL } from '../config';
// import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token2fa, setToken2fa] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  
  // const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, token2fa })
      });
      const data = await response.json();

      if (response.ok) {
        onLogin(data.user); // pass user state up
      } else if (data.require2FA) {
        setNeeds2fa(true);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    }
  };

  return (
    <div className="flex items-center" style={{ justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="flex-col items-center gap-2" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div className="avatar" style={{ width: 64, height: 64, marginBottom: '1rem' }}>
            <Lock size={32} />
          </div>
          <h2 className="text-h2">Welcome Back</h2>
          <p className="text-subtitle">Secure Attendance Management</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'flex', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex-col gap-4">
          {!needs2fa ? (
            <>
              <div className="flex-col gap-2">
            <label className="text-subtitle">Employee ID / Official Email</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }} 
                placeholder="EMP1024 or email@company.com"
                required
              />
            </div>
          </div>

              <div className="flex-col gap-2">
                <label className="text-subtitle">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-col gap-2">
              <label className="text-subtitle flex items-center gap-2"><ShieldAlert size={16}/> 2FA Token Required</label>
              <input 
                type="text" 
                value={token2fa}
                onChange={e => setToken2fa(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--bg-color)', color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }} 
                placeholder="000000"
                required
                maxLength={6}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
            {needs2fa ? 'Verify & Login' : 'Secure Login'}
          </button>
        </form>
          
        <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.5 }}>
          <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Secure Login System Active</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
