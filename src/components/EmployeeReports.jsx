import React, { useState, useEffect } from 'react';
import { Calendar, Download, AlertCircle, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from '../config';

const EmployeeReports = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ present: 0, leave: 0, wfh: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date Range State
  const [dateRangeType, setDateRangeType] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = () => {
    const today = new Date();
    let start, end;

    if (dateRangeType === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRangeType === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (dateRangeType === 'last3Months') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRangeType === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    } else if (dateRangeType === 'custom') {
      start = customStart ? new Date(customStart) : new Date();
      end = customEnd ? new Date(customEnd) : new Date();
    }
    return { start, end };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { start, end } = getDateRange();
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const queryParams = new URLSearchParams({
        limit: 'all',
        startDate: startStr,
        endDate: endStr
      });

      const response = await fetch(`${API_URL}/attendance/history?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      setReportData(data.records || []);
      setSummary(data.summary || { present: 0, leave: 0, wfh: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRangeType !== 'custom' || (customStart && customEnd)) {
      fetchReportData();
    }
  }, [dateRangeType, customStart, customEnd]);

  // Derived Stats
  const getWeekdaysCount = (start, end) => {
    let count = 0;
    let cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const { start, end } = getDateRange();
  const totalWorkingDays = getWeekdaysCount(start, end);
  
  const totalHours = reportData.reduce((acc, curr) => acc + (curr.TotalHours || 0), 0);
  const avgHours = summary.present > 0 ? (totalHours / summary.present) : 0;
  
  // Calculate absent (Total Weekdays - Present - Leave). Cap at 0 minimum.
  const absentDays = Math.max(0, totalWorkingDays - summary.present - summary.leave);
  
  const attendancePercentage = totalWorkingDays > 0 
    ? ((summary.present / totalWorkingDays) * 100).toFixed(1) 
    : 0;

  // Chart Data Preparation
  const chartData = reportData.map(r => {
    const d = new Date(r.AttendanceDate);
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      hours: r.TotalHours || 0,
      status: r.Status
    };
  }).reverse(); // chronological

  const pieData = [
    { name: 'WFO', value: summary.present - summary.wfh },
    { name: 'WFH', value: summary.wfh }
  ].filter(d => d.value > 0);

  const COLORS = ['var(--primary)', 'var(--success)'];

  // Export CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Clock In,Clock Out,Total Hours,Work Mode,Status\n";
    
    reportData.forEach(row => {
      const date = new Date(row.AttendanceDate).toLocaleDateString('en-GB');
      const cin = row.ClockIn ? new Date(row.ClockIn).toLocaleTimeString() : '';
      const cout = row.ClockOut ? new Date(row.ClockOut).toLocaleTimeString() : '';
      const hrs = row.TotalHours || 0;
      csvContent += `${date},${cin},${cout},${hrs},${row.WorkMode},${row.Status}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${dateRangeType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatHrsMins = (decimalHours) => {
    const hrs = Math.floor(decimalHours);
    const mins = Math.round((decimalHours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-h2">My Reports</h2>
        
        <div className="flex gap-4 items-center">
          {dateRangeType === 'custom' && (
            <>
              <input 
                type="date" 
                className="glass-panel" 
                style={{ padding: '0.5rem 1rem' }} 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span>to</span>
              <input 
                type="date" 
                className="glass-panel" 
                style={{ padding: '0.5rem 1rem' }} 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </>
          )}

          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Calendar size={18} />
            <select 
              value={dateRangeType} 
              onChange={(e) => setDateRangeType(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <button className="btn btn-primary" onClick={handleExportCSV} disabled={reportData.length === 0} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
          <div className="text-subtitle animate-pulse">Loading report data...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center gap-2" style={{ minHeight: '300px', color: 'var(--danger)' }}>
          <AlertCircle size={24} />
          <span className="text-subtitle">{error}</span>
        </div>
      ) : (
        <>
          {/* Summary Cards Row 1 */}
          <div className="grid grid-cols-3 gap-6 stagger-1">
            <div className="glass-panel flex-col items-center justify-center text-center" style={{ padding: '2rem 1rem' }}>
              <span className="text-subtitle mb-2">Attendance %</span>
              <span className="text-h2" style={{ color: attendancePercentage >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                {attendancePercentage}%
              </span>
            </div>
            <div className="glass-panel flex-col items-center justify-center text-center" style={{ padding: '2rem 1rem' }}>
              <span className="text-subtitle mb-2">Total Hours</span>
              <span className="text-h2">{formatHrsMins(totalHours)}</span>
            </div>
            <div className="glass-panel flex-col items-center justify-center text-center" style={{ padding: '2rem 1rem' }}>
              <span className="text-subtitle mb-2">Avg. Daily Hours</span>
              <span className="text-h2">{formatHrsMins(avgHours)}</span>
            </div>
          </div>

          {/* Summary Cards Row 2 */}
          <div className="grid grid-cols-3 gap-6 stagger-2">
            <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Present</span>
              <span className="text-h2">{summary.present}</span>
            </div>
            <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Leave</span>
              <span className="text-h2">{summary.leave}</span>
            </div>
            <div className="glass-panel flex justify-between items-center" style={{ padding: '1.5rem' }}>
              <span className="text-subtitle" style={{ fontSize: '1.1rem' }}>Absent (Est.)</span>
              <span className="text-h2" style={{ color: absentDays > 0 ? 'var(--danger)' : 'inherit' }}>{absentDays}</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6 stagger-3">
            
            {/* Daily Hours Chart */}
            <div className="glass-panel flex-col" style={{ minHeight: '350px', padding: '1.5rem' }}>
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 size={20} color="var(--primary)" />
                <h3 className="glass-title m-0">Daily Working Hours</h3>
              </div>
              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* WFH vs WFO Chart */}
            <div className="glass-panel flex-col" style={{ minHeight: '350px', padding: '1.5rem' }}>
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon size={20} color="var(--success)" />
                <h3 className="glass-title m-0">Work Mode Distribution</h3>
              </div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full text-subtitle">
                  No work mode data available for this period.
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeReports;
