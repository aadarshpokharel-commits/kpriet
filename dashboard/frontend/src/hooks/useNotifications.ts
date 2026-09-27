import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationService, type NotificationsResponse } from '@/services/notification.service';
import type { INotification } from '@/types/academic.types';
import { useAuth } from '@/context/AuthContext';

export function useNotifications(pollingIntervalMs: number = 30000) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  // Fetch unread count for the header badge
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently ignore background polling errors
    }
  }, [user]);

  // Fetch full notification list
  const fetchNotifications = useCallback(
    async (params?: { unreadOnly?: boolean }) => {
      if (!user || isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);
      try {
        const res: NotificationsResponse = await NotificationService.getNotifications({
          page: 1,
          limit: 30,
          unreadOnly: params?.unreadOnly,
        });
        setNotifications(res.notifications || []);
        setTotal(res.total || 0);
        setUnreadCount(res.unreadCount || 0);
      } catch (err) {
        console.warn('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [user]
  );

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await NotificationService.markAsRead(id);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await NotificationService.markAllAsRead();
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Delete single notification
  const deleteNotification = useCallback(async (id: string) => {
    const target = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setTotal((prev) => Math.max(0, prev - 1));

    try {
      await NotificationService.deleteNotification(id);
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setTotal(0);

    try {
      await NotificationService.clearAll();
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  }, []);

  // Initial fetch and polling loop
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      // Only poll unread count periodically in the background
      fetchUnreadCount();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [user, fetchUnreadCount, pollingIntervalMs]);

  return {
    unreadCount,
    notifications,
    loading,
    total,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
