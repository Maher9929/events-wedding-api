import { AuthCacheService } from './auth-cache.service';
import { ConfigService } from '@nestjs/config';

describe('AuthCacheService (in-memory mode)', () => {
  let service: AuthCacheService;

  beforeEach(() => {
    const configService = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    service = new AuthCacheService(configService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ─── User cache ────────────────────────────────────────────────────────────

  describe('cacheUser / getCachedUser', () => {
    it('should return null for uncached user', async () => {
      const result = await service.getCachedUser('unknown-id');
      expect(result).toBeNull();
    });

    it('should cache and retrieve a user', async () => {
      await service.cacheUser('u1', 'client', null);
      const cached = await service.getCachedUser('u1');
      expect(cached).toEqual({ role: 'client', provider_id: null });
    });

    it('should cache user with provider_id', async () => {
      await service.cacheUser('u2', 'provider', 'prov-123');
      const cached = await service.getCachedUser('u2');
      expect(cached).toEqual({ role: 'provider', provider_id: 'prov-123' });
    });

    it('should overwrite previous cache entry', async () => {
      await service.cacheUser('u1', 'client', null);
      await service.cacheUser('u1', 'admin', null);
      const cached = await service.getCachedUser('u1');
      expect(cached?.role).toBe('admin');
    });

    it('should return null for expired entry', async () => {
      await service.cacheUser('u1', 'client', null);

      // Manually expire the entry by manipulating cachedAt
      const map = (service as any).memUserCache as Map<string, any>;
      const entry = map.get('u1');
      entry.cachedAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago (TTL is 5 min)

      const cached = await service.getCachedUser('u1');
      expect(cached).toBeNull();
    });
  });

  describe('invalidateUser', () => {
    it('should remove user from cache', async () => {
      await service.cacheUser('u1', 'client', null);
      await service.invalidateUser('u1');
      const cached = await service.getCachedUser('u1');
      expect(cached).toBeNull();
    });

    it('should not throw when invalidating uncached user', async () => {
      await expect(service.invalidateUser('nonexistent')).resolves.not.toThrow();
    });
  });

  // ─── Token blacklist ──────────────────────────────────────────────────────

  describe('blacklistToken / isTokenBlacklisted', () => {
    it('should return false for non-blacklisted token', async () => {
      const result = await service.isTokenBlacklisted('random-jti');
      expect(result).toBe(false);
    });

    it('should blacklist a token', async () => {
      await service.blacklistToken('jti-1');
      const result = await service.isTokenBlacklisted('jti-1');
      expect(result).toBe(true);
    });

    it('should handle multiple blacklisted tokens', async () => {
      await service.blacklistToken('jti-1');
      await service.blacklistToken('jti-2');
      expect(await service.isTokenBlacklisted('jti-1')).toBe(true);
      expect(await service.isTokenBlacklisted('jti-2')).toBe(true);
      expect(await service.isTokenBlacklisted('jti-3')).toBe(false);
    });

    it('should prune oldest entry when max size is reached', async () => {
      // Override MAX_MEM_BLACKLIST to a small value for testing
      (service as any).MAX_MEM_BLACKLIST = 3;

      await service.blacklistToken('jti-1');
      await service.blacklistToken('jti-2');
      await service.blacklistToken('jti-3');
      // Adding a 4th should prune jti-1
      await service.blacklistToken('jti-4');

      expect(await service.isTokenBlacklisted('jti-1')).toBe(false);
      expect(await service.isTokenBlacklisted('jti-4')).toBe(true);
    });
  });

  // ─── onModuleDestroy ──────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('should not throw when redis is null', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
