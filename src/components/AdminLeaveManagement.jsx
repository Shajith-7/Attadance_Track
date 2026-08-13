import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, User, Briefcase } from 'lucide-react';
import { API_URL } from '../config';

const AdminLeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState('Pending'); // All, Pending, Approved, Rejected
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/leaves/all`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/leaves/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Optimistic UI update
        setLeaves(leaves.map(l => l._id === id ? { ...l, Status: newStatus } : l));
      } else {
        alert('Failed to update leave status');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const filteredLeaves = filter === 'All' ? leaves : leaves.filter(l => l.Status === filter);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="glass-panel">
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <h2 className="glass-title">Leave Requests</h2>
          <div className="flex gap-2 bg-surface p-1 rounded-lg" style={{ background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '8px' }}>
            {['Pending', 'Approved', 'Rejected', 'All'].map(f => (
              <button 
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} 
                style={{ padding: '0.5rem 1rem' }}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-subtitle" style={{ padding: '3rem' }}>Loading leaves...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type & Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length > 0 ? filteredLeaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
                          {leave.EmployeeID.FirstName[0]}{leave.EmployeeID.LastName[0]}
                        </div>
                        <div className="flex-col">
                          <span style={{ fontWeight: 600 }}>{leave.EmployeeID.FirstName} {leave.EmployeeID.LastName}</span>
                          <span className="text-subtitle" style={{ fontSize: '0.75rem' }}>{leave.EmployeeID.EmployeeID} • {leave.EmployeeID.Department}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex-col">
                        <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Briefcase size={14} /> {leave.LeaveType}
                        </span>
                        <span className="text-subtitle" style={{ fontSize: '0.85rem' }}>
                          {new Date(leave.StartDate).toLocaleDateString()} - {new Date(leave.EndDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'normal', fontSize: '0.875rem' }}>
                      {leave.Reason}
                    </td>
                    <td>
                      {leave.Status === 'Pending' && <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> Pending</span>}
                      {leave.Status === 'Approved' && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12}/> Approved</span>}
                      {leave.Status === 'Rejected' && <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12}/> Rejected</span>}
                    </td>
                    <td>
                      {leave.Status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--success)', border: '1px solid var(--success)' }} onClick={() => handleUpdateStatus(leave._id, 'Approved')}>
                            Approve
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => handleUpdateStatus(leave._id, 'Rejected')}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-subtitle" style={{ fontSize: '0.85rem' }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center text-subtitle" style={{ padding: '3rem' }}>
                      No {filter.toLowerCase()} leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaveManagement;
