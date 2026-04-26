import { NotificationsController } from './notifications.controller';

function createSupabaseMock() {
  let terminalResult: any = { data: null, error: null, count: 0 };
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.lt = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.then = jest.fn((resolve: any) => resolve(terminalResult));
  chain._setResult = (r: any) => { terminalResult = r; };
  return chain;
}

const req = { user: { id: 'user-1' } } as any;

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    controller = new NotificationsController(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── getMyNotifications ──────────────────────────────────────────────────

  describe('getMyNotifications', () => {
    it('should return notifications list', async () => {
      const notifs = [{ id: 'n1', title: 'Test' }];
      supabase._setResult({ data: notifs, error: null, count: 1 });

      const result = await controller.getMyNotifications(req);
      expect(result).toEqual({ data: notifs, total: 1 });
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should return empty on error', async () => {
      supabase._setResult({ data: null, error: { message: 'fail' }, count: 0 });

      const result = await controller.getMyNotifications(req);
      expect(result).toEqual({ data: [], total: 0 });
    });

    it('should pass unread filter', async () => {
      supabase._setResult({ data: [], error: null, count: 0 });

      await controller.getMyNotifications(req, undefined, undefined, 'true');
      // eq called for user_id and is_read
      expect(supabase.eq).toHaveBeenCalledWith('is_read', false);
    });

    it('should pass type filter', async () => {
      supabase._setResult({ data: [], error: null, count: 0 });

      await controller.getMyNotifications(req, undefined, undefined, undefined, 'message');
      expect(supabase.eq).toHaveBeenCalledWith('type', 'message');
    });
  });

  // ─── getUnreadCount ──────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      supabase._setResult({ count: 5, error: null });

      const result = await controller.getUnreadCount(req);
      expect(result).toEqual({ count: 5 });
    });

    it('should return 0 on error', async () => {
      supabase._setResult({ count: null, error: { message: 'fail' } });

      const result = await controller.getUnreadCount(req);
      expect(result).toEqual({ count: 0 });
    });
  });

  // ─── markAsRead ──────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notif = { id: 'n1', is_read: true };
      supabase.single.mockResolvedValueOnce({ data: notif, error: null });

      const result = await controller.markAsRead('n1', req);
      expect(result).toEqual({ success: true, data: notif });
    });

    it('should return success false on error', async () => {
      supabase.single.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

      const result = await controller.markAsRead('n1', req);
      expect(result).toEqual({ success: false });
    });
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      supabase._setResult({ error: null });

      const result = await controller.markAllAsRead(req);
      expect(result).toEqual({ success: true });
    });

    it('should return success false on error', async () => {
      supabase._setResult({ error: { message: 'fail' } });

      const result = await controller.markAllAsRead(req);
      expect(result).toEqual({ success: false });
    });
  });

  // ─── deleteOne ───────────────────────────────────────────────────────────

  describe('deleteOne', () => {
    it('should delete a notification without error', async () => {
      supabase._setResult({ error: null });

      await expect(controller.deleteOne('n1', req)).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(supabase.delete).toHaveBeenCalled();
    });
  });

  // ─── deleteAll ───────────────────────────────────────────────────────────

  describe('deleteAll', () => {
    it('should delete all read notifications', async () => {
      supabase._setResult({ error: null });

      await expect(controller.deleteAll(req)).resolves.toBeUndefined();
      expect(supabase.eq).toHaveBeenCalledWith('is_read', true);
    });
  });

  // ─── cleanupOld ──────────────────────────────────────────────────────────

  describe('cleanupOld', () => {
    it('should delete old read notifications', async () => {
      supabase._setResult({ error: null });

      await expect(controller.cleanupOld(req)).resolves.toBeUndefined();
      expect(supabase.lt).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('is_read', true);
    });
  });
});
