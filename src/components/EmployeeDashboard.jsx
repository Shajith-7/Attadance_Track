import React, { useState, useEffect } from 'react';
import { UserCheck, Briefcase, Home } from 'lucide-react';
import NightShiftTimer from './NightShiftTimer';
import { API_URL } from '../config';

const EmployeeDashboard = ({ user }) => {
  const [summary, setSummary] = useState({ present: 0, leave: 0, wfh: 0 });
  const [recentHistory, setRecentHistory] = useState([]);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard summary
      const dashRes = await fetch(`${API_URL}/dashboard/employee`, { credentials: 'include' });
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setSummary(dashData.summary);
        setRecentHistory(dashData.recentHistory);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="flex-col gap-6 animate-fade-in">

      <div className="grid grid-cols-3 gap-6 stagger-1">
        {/* Main Clock In Action Center - Now using the Screen Recording Timer for everyone */}
        <div style={{ gridColumn: 'span 2' }}>
            <NightShiftTimer user={user} />
        </div>

        {/* Summary Cards */}
        <div className="flex-col gap-4">
          <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3">
              <UserCheck size={24} color="var(--success)" />
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Present</span>
            </div>
            <span className="text-h2">{summary.present}</span>
          </div>
          <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3">
              <Briefcase size={24} color="var(--warning)" />
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Leave</span>
            </div>
            <span className="text-h2">{summary.leave}</span>
          </div>
          <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-3">
              <Home size={24} color="var(--primary)" />
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>WFH</span>
            </div>
            <span className="text-h2">{summary.wfh}</span>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="glass-panel stagger-2">
        <h3 className="glass-title" style={{ marginBottom: '1rem' }}>Recent Attendance</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.length > 0 ? recentHistory.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 500 }}>{row.date}</td>
                  <td>{row.clockIn}</td>
                  <td>{row.clockOut}</td>
                  <td>{row.hours}</td>
                  <td>
                    {row.status === 'Working' && <span className="badge badge-warning" style={{ display: 'inline-block' }}>Working</span>}
                    {row.status === 'Present' && <span className="badge badge-success" style={{ display: 'inline-block' }}>Present</span>}
                    {row.status === 'Leave' && <span className="badge badge-info" style={{ display: 'inline-block' }}>Leave</span>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center text-subtitle" style={{ padding: '2rem' }}>
                    No recent attendance records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default EmployeeDashboard;
