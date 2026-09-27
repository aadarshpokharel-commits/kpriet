import { api } from '@/lib/api/client';
import type { INotification } from '@/types/academic.types';

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

export interface NotificationsResponse {
  notifications: INotification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export class NotificationService {
  /**
   * Fetch paginated notifications for current authenticated user.
   */
  static async getNotifications(params?: GetNotificationsParams): Promise<NotificationsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.unreadOnly !== undefined) query.append('unreadOnly', String(params.unreadOnly));
    if (params?.type) query.append('type', params.type);

    const queryString = query.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

    const res = await api.get<any>(endpoint);
    return res.data?.data || res.data;
  }

  /**
   * Get unread notification count for badge in the dashboard header.
   */
  static async getUnreadCount(): Promise<number> {
    const res = await api.get<any>('/notifications/unread-count');
    const data = res.data?.data || res.data;
    return typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(id: string): Promise<INotification> {
    const res = await api.patch<any>(`/notifications/${id}/read`);
    return res.data?.data || res.data;
  }

  /**
   * Mark all notifications as read.
   */
  static async markAllAsRead(): Promise<number> {
    const res = await api.patch<any>('/notifications/read-all');
    const data = res.data?.data || res.data;
    return typeof data?.modifiedCount === 'number' ? data.modifiedCount : 0;
  }

  /**
   * Delete a single notification.
   */
  static async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  }

  /**
   * Clear all notifications for the user.
   */
  static async clearAll(): Promise<void> {
    await api.delete('/notifications/clear-all');
  }
}
