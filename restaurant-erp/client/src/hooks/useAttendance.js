import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const useAttendance = () => {
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { on } = useSocket();

  const fetchMyAttendance = useCallback(async () => {
    try {
      const { data } = await api.get('/staff/my-attendance');
      if (data.success) {
        setAttendanceInfo(data.data);
      }
    } catch (err) {
      console.warn('Could not fetch attendance status:', err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAttendance();
  }, [fetchMyAttendance]);

  // Listen for socket events
  useEffect(() => {
    const unsubscribe = on?.('attendance-update', () => {
      fetchMyAttendance();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [on, fetchMyAttendance]);

  const clockIn = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/staff/clock-in');
      if (data.success) {
        toast.success(data.message || '✅ Clocked in successfully!');
        await fetchMyAttendance();
        return true;
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to clock in');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const clockOut = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post('/staff/clock-out');
      if (data.success) {
        toast.info(data.message || '⏱️ Clocked out successfully!');
        await fetchMyAttendance();
        return true;
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to clock out');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    attendanceInfo,
    isClockedIn: !!attendanceInfo?.isClockedIn,
    clockInTime: attendanceInfo?.attendance?.clockInTime || '',
    clockOutTime: attendanceInfo?.attendance?.clockOutTime || '',
    totalHours: attendanceInfo?.attendance?.totalHours || 0,
    loading,
    actionLoading,
    clockIn,
    clockOut,
    refreshAttendance: fetchMyAttendance,
  };
};
