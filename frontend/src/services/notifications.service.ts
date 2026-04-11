import { apiService } from './api';
import { supabase } from './supabase';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    data?: any;
    created_at: string;
}

export const notificationsService = {
    getNotifications: (params?: URLSearchParams) =>
        apiService.get<any>(`/notifications${params ? '?' + params.toString() : ''}`),

    markAsRead: (id: string) =>
        apiService.patch<void>(`/notifications/id/${id}/read`, {}),

    markAllAsRead: () =>
        apiService.patch<void>('/notifications/read-all', {}),

    deleteNotification: (id: string) =>
        apiService.delete<void>(`/notifications/id/${id}`),

    deleteAllRead: () =>
        apiService.delete<void>('/notifications'),

    subscribeToNotifications: (userId: string, onNewNotification: (payload: any) => void) => {
        return supabase
            .channel(`user_notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => onNewNotification(payload.new)
            )
            .subscribe();
    },
};
