import React, { useState } from 'react';
import { UserPlus, Mail, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { API_URL } from '../config';

const AddEmployee = ({ theme }) => {
  const [formData, setFormData] = useState({
    email: '',
    roleId: '1' // 1=Employee, 4=Admin (CEO)
  });

  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await fetch(`${API_URL}/employees/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          roleId: Number(formData.roleId)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        if (data.previewUrl) {
           setInviteLink(data.previewUrl);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to invite employee');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Cannot connect to server.');
    }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-h2 flex items-center gap-2">
          <UserPlus size={28} color="var(--primary)" /> Invite Employee
        </h2>
      </div>

      {status === 'success' ? (
        <div className="glass-panel text-center" style={{ padding: '3rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
          <h2 className="text-h2 mb-2">Invitation Sent Successfully!</h2>
          <p className="text-subtitle" style={{ marginBottom: '2rem' }}>
            An email has been sent to <strong>{formData.email}</strong> with instructions to set up their account.
          </p>
          
          {inviteLink && (
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '2rem' }}>
              <span className="text-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>Development Email Preview:</span>
              <a href={inviteLink} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                {inviteLink}
              </a>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => {
            setStatus('idle');
            setFormData({...formData, email: ''});
          }}>
            Invite Another Employee
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {status === 'error' && (
            <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', padding: '1rem', borderRadius: '8px' }}>
              <AlertCircle size={18} /> {message}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex-col gap-6">
            
            <div className="flex-col gap-2">
              <label className="text-subtitle">Employee Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="glass-input" style={{ paddingLeft: '2.5rem' }} placeholder="employee@company.com" required />
              </div>
            </div>

            <div className="flex-col gap-2">
              <label className="text-subtitle">System Role *</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <select name="roleId" value={formData.roleId} onChange={handleChange} className="glass-input" style={{ paddingLeft: '2.5rem', width: '100%' }}>
                  <option value="1">Employee</option>
                  <option value="4">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ width: '100%', padding: '1rem 2rem' }}>
                {status === 'loading' ? 'Sending Invitation...' : 'Send Invitation Link'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddEmployee;
