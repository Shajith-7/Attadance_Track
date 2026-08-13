import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const AdminSetup = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/register-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Admin account created successfully! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-panel animate-fade-in">
                <div className="login-header">
                    <h2 className="text-h2">Initial Admin Setup</h2>
                    <p className="text-subtitle" style={{ marginTop: '0.5rem' }}>Create the first administrator account to configure the system.</p>
                </div>
                
                {error && <div className="badge badge-danger" style={{ marginBottom: '1.5rem', display: 'block', padding: '0.75rem', textAlign: 'center' }}>{error}</div>}
                {success && <div className="badge badge-success" style={{ marginBottom: '1.5rem', display: 'block', padding: '0.75rem', textAlign: 'center' }}>{success}</div>}
                
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>First Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Last Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            className="form-control" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Admin Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminSetup;
