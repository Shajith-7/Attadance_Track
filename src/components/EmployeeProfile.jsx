import React from 'react';

const EmployeeProfile = ({ user }) => {
  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="flex items-center gap-6" style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div className="avatar" style={{ width: 100, height: 100, fontSize: '2.5rem', background: 'var(--primary)' }}>
            {user?.name?.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <h2 className="text-h2" style={{ margin: 0, marginBottom: '0.25rem' }}>{user?.name}</h2>
            <p className="text-subtitle" style={{ margin: 0 }}>{user?.email || 'employee@company.com'}</p>
            <div className="badge badge-success mt-2" style={{ display: 'inline-block' }}>Active</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Employee ID</span>
            <span style={{ fontWeight: 600 }}>EMP-1024</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Department</span>
            <span style={{ fontWeight: 600 }}>Data Analytics</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Designation</span>
            <span style={{ fontWeight: 600 }}>Data Analyst</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Joining Date</span>
            <span style={{ fontWeight: 600 }}>01/06/2026</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Manager</span>
            <span style={{ fontWeight: 600 }}>Alex Johnson</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Work Location</span>
            <span style={{ fontWeight: 600 }}>Chennai</span>
          </div>
          <div className="flex-col gap-1">
            <span className="text-subtitle" style={{ fontSize: '0.875rem' }}>Work Mode</span>
            <span style={{ fontWeight: 600 }}>Hybrid</span>
          </div>
        </div>

        <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <p className="text-subtitle" style={{ fontSize: '0.875rem' }}>
            To update these details, please contact HR.
          </p>
        </div>
      </div>

    </div>
  );
};

export default EmployeeProfile;
