import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private supabase;

  constructor(configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });

    const supabaseUrl = configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey =
      configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      configService.get<string>('SUPABASE_ANON_KEY') ||
      '';

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async validate(payload: any) {
    // Fetch profile to verify existence and get role
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', payload.sub)
      .single();

    if (error || !profile) {
      throw new UnauthorizedException('User profile not found.');
    }

    // If user is a provider, fetch provider info to get provider_id
    let providerId = null;
    if (profile.role === 'provider') {
      const { data: provider } = await this.supabase
        .from('providers')
        .select('id')
        .eq('user_id', payload.sub)
        .single();
      providerId = provider?.id;
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: profile.role,
      provider_id: providerId,
    };
  }
}
