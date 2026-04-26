import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let supabase: any;
  let authCache: any;

  beforeEach(() => {
    supabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'c1' }], error: null }),
    };
    authCache = {
      cacheUser: jest.fn().mockResolvedValue(undefined),
      getCachedUser: jest.fn().mockResolvedValue({ role: 'health', provider_id: null }),
      invalidateUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new AppService(supabase, authCache);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return API title', () => {
      expect(service.getHello()).toContain('Doha Events');
    });
  });

  describe('getHealth', () => {
    it('should return healthy when DB and cache are up', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('doha-events-backend');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.cache.status).toBe('up');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.checks.database.latencyMs).toBe('number');
    });

    it('should return degraded when DB is down but cache is up', async () => {
      supabase.limit.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.getHealth();
      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.cache.status).toBe('up');
    });

    it('should return degraded when cache is down but DB is up', async () => {
      authCache.getCachedUser.mockResolvedValueOnce(null);

      const result = await service.getHealth();
      expect(result.status).toBe('degraded');
      expect(result.checks.cache.status).toBe('down');
      expect(result.checks.database.status).toBe('up');
    });

    it('should return unhealthy when both are down', async () => {
      supabase.limit.mockRejectedValueOnce(new Error('DB error'));
      authCache.cacheUser.mockRejectedValueOnce(new Error('Cache error'));

      const result = await service.getHealth();
      expect(result.status).toBe('unhealthy');
    });
  });
});
