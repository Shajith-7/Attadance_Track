import React, { useState, useEffect } from 'react';
import { Play, Square, MapPin, Calendar, Clock, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';

const EmployeePortal = ({ theme }) => {
  const [clockedIn, setClockedIn] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, checking, verified, wfo
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockToggle = async () => {
    if (!clockedIn) {
      setLocationStatus('checking');
      
      // Simulate geolocation verification delay
      setTimeout(async () => {
        setLocationStatus('verified');
        
        try {
          // Phase 3: Connect to Backend API
          const response = await fetch(`${API_URL}/attendance/clock-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: 2, // Hardcoded Alex Johnson for demo
              location: 'Austin, TX',
              status: 'WFH'
            })
          });
          
          if (response.ok) {
            console.log('Successfully saved to MS SQL Database');
          }
        } catch (error) {
          console.error('Backend connection failed. Is the server running?', error);
        }

        setClockedIn(true);
      }, 1500);
    } else {
      setClockedIn(false);
      setLocationStatus('idle');
    }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Top Section: Clock In / Out & User Info */}
      <div className="grid grid-cols-3 stagger-1">
        
        {/* Clock Card */}
        <div className="glass-panel flex-col items-center justify-between" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem' }}>
          <div>
            <h2 className="text-subtitle" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <div style={{ fontSize: '4rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-2px' }}>
              {currentTime.toLocaleTimeString()}
            </div>
          </div>

          <div style={{ marginTop: '2rem', width: '100%', maxWidth: '400px' }}>
            <button 
              className={`btn ${clockedIn ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '12px', 
                       backgroundColor: clockedIn ? 'var(--danger)' : 'var(--primary)' }}
              onClick={handleClockToggle}
              disabled={locationStatus === 'checking'}
            >
              {locationStatus === 'checking' ? (
                <>Verifying Location...</>
              ) : clockedIn ? (
                <><Square size={24} /> Clock Out</>
              ) : (
                <><Play size={24} /> Clock In</>
              )}
            </button>
          </div>

          {/* Location Verification Indicator */}
          <div style={{ marginTop: '1.5rem', minHeight: '30px' }}>
            {locationStatus === 'checking' && (
              <span className="badge badge-warning"><MapPin size={14} className="mr-1"/> Fetching GPS / IP Data...</span>
            )}
            {locationStatus === 'verified' && (
              <span className="badge badge-info"><ShieldCheck size={14} className="mr-1"/> WFH Location Verified (Austin, TX)</span>
            )}
            {locationStatus === 'wfo' && (
              <span className="badge badge-success"><ShieldCheck size={14} className="mr-1"/> WFO Confirmed (Office IP)</span>
            )}
          </div>
        </div>

        {/* Employee Summary Card */}
        <div className="glass-panel flex-col gap-4">
          <div className="glass-header" style={{ marginBottom: 0 }}>
            <span className="glass-title">My Summary</span>
          </div>
          
          <div className="flex-col gap-2">
            <div className="flex justify-between items-center" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
              <span className="text-subtitle flex items-center gap-2"><Clock size={16}/> This Week</span>
              <span style={{ fontWeight: 600 }}>0h 0m</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
              <span className="text-subtitle flex items-center gap-2"><CheckCircle2 size={16} color="var(--success)"/> Attendance</span>
              <span style={{ fontWeight: 600 }}>--%</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--surface-border)' }}>
              <span className="text-subtitle flex items-center gap-2"><Calendar size={16}/> Leave Balance</span>
              <span style={{ fontWeight: 600 }}>0 Days</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Leave Request */}
      <div className="grid grid-cols-2 stagger-2">
        <div className="glass-panel">
          <div className="glass-header">
            <span className="glass-title">Request Leave</span>
          </div>
          <form className="flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex gap-4">
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-subtitle">Leave Type</label>
                <select style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Vacation</option>
                </select>
              </div>
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-subtitle">Date</label>
                <input type="date" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex-col gap-2">
              <label className="text-subtitle">Reason (Optional)</label>
              <textarea rows="3" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} placeholder="I will be unavailable due to..."></textarea>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Request</button>
          </form>
        </div>

        <div className="glass-panel">
          <div className="glass-header">
            <span className="glass-title">Recent Logs</span>
          </div>
          <div className="flex-col gap-4">
            <div className="text-center text-subtitle" style={{ padding: '2rem' }}>
              No recent logs found.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EmployeePortal;
