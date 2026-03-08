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

  async createConversation(participantIds: string[]): Promise<Conversation> {
    // Check if conversation already exists
    // This is a simplified check. In real app, we need to check if ANY row has these generic participants
    // For now, let's just create a new one

    // Ensure unique and sorted for consistent lookup if we wanted to enforce uniqueness
    const sortedIds = [...participantIds].sort();

    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        participant_ids: sortedIds,
        last_message_at: new Date(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    const convos = data || [];

    // Attach unread_count per conversation
    const withUnread = await Promise.all(
      convos.map(async (c) => {
        const { count } = await this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .neq('sender_id', userId)
          .is('read_at', null);
        return { ...c, unread_count: count || 0 };
      }),
    );
    return withUnread;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    if (!conversationId) return [];

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data || [];
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
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

    // If no conversation ID, create or find existing one
    if (!conversationId && createMessageDto.recipient_id) {
      // Try to find existing conversation first
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

    // Insert Message
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: createMessageDto.content,
        type: createMessageDto.type || 'text',
        // Store attachments inside metadata (no standalone attachments column in schema)
        metadata: {
          ...(createMessageDto.metadata || {}),
          ...(createMessageDto.attachments?.length
            ? { attachments: createMessageDto.attachments }
            : {}),
        },
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // Update Conversation Last Message At
    await this.supabase
      .from('conversations')
      .update({ last_message_at: new Date() })
      .eq('id', conversationId);

    // Notify other participants
    const { data: convo } = await this.supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single();
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
        } catch {
          /* silent */
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
    const { data } = await this.supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', sortedIds)
      .limit(1)
      .single();
    return data || null;
  }
}
