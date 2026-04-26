import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CachedUser {
  role: string;
  provider_id: string | null;
}

/**
 * Cache for JWT validation results and token blacklisting.
 *
 * When REDIS_URL is set the service uses Redis (multi-instance safe).
 * Otherwise it falls back to a lightweight in-memory Map/Set so
 * local development works without running Redis.
 */
@Injectable()
export class AuthCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthCacheService.name);

  /** Redis client — null when running in-memory mode */
  private readonly redis: Redis | null;

  // ─── In-memory fallbacks ───────────────────────────────
  private readonly memUserCache = new Map<string, CachedUser & { cachedAt: number }>();
  private readonly memBlacklist = new Set<string>();

  /** Cache TTL in seconds */
  private readonly USER_CACHE_TTL_SEC = 5 * 60; // 5 minutes

  /** Token blacklist TTL — matches the JWT expiry (24 h) */
  private readonly BLACKLIST_TTL_SEC = 24 * 60 * 60;

  /** Max in-memory blacklist size before pruning */
  private readonly MAX_MEM_BLACKLIST = 10_000;

  private readonly KEY_PREFIX_USER = 'auth:user:';
  private readonly KEY_PREFIX_BL = 'auth:bl:';

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis
        .connect()
        .then(() => this.logger.log('Connected to Redis'))
        .catch((err) => {
          this.logger.warn(`Redis connection failed, falling back to in-memory cache: ${err.message}`);
          // Do not crash — in-memory fallback will be used
        });
    } else {
      this.redis = null;
      this.logger.log('REDIS_URL not set — using in-memory cache');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      await this.redis.quit();
    }
  }

  // ─── User profile cache ───────────────────────────────

  async getCachedUser(userId: string): Promise<CachedUser | null> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(`${this.KEY_PREFIX_USER}${userId}`);
        return raw ? (JSON.parse(raw) as CachedUser) : null;
      } catch {
        return this.getMemUser(userId);
      }
    }
    return this.getMemUser(userId);
  }

  async cacheUser(userId: string, role: string, providerId: string | null): Promise<void> {
    const value: CachedUser = { role, provider_id: providerId };

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(
          `${this.KEY_PREFIX_USER}${userId}`,
          JSON.stringify(value),
          'EX',
          this.USER_CACHE_TTL_SEC,
        );
        return;
      } catch {
        // fall through to in-memory
      }
    }
    this.memUserCache.set(userId, { ...value, cachedAt: Date.now() });
  }

  async invalidateUser(userId: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(`${this.KEY_PREFIX_USER}${userId}`);
        return;
      } catch {
        // fall through
      }
    }
    this.memUserCache.delete(userId);
  }

  // ─── Token blacklist (logout) ─────────────────────────

  async blacklistToken(jti: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(
          `${this.KEY_PREFIX_BL}${jti}`,
          '1',
          'EX',
          this.BLACKLIST_TTL_SEC,
        );
        return;
      } catch {
        // fall through
      }
    }
    if (this.memBlacklist.size >= this.MAX_MEM_BLACKLIST) {
      const first = this.memBlacklist.values().next().value;
      if (first) this.memBlacklist.delete(first);
    }
    this.memBlacklist.add(jti);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const exists = await this.redis.exists(`${this.KEY_PREFIX_BL}${jti}`);
        return exists === 1;
      } catch {
        return this.memBlacklist.has(jti);
      }
    }
    return this.memBlacklist.has(jti);
  }

  // ─── Private helpers ──────────────────────────────────

  private getMemUser(userId: string): CachedUser | null {
    const entry = this.memUserCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.USER_CACHE_TTL_SEC * 1000) {
      this.memUserCache.delete(userId);
      return null;
    }
    return { role: entry.role, provider_id: entry.provider_id };
  }
}
