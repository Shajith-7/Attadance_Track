import React, { useState, useEffect, useRef } from 'react';
import { Clock, Monitor, EyeOff, PauseCircle, PlayCircle, StopCircle, Coffee } from 'lucide-react';
import { API_URL } from '../config';

const formatDuration = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const NightShiftTimer = ({ user }) => {
    const [session, setSession] = useState(null);
    const [localActiveSecs, setLocalActiveSecs] = useState(0);
    const [localAwaySecs, setLocalAwaySecs] = useState(0);
    const [localBreakSecs, setLocalBreakSecs] = useState(0);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');
    const [showConsent, setShowConsent] = useState(false);
    
    const heartbeatInterval = useRef(null);
    const localTimerInterval = useRef(null);
    const tabVisibleRef = useRef(!document.hidden);
    const streamRef = useRef(null);
    const sessionRef = useRef(null);

    // Sync session to ref for event handlers
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // Fetch active session on mount
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`${API_URL}/work-sessions/my/today`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setSession(data);
                        setLocalActiveSecs(data.activeSeconds || 0);
                        setLocalAwaySecs(data.awaySeconds || 0);
                        setLocalBreakSecs(data.breakSeconds || 0);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch session', err);
            }
        };
        fetchSession();
        
        return () => stopLocalIntervals();
    }, []);

    // Post an event to the backend
    const postEvent = async (eventType) => {
        if (!sessionRef.current) return;
        try {
            const res = await fetch(`${API_URL}/work-sessions/${sessionRef.current._id}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: eventType })
            });
            if (res.ok) {
                const updatedSession = await res.json();
                setSession(updatedSession);
                setLocalActiveSecs(updatedSession.activeSeconds || 0);
                setLocalAwaySecs(updatedSession.awaySeconds || 0);
                setLocalBreakSecs(updatedSession.breakSeconds || 0);
            }
        } catch (err) {
            console.error('Failed to post event', err);
        }
    };

    // Handle visibility changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            const isVisible = !document.hidden;
            tabVisibleRef.current = isVisible;
            if (isVisible) {
                postEvent('TAB_VISIBLE');
            } else {
                postEvent('TAB_HIDDEN');
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Local ticking for UI
    useEffect(() => {
        if (!session) {
            stopLocalIntervals();
            return;
        }

        if (!localTimerInterval.current) {
            localTimerInterval.current = setInterval(() => {
                const st = sessionRef.current?.status;
                if (st === 'ACTIVE') setLocalActiveSecs(prev => prev + 1);
                else if (st === 'AWAY_WARNING') setLocalAwaySecs(prev => prev + 1);
                else if (st === 'ON_BREAK') setLocalBreakSecs(prev => prev + 1);
            }, 1000);
        }

        if (!heartbeatInterval.current && ['ACTIVE', 'AWAY_WARNING', 'ON_BREAK', 'PAUSED'].includes(session.status)) {
            heartbeatInterval.current = setInterval(() => {
                postEvent('HEARTBEAT');
            }, 30000); // 30s heartbeat
        }

        return () => stopLocalIntervals();
    }, [session]);

    const stopLocalIntervals = () => {
        if (localTimerInterval.current) clearInterval(localTimerInterval.current);
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        localTimerInterval.current = null;
        heartbeatInterval.current = null;
    };

    const startScreenShare = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error("Your browser does not support this feature. Please use a supported desktop browser.");
            }
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            setStream(mediaStream);
            streamRef.current = mediaStream;

            // Listen for user stopping share via browser UI
            mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                setStream(null);
                streamRef.current = null;
                postEvent('SCREEN_SHARE_ENDED');
            });
            return true;
        } catch (err) {
            setError(err.message || "Screen sharing permission denied.");
            return false;
        }
    };

    const handleStartSession = async () => {
        setError('');
        const hasScreenShare = await startScreenShare();
        if (!hasScreenShare) return;

        try {
            const todayDate = new Date().toISOString().split('T')[0];
            const res = await fetch(`${API_URL}/work-sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    shiftDate: todayDate,
                    consentGiven: true,
                    consentVersion: "1.0"
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSession(data);
                setShowConsent(false);
            } else {
                setError(data.error);
                if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            }
        } catch (err) {
            setError("Server error starting session");
        }
    };

    const handleEndSession = async () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        await postEvent('SESSION_ENDED');
        setStream(null);
    };

    // Calculate away countdown if in AWAY_WARNING
    const getAwayCountdown = () => {
        if (!session || session.status !== 'AWAY_WARNING' || !session.hiddenAt) return null;
        const hiddenTime = new Date(session.hiddenAt).getTime();
        const now = Date.now();
        const elapsedSecs = Math.floor((now - hiddenTime) / 1000);
        const remaining = 600 - elapsedSecs; // 10 mins = 600 secs
        if (remaining <= 0) return "00:00";
        return formatDuration(remaining).substring(3); // MM:SS
    };

    if (!session && !showConsent) {
        return (
            <div className="glass-panel stagger-1">
                <h3 className="glass-title"><Monitor className="mr-2" /> Work Session</h3>
                <p className="text-subtitle mb-4">Start your tracked work session.</p>
                {error && <div className="badge badge-danger mb-4">{error}</div>}
                <button className="btn btn-primary" onClick={() => setShowConsent(true)}>
                    <PlayCircle className="mr-2" /> START WORK SESSION
                </button>
            </div>
        );
    }

    if (showConsent) {
        return (
            <div className="glass-panel stagger-1">
                <h3 className="glass-title">Work Session Monitoring Consent</h3>
                <p className="text-subtitle mb-4" style={{ lineHeight: '1.6' }}>
                    During this session, the system will record your active work-session duration, whether your selected work tab is visible, break periods, and session connectivity. The system does not record keystrokes, passwords, webcam footage, or unrelated applications.
                </p>
                {error && <div className="badge badge-danger mb-4">{error}</div>}
                <div className="flex gap-4">
                    <button className="btn btn-ghost" onClick={() => setShowConsent(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleStartSession}>Continue & Select Screen</button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel stagger-1" style={{ position: 'relative', overflow: 'hidden' }}>
            <h3 className="glass-title"><Monitor className="mr-2" /> Work Session</h3>
            
            {session.status === 'AWAY_WARNING' && (
                <div style={{ backgroundColor: 'rgba(255, 170, 0, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                        <EyeOff /> Work tab is inactive
                    </div>
                    <p>Return to your work tab within <strong>{getAwayCountdown()}</strong> to keep this session active.</p>
                </div>
            )}

            {session.status === 'PAUSED' && (
                <div style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)', border: '1px solid var(--primary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        <PauseCircle /> Session Paused
                    </div>
                    <p>Your work session has been paused due to inactivity.</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex-col gap-1">
                    <span className="text-subtitle">Tracked Active Time</span>
                    <span className="text-h3" style={{ color: 'var(--success)' }}>{formatDuration(localActiveSecs)}</span>
                </div>
                <div className="flex-col gap-1">
                    <span className="text-subtitle">Away Time</span>
                    <span className="text-h3" style={{ color: 'var(--warning)' }}>{formatDuration(localAwaySecs)}</span>
                </div>
                <div className="flex-col gap-1">
                    <span className="text-subtitle">Break Time</span>
                    <span className="text-h3" style={{ color: 'var(--info)' }}>{formatDuration(localBreakSecs)}</span>
                </div>
                <div className="flex-col gap-1">
                    <span className="text-subtitle">Status</span>
                    <span className="text-h3" style={{ fontSize: '1.2rem' }}>
                        {session.status === 'ACTIVE' && '🟢 Working'}
                        {session.status === 'ON_BREAK' && '☕ On Break'}
                        {session.status === 'AWAY_WARNING' && '🟠 Away Warning'}
                        {session.status === 'PAUSED' && '🔵 Paused'}
                        {session.status === 'COMPLETED' && '✅ Completed'}
                    </span>
                </div>
            </div>

            <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-subtitle">Work Tab</span>
                    <span className={`badge ${tabVisibleRef.current ? 'badge-success' : 'badge-warning'}`}>
                        {tabVisibleRef.current ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-subtitle">Screen Share</span>
                    <span className={`badge ${session.screenShareConnected ? 'badge-success' : 'badge-danger'}`}>
                        {session.screenShareConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {session.status !== 'COMPLETED' && (
                <div className="flex gap-4 mt-4">
                    {session.status === 'ACTIVE' && (
                        <button className="btn btn-warning" onClick={() => postEvent('BREAK_STARTED')}>
                            <Coffee className="mr-2" /> Start Break
                        </button>
                    )}
                    {session.status === 'ON_BREAK' && (
                        <button className="btn btn-success" onClick={() => postEvent('BREAK_ENDED')}>
                            <PlayCircle className="mr-2" /> End Break
                        </button>
                    )}
                    {session.status === 'PAUSED' && (
                        <button className="btn btn-primary" onClick={async () => {
                            if (!streamRef.current) await startScreenShare();
                            postEvent('SESSION_RESUMED');
                        }}>
                            <PlayCircle className="mr-2" /> Resume Session
                        </button>
                    )}
                    {(!session.screenShareConnected && session.status === 'ACTIVE') && (
                        <button className="btn btn-primary" onClick={async () => {
                            const connected = await startScreenShare();
                            if (connected) postEvent('SCREEN_SHARE_STARTED');
                        }}>
                            <Monitor className="mr-2" /> Reconnect Screen
                        </button>
                    )}
                    <button className="btn btn-danger" onClick={() => {
                        if (window.confirm("End your work session?")) {
                            handleEndSession();
                        }
                    }}>
                        <StopCircle className="mr-2" /> End Session
                    </button>
                </div>
            )}
        </div>
    );
};

export default NightShiftTimer;
