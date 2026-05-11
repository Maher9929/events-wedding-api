import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { filterContactInfo } from '../common/content-filter';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly gateway: MessagesGateway,
  ) {}

  private async logFilterViolation(
    senderId: string,
    conversationId: string,
    originalContent: string,
    filteredTypes: string[],
  ): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        user_id: senderId,
        action: 'message_filtered',
        entity: 'messages',
        entity_id: conversationId,
        metadata: {
          original_content: originalContent.substring(0, 500),
          filtered_types: filteredTypes,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Failed to log filter violation: ${message}`);
    }
  }

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

  private async resolveDirectRecipientUserId(
    recipientId: string,
  ): Promise<string> {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('id', recipientId)
      .maybeSingle();

    if (profile?.id) {
      return profile.id;
    }

    const { data: providerById } = await this.supabase
      .from('providers')
      .select('user_id')
      .eq('id', recipientId)
      .maybeSingle();

    if (providerById?.user_id) {
      return providerById.user_id;
    }

    const { data: providerByUserId } = await this.supabase
      .from('providers')
      .select('user_id')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (providerByUserId?.user_id) {
      return providerByUserId.user_id;
    }

    throw new NotFoundException('Recipient not found');
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
      this.logger.error(`Error creating conversation: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to create conversation: ${error.message}`,
      );
    }
    if (!data) {
      throw new InternalServerErrorException(
        'No data returned after creating conversation',
      );
    }
    return data;
  }

  private async assertCanStartDirectConversation(
    senderId: string,
    recipientId: string,
  ): Promise<void> {
    if (senderId === recipientId) {
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );
    }

    const { data: profiles, error } = await this.supabase
      .from('user_profiles')
      .select('id, role')
      .in('id', [senderId, recipientId]);

    if (error || !profiles || profiles.length !== 2) {
      throw new NotFoundException('Recipient not found');
    }

    const roles = profiles.map((profile) => profile.role).sort();
    const allowedPair =
      roles.length === 2 && roles[0] === 'client' && roles[1] === 'provider';

    if (!allowedPair) {
      throw new ForbiddenException(
        'Direct conversations are limited to client-provider marketplace interactions',
      );
    }
  }

  async getConversations(userId: string): Promise<
    Array<
      Conversation & {
        unread_count: number;
        recipient_name: string;
        recipient_avatar?: string | null;
        recipient_role?: string;
      }
    >
  > {
    if (!userId) return [];

    const { data: convos, error } = await this.supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching conversations: ${error.message}`);
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
          const message = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Error enriching conversation ${c.id}: ${message}`);
          return { ...c, unread_count: 0, recipient_name: 'مستخدم' };
        }
      }),
    );
    return enrichedConversations;
  }

  async getMessages(
    conversationId: string,
    userId: string,
  ): Promise<
    Array<Message & { sender?: { full_name?: string; avatar_url?: string } }>
  > {
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
      this.logger.error(`Error fetching messages: ${error.message}`);
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
      this.logger.error(`Error marking conversation read: ${error.message}`);
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
      const recipientUserId = await this.resolveDirectRecipientUserId(
        createMessageDto.recipient_id,
      );

      await this.assertCanStartDirectConversation(senderId, recipientUserId);

      const existing = await this.findExistingConversation(
        senderId,
        recipientUserId,
      );
      if (existing) {
        conversationId = existing.id;
      } else {
        const convo = await this.createConversation([
          senderId,
          recipientUserId,
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

    // Sanitize message content (anti-disintermediation)
    const {
      content: safeContent,
      wasFiltered,
      filteredTypes,
    } = filterContactInfo(createMessageDto.content);

    if (wasFiltered) {
      void this.logFilterViolation(
        senderId,
        conversationId,
        createMessageDto.content,
        filteredTypes,
      );
    }

    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: safeContent,
        type: createMessageDto.type || 'text',
        metadata: {
          ...(createMessageDto.metadata || {}),
          ...(createMessageDto.attachments?.length
            ? { attachments: createMessageDto.attachments }
            : {}),
          ...(wasFiltered
            ? { content_filtered: true, filtered_types: filteredTypes }
            : {}),
        },
      })
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`Error sending message: ${error.message}`);
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
      const preview = safeContent.substring(0, 80);
      for (const recipientId of recipients) {
        try {
          await this.supabase.from('notifications').insert({
            user_id: recipientId,
            type: 'message',
            title: 'New message',
            message: preview,
            is_read: false,
            data: { conversation_id: conversationId, sender_id: senderId },
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Error creating notification: ${message}`);
        }
      }
    }

    // Emit real-time WebSocket events
    if (message) {
      this.gateway.emitNewMessage(conversationId, message);
      if (convo?.participant_ids) {
        const recipients = (convo.participant_ids as string[]).filter(
          (id) => id !== senderId,
        );
        for (const recipientId of recipients) {
          this.gateway.emitNotification(recipientId, {
            type: 'message',
            conversation_id: conversationId,
            preview: safeContent.substring(0, 80),
          });
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
      this.logger.warn(`Error finding existing conversation: ${error.message}`);
    }

    return data || null;
  }
}
