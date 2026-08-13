import React, { useState, useEffect } from 'react';
import { Calendar, Filter, ChevronLeft, ChevronRight, UserCheck, Home, Briefcase, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';

const EmployeeAttendance = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ present: 0, wfh: 0, leave: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [status, setStatus] = useState('All');
  const [workMode, setWorkMode] = useState('All');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        month,
        status,
        workMode
      });

      const response = await fetch(`${API_URL}/attendance/history?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance history');
      }

      const data = await response.json();
      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
      setSummary(data.summary || { present: 0, wfh: 0, leave: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, month, status, workMode]);

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    const d = new Date(timeString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-h2">Attendance History</h2>
        
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 'auto' }}>
            <Calendar size={18} />
            <input 
              type="month" 
              value={month} 
              onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none' }}
            />
          </div>
          
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 'auto' }}>
            <Filter size={18} />
            <select 
              value={status} 
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Working">Working</option>
              <option value="Leave">Leave</option>
              <option value="Late">Late</option>
            </select>
          </div>
          
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: 'auto' }}>
            <Filter size={18} />
            <select 
              value={workMode} 
              onChange={(e) => { setWorkMode(e.target.value); setPage(1); }}
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Modes</option>
              <option value="WFO">WFO</option>
              <option value="WFH">WFH</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 stagger-1">
        <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
          <div className="flex items-center gap-3">
            <UserCheck size={24} color="var(--success)" />
            <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Present</span>
          </div>
          <span className="text-h2">{summary.present}</span>
        </div>
        <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
          <div className="flex items-center gap-3">
            <Home size={24} color="var(--primary)" />
            <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>WFH</span>
          </div>
          <span className="text-h2">{summary.wfh}</span>
        </div>
        <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
          <div className="flex items-center gap-3">
            <Briefcase size={24} color="var(--warning)" />
            <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Leave</span>
          </div>
          <span className="text-h2">{summary.leave}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-panel stagger-2 flex-col gap-4">
        {loading ? (
          <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
            <div className="text-subtitle animate-pulse">Loading history...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center gap-2" style={{ minHeight: '300px', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
            <span className="text-subtitle">{error}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
            <div className="text-subtitle">No attendance records found for this period.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Total Hours</th>
                    <th>Work Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row._id}>
                      <td style={{ fontWeight: 500 }}>{formatDate(row.AttendanceDate)}</td>
                      <td>{formatTime(row.ClockIn)}</td>
                      <td>{formatTime(row.ClockOut)}</td>
                      <td>{row.TotalHours ? `${row.TotalHours} hrs` : '--'}</td>
                      <td>
                        <span className="text-subtitle" style={{ fontSize: '0.9rem' }}>{row.WorkMode}</span>
                      </td>
                      <td>
                        {['Working', 'Present'].includes(row.Status) && <span className="badge badge-success" style={{ display: 'inline-block' }}>{row.Status}</span>}
                        {row.Status === 'Leave' && <span className="badge badge-warning" style={{ display: 'inline-block' }}>{row.Status}</span>}
                        {row.Status === 'Late' && <span className="badge badge-danger" style={{ display: 'inline-block' }}>{row.Status}</span>}
                        {!['Working', 'Present', 'Leave', 'Late'].includes(row.Status) && <span className="badge badge-info" style={{ display: 'inline-block' }}>{row.Status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={handlePrevPage} 
                  disabled={page === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: page === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span className="text-subtitle">
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="btn btn-ghost" 
                  onClick={handleNextPage} 
                  disabled={page === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendance;
