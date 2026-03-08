import { apiService, type Conversation, type Message } from './api';
import { supabase } from './supabase';

export const messagesService = {
  getConversations: () => apiService.get<Conversation[]>('/messages/conversations'),
  getMessages: (conversationId: string) => apiService.get<Message[]>(`/messages/conversations/${conversationId}`),
  sendMessage: (data: { recipient_id?: string; content: string; conversation_id?: string; attachments?: any[] }) =>
    apiService.post<Message>('/messages', data),
  createConversation: (recipientId: string, firstMessage: string, attachments?: any[]) =>
    apiService.post<Message>('/messages', { recipient_id: recipientId, content: firstMessage, attachments }),
  markConversationRead: (conversationId: string) =>
    apiService.patch<void>(`/messages/conversations/${conversationId}/read`, {}),

  subscribeToMessages: (conversationId: string, onNewMessage: (payload: any) => void) => {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onNewMessage(payload.new)
      )
      .subscribe();
  },

  subscribeToConversations: (userId: string, onUpdate: (payload: any) => void) => {
    return supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          // Note: In a production app with RLS, Supabase handles filtering for the user.
          // For realtime, we might need a specific channel or broadcast.
        },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },
};
