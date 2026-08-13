import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import SetupAccount from './components/SetupAccount';
import AdminSetup from './components/AdminSetup';
import AddEmployee from './components/AddEmployee';
import EmployeeLayout from './components/EmployeeLayout';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeLeave from './components/EmployeeLeave';
import EmployeeProfile from './components/EmployeeProfile';
import EmployeeAttendance from './components/EmployeeAttendance';
import EmployeeReports from './components/EmployeeReports';
import AdminLeaveManagement from './components/AdminLeaveManagement';
import AdminEmployees from './components/AdminEmployees';
import NightShiftMonitor from './components/NightShiftMonitor';
import './App.css';
import { Moon, Sun, LogOut } from 'lucide-react';
import { API_URL } from './config';

// A simple wrapper to handle auth and legacy Admin view
const AuthWrapper = () => {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const firstRunRes = await fetch(`${API_URL}/auth/check-first-run`);
        if (firstRunRes.ok) {
          const data = await firstRunRes.json();
          setIsFirstRun(data.isFirstRun);
        }

        const response = await fetch(`${API_URL}/auth/me`, {credentials: 'include'});
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (err) {}
      setLoading(false);
    };
    checkAuth();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
    } catch (error) {}
  };

  if (loading) return <div className="container" style={{textAlign: 'center', marginTop: '20vh'}}>Loading...</div>;

  if (!user) {
    if (isFirstRun) {
      return (
        <Routes>
          <Route path="/setup-admin" element={<AdminSetup />} />
          <Route path="*" element={<Navigate to="/setup-admin" replace />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route path="/setup-account" element={<SetupAccount />} />
        <Route path="*" element={<Login onLogin={(u) => { setUser(u); navigate(u.role === 'Admin' || u.role === 'HR' || u.role === 'Manager' ? '/admin' : '/employee'); }} />} />
      </Routes>
    );
  }

  const isPrivileged = user.role === 'Admin' || user.role === 'HR' || user.role === 'Manager';

  return (
    <Routes>
      {/* Employee Routes (New Redesign) */}
      <Route path="/employee" element={<EmployeeLayout user={user} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />}>
        <Route index element={<EmployeeDashboard user={user} />} />
        <Route path="attendance" element={<EmployeeAttendance />} />
        <Route path="leave" element={<EmployeeLeave />} />
        <Route path="reports" element={<EmployeeReports />} />
        <Route path="profile" element={<EmployeeProfile user={user} />} />
      </Route>

      {/* Admin View */}
      {isPrivileged && (
        <Route path="/admin/*" element={
          <div className="container animate-fade-in">
            <header className="app-header">
              <div className="header-left">
                <h1 className="text-h2">Admin Dashboard</h1>
                <div className="flex gap-4 mt-4" style={{ marginTop: '1rem', background: 'var(--surface-color)', padding: '0.25rem', borderRadius: '12px', display: 'inline-flex', flexWrap: 'wrap' }}>
                  <NavLink to="/admin" end className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Overview</NavLink>
                  <NavLink to="/admin/employees" end className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Employees</NavLink>
                  <NavLink to="/admin/leave" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Leaves</NavLink>
                  <NavLink to="/admin/employees/add" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Add Employee</NavLink>
                  <NavLink to="/admin/live" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>Live Dashboard</NavLink>
                </div>
              </div>
              <div className="header-right">
                <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <div className="user-profile">
                  <div className="avatar">{user.name.split(' ').map(n=>n[0]).join('')}</div>
                  <button className="btn btn-ghost btn-icon" onClick={handleLogout}><LogOut size={16} color="var(--danger)" /></button>
                </div>
              </div>
            </header>
            <main style={{ marginTop: '2rem' }}>
              <Routes>
                <Route index element={<Dashboard theme={theme} />} />
                <Route path="employees" element={<AdminEmployees />} />
                <Route path="leave" element={<AdminLeaveManagement />} />
                <Route path="employees/add" element={<AddEmployee theme={theme} />} />
                <Route path="live" element={<NightShiftMonitor />} />
              </Routes>
            </main>
          </div>
        } />
      )}

      {/* Default fallback */}
      <Route path="*" element={<Navigate to={isPrivileged ? '/admin' : '/employee'} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthWrapper />
    </Router>
  );
}

export default App;
