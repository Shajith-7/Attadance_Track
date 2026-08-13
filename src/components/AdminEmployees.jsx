import React, { useState, useEffect } from 'react';
import { Users, Mail, Building, Home, Briefcase, Search } from 'lucide-react';
import { API_URL } from '../config';

const AdminEmployees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employees`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch employees');
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        `${emp.FirstName} ${emp.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.EmployeeID?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-subtitle">Loading employees...</div>;
    if (error) return <div className="p-8 text-center text-danger">Error: {error}</div>;

    return (
        <div className="animate-fade-in flex-col gap-6">
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="text-h3 flex gap-2" style={{ alignItems: 'center' }}>
                    <Users size={24} color="var(--primary)" /> Employee Directory
                </h2>
                
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input 
                        type="text" 
                        placeholder="Search employees..." 
                        className="glass-input" 
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="w-100" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-color)' }}>
                            <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Employee</th>
                            <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Emp ID</th>
                            <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                            <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Department</th>
                            <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Work Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center p-8 text-subtitle">No employees found.</td>
                            </tr>
                        ) : (
                            filteredEmployees.map(emp => (
                                <tr key={emp._id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div className="flex gap-3" style={{ alignItems: 'center' }}>
                                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.875rem' }}>
                                                {emp.FirstName?.[0]}{emp.LastName?.[0]}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{emp.FirstName} {emp.LastName}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{emp.EmployeeID || 'N/A'}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div className="flex gap-2" style={{ alignItems: 'center', color: 'var(--text-secondary)' }}>
                                            <Mail size={14} /> {emp.Email}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div className="flex gap-2" style={{ alignItems: 'center', color: 'var(--text-secondary)' }}>
                                            <Briefcase size={14} /> {emp.Department || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span className="badge badge-success flex gap-1" style={{ alignItems: 'center', width: 'fit-content' }}>
                                            <Home size={12} /> WFH
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminEmployees;
