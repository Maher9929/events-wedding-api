import { apiService, type Conversation, type Message, type Attachment } from './api';
import { supabase } from './supabase';

export interface UserSearchResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export const messagesService = {
  getConversations: () => apiService.get<Conversation[]>('/messages/conversations'),
  searchUsers: (query: string) => apiService.get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`),
  getMessages: (conversationId: string) => apiService.get<Message[]>(`/messages/conversations/id/${conversationId}`),
  sendMessage: (data: { recipient_id?: string; content: string; conversation_id?: string; attachments?: Attachment[] }) =>
    apiService.post<Message>('/messages', data),
  createConversation: (recipientId: string, firstMessage: string, attachments?: Attachment[]) =>
    apiService.post<Message>('/messages', { recipient_id: recipientId, content: firstMessage, attachments }),
  markConversationRead: (conversationId: string) =>
    apiService.patch<void>(`/messages/conversations/id/${conversationId}/read`, {}),

  subscribeToMessages: (conversationId: string, onNewMessage: (payload: Record<string, unknown>) => void) => {
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

  subscribeToConversations: (userId: string, onUpdate: (payload: Record<string, unknown>) => void) => {
    return supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => onUpdate(payload)
      )
      .subscribe();
  },
};
