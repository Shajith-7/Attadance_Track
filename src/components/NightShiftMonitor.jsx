import React, { useState, useEffect } from 'react';
import { Monitor, Coffee, AlertTriangle, CheckCircle, PauseCircle, Clock } from 'lucide-react';
import { API_URL } from '../config';

const formatDuration = (totalSeconds) => {
    if (!totalSeconds) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const NightShiftMonitor = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_URL}/work-sessions/admin/live`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (error) {
            console.error('Error fetching live sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    const activeCount = sessions.filter(s => s.status === 'ACTIVE').length;
    const breakCount = sessions.filter(s => s.status === 'ON_BREAK').length;
    const awayCount = sessions.filter(s => s.status === 'AWAY_WARNING').length;
    const pausedCount = sessions.filter(s => s.status === 'PAUSED').length;

    if (loading) return <div className="text-center p-8">Loading live shifts...</div>;

    return (
        <div className="flex-col gap-6 animate-fade-in">
            <h2 className="text-h2 flex items-center gap-2">
                <Monitor /> Night Shift Live Monitor
            </h2>

            <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel text-center">
                    <span className="text-subtitle">Currently Working</span>
                    <h3 className="text-h2" style={{ color: 'var(--success)' }}>{activeCount}</h3>
                </div>
                <div className="glass-panel text-center">
                    <span className="text-subtitle">On Break</span>
                    <h3 className="text-h2" style={{ color: 'var(--info)' }}>{breakCount}</h3>
                </div>
                <div className="glass-panel text-center">
                    <span className="text-subtitle">Away Warning</span>
                    <h3 className="text-h2" style={{ color: 'var(--warning)' }}>{awayCount}</h3>
                </div>
                <div className="glass-panel text-center">
                    <span className="text-subtitle">Paused</span>
                    <h3 className="text-h2" style={{ color: 'var(--primary)' }}>{pausedCount}</h3>
                </div>
            </div>

            <div className="glass-panel mt-4">
                <h3 className="glass-title mb-4">Live Employee Sessions</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Shift Date</th>
                                <th>Status</th>
                                <th>Active Work</th>
                                <th>Away Time</th>
                                <th>Break Time</th>
                                <th>Last Seen</th>
                                <th>Screen Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length > 0 ? sessions.map((session) => (
                                <tr key={session._id}>
                                    <td style={{ fontWeight: 500 }}>
                                        {session.employeeId?.FirstName} {session.employeeId?.LastName}
                                    </td>
                                    <td>{session.shiftDate}</td>
                                    <td>
                                        {session.status === 'ACTIVE' && <span className="badge badge-success">Working</span>}
                                        {session.status === 'ON_BREAK' && <span className="badge badge-info">On Break</span>}
                                        {session.status === 'AWAY_WARNING' && <span className="badge badge-warning">Away Warning</span>}
                                        {session.status === 'PAUSED' && <span className="badge badge-primary">Paused</span>}
                                    </td>
                                    <td>{formatDuration(session.activeSeconds)}</td>
                                    <td>{formatDuration(session.awaySeconds)}</td>
                                    <td>{formatDuration(session.breakSeconds)}</td>
                                    <td>
                                        {Math.floor((Date.now() - new Date(session.lastHeartbeatAt).getTime()) / 60000)} mins ago
                                    </td>
                                    <td>
                                        {session.screenShareConnected ? (
                                            <span style={{ color: 'var(--success)' }}>Connected</span>
                                        ) : (
                                            <span style={{ color: 'var(--danger)' }}>Disconnected</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="text-center text-subtitle" style={{ padding: '2rem' }}>
                                        No active night shift sessions.
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

export default NightShiftMonitor;
