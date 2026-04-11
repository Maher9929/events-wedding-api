import { Injectable } from '@nestjs/common';

interface CachedUser {
  role: string;
  provider_id: string | null;
  cachedAt: number;
}

/**
 * Lightweight in-memory cache for JWT validation results
 * and token blacklisting (logout invalidation).
 *
 * In production with multiple instances, replace with Redis.
 */
@Injectable()
export class AuthCacheService {
  private readonly userCache = new Map<string, CachedUser>();
  private readonly blacklistedTokens = new Set<string>();

  /** Cache TTL in milliseconds (5 minutes) */
  private readonly USER_CACHE_TTL = 5 * 60 * 1000;

  /** Max blacklist size before pruning (prevent memory leak) */
  private readonly MAX_BLACKLIST_SIZE = 10_000;

  // ─── User profile cache ───────────────────────────────

  getCachedUser(userId: string): Omit<CachedUser, 'cachedAt'> | null {
    const entry = this.userCache.get(userId);
    if (!entry) return null;

    // Expired?
    if (Date.now() - entry.cachedAt > this.USER_CACHE_TTL) {
      this.userCache.delete(userId);
      return null;
    }

    return { role: entry.role, provider_id: entry.provider_id };
  }

  cacheUser(userId: string, role: string, providerId: string | null): void {
    this.userCache.set(userId, {
      role,
      provider_id: providerId,
      cachedAt: Date.now(),
    });
  }

  invalidateUser(userId: string): void {
    this.userCache.delete(userId);
  }

  // ─── Token blacklist (logout) ─────────────────────────

  blacklistToken(jti: string): void {
    // Prune if too large (oldest entries removed by Set iteration order)
    if (this.blacklistedTokens.size >= this.MAX_BLACKLIST_SIZE) {
      const first = this.blacklistedTokens.values().next().value;
      if (first) this.blacklistedTokens.delete(first);
    }
    this.blacklistedTokens.add(jti);
  }

  isTokenBlacklisted(jti: string): boolean {
    return this.blacklistedTokens.has(jti);
  }
}
