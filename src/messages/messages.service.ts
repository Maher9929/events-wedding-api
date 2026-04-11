import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class MessagesService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  private async getConversationForUser(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .contains('participant_ids', [userId])
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Conversation not found');
    }

    return data;
  }

  async createConversation(participantIds: string[]): Promise<Conversation> {
    const sortedIds = [...participantIds].sort();

    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        participant_ids: sortedIds,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new InternalServerErrorException(
        `فشل إنشاء المحادثة: ${error.message}`,
      );
    }
    if (!data) {
      throw new InternalServerErrorException(
        'لم يتم إرجاع بيانات بعد إنشاء المحادثة',
      );
    }
    return data;
  }

  async getConversations(userId: string): Promise<any[]> {
    if (!userId) return [];

    const { data: convos, error } = await this.supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new InternalServerErrorException(error.message);
    }
    const conversations = convos || [];

    const enrichedConversations = await Promise.all(
      conversations.map(async (c) => {
        try {
          const { count } = await this.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .neq('sender_id', userId)
            .is('read_at', null);

          const { data: profiles } = await this.supabase
            .from('user_profiles')
            .select('id, full_name, avatar_url, role')
            .in('id', c.participant_ids);

          const otherParticipant = profiles?.find((p) => p.id !== userId);

          return {
            ...c,
            unread_count: count || 0,
            recipient_name: otherParticipant?.full_name || 'مستخدم',
            recipient_avatar: otherParticipant?.avatar_url,
            recipient_role: otherParticipant?.role,
          };
        } catch (e) {
          console.error(`Error enriching conversation ${c.id}:`, e);
          return { ...c, unread_count: 0, recipient_name: 'مستخدم' };
        }
      }),
    );
    return enrichedConversations;
  }

  async getMessages(conversationId: string, userId: string): Promise<any[]> {
    if (!conversationId) return [];
    await this.getConversationForUser(conversationId, userId);

    const { data, error } = await this.supabase
      .from('messages')
      .select(
        `
        *,
        sender:user_profiles (
          full_name,
          avatar_url
        )
      `,
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data || [];
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.getConversationForUser(conversationId, userId);

    const { error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error marking conversation read:', error);
      throw new InternalServerErrorException(error.message);
    }
    return { success: true };
  }

  async sendMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    if (!senderId) throw new BadRequestException('Sender ID is required');
    if (!createMessageDto.content?.trim())
      throw new BadRequestException('Message content cannot be empty');

    let conversationId = createMessageDto.conversation_id;

    if (!conversationId && createMessageDto.recipient_id) {
      const existing = await this.findExistingConversation(
        senderId,
        createMessageDto.recipient_id,
      );
      if (existing) {
        conversationId = existing.id;
      } else {
        const convo = await this.createConversation([
          senderId,
          createMessageDto.recipient_id,
        ]);
        conversationId = convo.id;
      }
    }

    if (!conversationId) {
      throw new BadRequestException(
        'Conversation ID or Recipient ID is required',
      );
    }

    await this.getConversationForUser(conversationId, senderId);

    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: createMessageDto.content,
        type: createMessageDto.type || 'text',
        metadata: {
          ...(createMessageDto.metadata || {}),
          ...(createMessageDto.attachments?.length
            ? { attachments: createMessageDto.attachments }
            : {}),
        },
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error sending message:', error);
      throw new InternalServerErrorException(error.message);
    }

    await this.supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    const { data: convo } = await this.supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .maybeSingle();

    if (convo?.participant_ids) {
      const recipients = (convo.participant_ids as string[]).filter(
        (id) => id !== senderId,
      );
      const preview = createMessageDto.content.substring(0, 80);
      for (const recipientId of recipients) {
        try {
          await this.supabase.from('notifications').insert({
            user_id: recipientId,
            type: 'message',
            title: 'رسالة جديدة',
            message: preview,
            is_read: false,
            data: { conversation_id: conversationId, sender_id: senderId },
          });
        } catch (e) {
          console.error('Error creating notification:', e);
        }
      }
    }

    return message;
  }

  private async findExistingConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    const sortedIds = [userId1, userId2].sort();
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', sortedIds)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding existing conversation:', error);
    }

    return data || null;
  }
}
