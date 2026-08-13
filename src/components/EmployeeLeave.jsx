import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { API_URL } from '../config';

const EmployeeLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/leaves/my-leaves`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/leaves/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Leave application submitted!');
        setFormData({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
        fetchLeaves(); // Refresh list
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit leave');
      }
    } catch (error) {
      console.error(error);
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Top Leave Balances */}
      <div className="grid grid-cols-3 stagger-1">
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
          <div className="stat-header">
            <span className="text-subtitle">Casual Leave</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>0 Days</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
          <div className="stat-header">
            <span className="text-subtitle">Sick Leave</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>0 Days</div>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
          <div className="stat-header">
            <span className="text-subtitle">Annual Leave</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>0 Days</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 stagger-2">
        {/* Leave Requests Table */}
        <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
          <div className="glass-header">
            <span className="glass-title">My Requests</span>
          </div>
          
          <table className="glass-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length > 0 ? leaves.map((leave) => (
                <tr key={leave._id}>
                  <td style={{ fontWeight: 500 }}>{leave.LeaveType}</td>
                  <td>{new Date(leave.StartDate).toLocaleDateString()}</td>
                  <td>{new Date(leave.EndDate).toLocaleDateString()}</td>
                  <td>
                    {Math.ceil((new Date(leave.EndDate) - new Date(leave.StartDate)) / (1000 * 60 * 60 * 24)) + 1}
                  </td>
                  <td>
                    {leave.Status === 'Pending' && <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> Pending</span>}
                    {leave.Status === 'Approved' && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12}/> Approved</span>}
                    {leave.Status === 'Rejected' && <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12}/> Rejected</span>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center text-subtitle" style={{ padding: '2rem' }}>
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Apply Leave Form */}
        <div className="glass-panel">
          <div className="glass-header">
            <span className="glass-title">Apply Leave</span>
          </div>
          
          <form className="flex-col gap-4 mt-4" onSubmit={handleSubmit}>
            <div className="flex-col gap-2">
              <label className="text-subtitle">Leave Type</label>
              <select 
                className="glass-input" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                value={formData.leaveType}
                onChange={e => setFormData({...formData, leaveType: e.target.value})}
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Earned">Earned Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>
            
            <div className="flex-col gap-2">
              <label className="text-subtitle">From Date</label>
              <input 
                type="date" 
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>

            <div className="flex-col gap-2">
              <label className="text-subtitle">To Date</label>
              <input 
                type="date" 
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>

            <div className="flex-col gap-2">
              <label className="text-subtitle">Reason</label>
              <textarea 
                rows={3} 
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
                placeholder="E.g., Medical appointment..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}>
              {loading ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default EmployeeLeave;
