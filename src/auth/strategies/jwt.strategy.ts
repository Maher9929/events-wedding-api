import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthCacheService } from '../auth-cache.service';

/** Shape of the decoded JWT token payload */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly authCache: AuthCacheService,
  ) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  async validate(payload: JwtPayload) {
    // Check if token was blacklisted (user logged out)
    if (payload.jti && this.authCache.isTokenBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked.');
    }

    // Try cache first (avoids DB queries on every request)
    const cached = this.authCache.getCachedUser(payload.sub);
    if (cached) {
      return {
        sub: payload.sub,
        id: payload.sub,
        email: payload.email,
        role: cached.role,
        provider_id: cached.provider_id,
        jti: payload.jti,
      };
    }

    // Cache miss — fetch from DB
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', payload.sub)
      .single();

    if (error || !profile) {
      throw new UnauthorizedException('User profile not found.');
    }

    // If user is a provider, fetch provider_id
    let providerId: string | null = null;
    if (profile.role === 'provider') {
      const { data: provider } = await this.supabase
        .from('providers')
        .select('id')
        .eq('user_id', payload.sub)
        .single();
      providerId = provider?.id ?? null;
    }

    // Store in cache (TTL 5 min)
    this.authCache.cacheUser(payload.sub, profile.role, providerId);

    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: profile.role,
      provider_id: providerId,
      jti: payload.jti,
    };
  }
}
