import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Briefcase, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { API_URL } from '../config';

const Dashboard = ({ theme }) => {
  const [data, setData] = useState({
    statsData: { totalEmployees: 0, presentToday: 0, absentToday: 0, onLeave: 0 },
    wfhVsWfoData: [],
    recentActivity: [],
    weeklyTrendData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_URL}/dashboard/ceo`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center p-8">Loading dashboard...</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 stagger-1">
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-subtitle">Total Employees</p>
            <h2 className="text-h2">{data.statsData.totalEmployees}</h2>
          </div>
          <Users size={32} color="var(--primary)" />
        </div>
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-subtitle">Present Today</p>
            <h2 className="text-h2">{data.statsData.presentToday}</h2>
          </div>
          <UserCheck size={32} color="var(--success)" />
        </div>
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-subtitle">Absent Today</p>
            <h2 className="text-h2">{data.statsData.absentToday}</h2>
          </div>
          <UserX size={32} color="var(--danger)" />
        </div>
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-subtitle">On Leave</p>
            <h2 className="text-h2">{data.statsData.onLeave}</h2>
          </div>
          <Briefcase size={32} color="var(--warning)" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 stagger-2">
        {/* WFH vs WFO Chart */}
        <div className="glass-panel">
          <h3 className="glass-title mb-4">Work Location</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.wfhVsWfoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.wfhVsWfoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
          <h3 className="glass-title mb-4">Weekly Attendance Trend</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }} />
                <Legend />
                <Bar dataKey="present" fill="var(--success)" name="Present" />
                <Bar dataKey="absent" fill="var(--danger)" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel stagger-3">
        <h3 className="glass-title flex items-center gap-2 mb-4">
          <Activity size={20} color="var(--primary)" /> Today's Recent Activity
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table w-100 text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <th className="p-3">Employee</th>
                <th className="p-3">Role</th>
                <th className="p-3">Time</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-subtitle">No activity recorded today.</td>
                </tr>
              ) : (
                data.recentActivity.map((activity) => (
                  <tr key={activity.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td className="p-3" style={{ fontWeight: 500 }}>{activity.name}</td>
                    <td className="p-3 text-subtitle">{activity.role}</td>
                    <td className="p-3">{activity.time}</td>
                    <td className="p-3">{activity.hours}</td>
                    <td className="p-3">{activity.location}</td>
                    <td className="p-3">
                      <span className={`badge ${activity.status === 'WFH' ? 'badge-success' : 'badge-warning'}`}>
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
