import { MessagesGateway } from './messages.gateway';
import { Server } from 'socket.io';

describe('MessagesGateway', () => {
  let gateway: MessagesGateway;
  let jwtService: any;
  let supabase: any;
  let mockServer: any;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
    };

    const chain: any = {};
    chain.from = jest.fn(() => chain);
    chain.select = jest.fn(() => chain);
    chain.contains = jest.fn(() => chain);
    supabase = chain;

    gateway = new MessagesGateway(jwtService, supabase);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = mockServer as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  // ─── handleConnection ────────────────────────────────────────────────────

  describe('handleConnection', () => {
    it('should disconnect client without token', async () => {
      const client = {
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate client with valid token', async () => {
      supabase.contains.mockResolvedValueOnce({ data: [{ id: 'conv-1' }] });

      const client = {
        id: 'socket-1',
        handshake: { auth: { token: 'valid-jwt' }, headers: {} },
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt');
      expect(client.userId).toBe('user-1');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.join).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should disconnect on invalid token', async () => {
      jwtService.verify.mockImplementationOnce(() => { throw new Error('invalid'); });

      const client = {
        handshake: { auth: { token: 'bad-token' }, headers: {} },
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  // ─── handleDisconnect ────────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should clean up online user tracking', async () => {
      supabase.contains.mockResolvedValueOnce({ data: [] });

      const client = {
        id: 'socket-1',
        handshake: { auth: { token: 'valid' }, headers: {} },
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      await gateway.handleConnection(client);
      expect(gateway.isUserOnline('user-1')).toBe(true);

      gateway.handleDisconnect(client);
      expect(gateway.isUserOnline('user-1')).toBe(false);
    });
  });

  // ─── emitNewMessage ──────────────────────────────────────────────────────

  describe('emitNewMessage', () => {
    it('should emit to conversation room', () => {
      const msg = { id: 'm1', content: 'hello' };
      gateway.emitNewMessage('conv-1', msg);

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', msg);
    });
  });

  // ─── emitNotification ────────────────────────────────────────────────────

  describe('emitNotification', () => {
    it('should emit to user room', () => {
      const notif = { type: 'message', preview: 'hello' };
      gateway.emitNotification('user-1', notif);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('new_notification', notif);
    });
  });

  // ─── handleJoinConversation ──────────────────────────────────────────────

  describe('handleJoinConversation', () => {
    it('should join the conversation room', () => {
      const client = { join: jest.fn() } as any;
      const result = gateway.handleJoinConversation(client, { conversationId: 'conv-1' });

      expect(client.join).toHaveBeenCalledWith('conversation:conv-1');
      expect(result).toEqual({ event: 'joined', conversationId: 'conv-1' });
    });
  });

  // ─── handleTyping ────────────────────────────────────────────────────────

  describe('handleTyping', () => {
    it('should emit typing event to conversation', () => {
      const emitMock = jest.fn();
      const client = {
        userId: 'user-1',
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      } as any;

      gateway.handleTyping(client, { conversationId: 'conv-1' });
      expect(client.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(emitMock).toHaveBeenCalledWith('user_typing', {
        userId: 'user-1',
        conversationId: 'conv-1',
      });
    });
  });

  // ─── getOnlineUserCount ──────────────────────────────────────────────────

  describe('getOnlineUserCount', () => {
    it('should return 0 when no users connected', () => {
      expect(gateway.getOnlineUserCount()).toBe(0);
    });
  });
});
