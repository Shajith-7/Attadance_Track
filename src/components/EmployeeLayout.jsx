import React from 'react';
import { Home, Clock, Calendar, FileBarChart, User, Bell, Settings, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const EmployeeLayout = ({ user, theme, toggleTheme, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/');
  };

  return (
    <div className="flex animate-fade-in" style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside className="glass-panel flex-col" style={{ width: '260px', borderRadius: 0, borderRight: '1px solid var(--surface-border)', borderTop: 'none', borderBottom: 'none', borderLeft: 'none', padding: '1.5rem', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', zIndex: 10 }}>
        
        <div className="flex items-center gap-3" style={{ marginBottom: '2.5rem' }}>
          <div className="avatar" style={{ background: 'var(--primary)' }}>AS</div>
          <h2 className="text-h2" style={{ fontSize: '1.1rem', margin: 0 }}>Attendance System</h2>
        </div>

        <nav className="flex-col gap-2" style={{ flex: 1 }}>
          <NavLink to="/employee" end className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <Home size={18} className="mr-2" /> Dashboard
          </NavLink>
          <NavLink to="/employee/attendance" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <Clock size={18} className="mr-2" /> Attendance
          </NavLink>
          <NavLink to="/employee/leave" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <Calendar size={18} className="mr-2" /> Leave
          </NavLink>

          <NavLink to="/employee/reports" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <FileBarChart size={18} className="mr-2" /> My Reports
          </NavLink>
          <NavLink to="/employee/profile" className={({isActive}) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <User size={18} className="mr-2" /> My Profile
          </NavLink>
        </nav>

        <div className="flex-col gap-2" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}>
            <Bell size={18} className="mr-2" /> Notifications
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }} onClick={toggleTheme}>
            <Settings size={18} className="mr-2" /> Settings (Theme)
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', color: 'var(--danger)' }} onClick={handleLogout}>
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <header className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="text-h2" style={{ margin: 0 }}>Good Morning, {user.name.split(' ')[0]} 👋</h1>
            <p className="text-subtitle" style={{ margin: 0, marginTop: '0.25rem' }}>Here is your overview for today.</p>
          </div>
          <div className="user-profile glass-panel" style={{ padding: '0.5rem 1rem', border: '1px solid var(--surface-border)' }}>
             <div className="avatar">{user.name.split(' ').map(n=>n[0]).join('')}</div>
             <span style={{ fontWeight: 600 }}>{user.name}</span>
          </div>
        </header>

        {/* Dynamic Route Content Injected Here */}
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeeLayout;
