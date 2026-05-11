import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';

/** Socket.io typed socket with authenticated userId */
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/** Build the allowed-origins list from environment (same as REST CORS in main.ts) */
function buildAllowedOrigins(): string[] {
  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    ...extraOrigins,
  ];
}

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || buildAllowedOrigins().includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  },
  namespace: '/ws',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId: string = payload.sub;
      client.userId = userId;

      // Track online users
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);

      // Join user's personal room for notifications
      await client.join(`user:${userId}`);

      // Join all active conversation rooms
      const { data: conversations } = await this.supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [client.userId]);

      if (conversations) {
        for (const conversation of conversations) {
          await client.join(`conversation:${conversation.id}`);
        }
      }

      this.logger.log(`Client connected: ${client.userId} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.onlineUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(client.userId);
        }
      }
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  private async assertConversationAccess(
    client: AuthenticatedSocket,
    conversationId: string,
  ): Promise<void> {
    if (!client.userId || !conversationId) {
      throw new WsException('Conversation access denied');
    }

    const { data } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .contains('participant_ids', [client.userId])
      .maybeSingle();

    if (!data) {
      throw new WsException('Conversation access denied');
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.assertConversationAccess(client, data.conversationId);
    await client.join(`conversation:${data.conversationId}`);
    return { event: 'joined', conversationId: data.conversationId };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.assertConversationAccess(client, data.conversationId);
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.assertConversationAccess(client, data.conversationId);
    client.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  // ─── Server-side emitters (called from services) ─────────────────────────

  emitNewMessage(conversationId: string, message: Record<string, unknown>) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('new_message', message);
  }

  emitNotification(userId: string, notification: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
  }

  emitConversationUpdate(
    conversationId: string,
    data: Record<string, unknown>,
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation_updated', data);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }
}
