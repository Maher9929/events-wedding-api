import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSearch } from '../common/sanitize';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { UserProfile } from './entities/user.entity';
import { AuditLogService } from '../common/audit-log.service';
import { AuthCacheService } from '../auth/auth-cache.service';

export type PublicUserProfile = Pick<
  UserProfile,
  'id' | 'full_name' | 'avatar_url' | 'role' | 'city'
>;

export type PrivateUserProfile = Pick<
  UserProfile,
  | 'id'
  | 'email'
  | 'full_name'
  | 'phone'
  | 'avatar_url'
  | 'bio'
  | 'role'
  | 'city'
  | 'preferences'
  | 'history'
  | 'created_at'
  | 'updated_at'
>;

const PRIVATE_PROFILE_FIELDS =
  'id, email, full_name, phone, avatar_url, bio, role, city, preferences, history, created_at, updated_at';

const ADMIN_PROFILE_FIELDS =
  'id, email, full_name, phone, avatar_url, bio, role, city, is_banned, ban_until, ban_reason, created_at, updated_at';

const PUBLIC_PROFILE_FIELDS = 'id, full_name, avatar_url, role, city';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly authCache: AuthCacheService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const requestedRole =
      registerDto.role === UserRole.PROVIDER
        ? UserRole.PROVIDER
        : UserRole.CLIENT;

    // Check if user already exists
    const { data: existingUser } = await this.supabase
      .from('user_profiles')
      .select('email')
      .eq('email', registerDto.email)
      .single();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Create user with admin API (preserves service_role context for DB ops)
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: registerDto.email,
        password: registerDto.password,
        email_confirm: true,
      });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    const userId = authData.user.id;

    // Upsert profile — handles both cases:
    // 1. DB trigger already created it → update with full_name/phone/role
    // 2. Trigger hasn't fired yet → insert it directly
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          email: registerDto.email,
          full_name: registerDto.full_name || null,
          phone: registerDto.phone || null,
          role: requestedRole,
        },
        { onConflict: 'id' },
      )
      .select(PRIVATE_PROFILE_FIELDS)
      .single();

    if (profileError || !profile) {
      this.logger.error(
        `Failed to upsert user profile: ${profileError?.message}`,
      );
      throw new BadRequestException(
        'Failed to create user profile. Please contact support.',
      );
    }

    const token = await this.generateToken(profile);

    await this.auditLogService.log(
      profile.id,
      'user_register',
      'users',
      profile.id,
      {
        role: profile.role,
        email: profile.email,
      },
    );

    return {
      access_token: token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const authClient = this.createPasswordAuthClient();
    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user profile using the injected service client.
    const authId = authData.user?.id;
    const authEmail = authData.user?.email;

    let { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select(PRIVATE_PROFILE_FIELDS)
      .eq('id', authId)
      .single();

    // Self-healing: if auth succeeded but profile is missing, create it
    if ((profileError || !profile) && authId && authEmail) {
      this.logger.warn(
        `User ${authId} exists in auth but missing from user_profiles — auto-creating`,
      );
      const { data: newProfile, error: createError } = await this.supabase
        .from('user_profiles')
        .upsert(
          {
            id: authId,
            email: authEmail,
            full_name: authData.user?.user_metadata?.full_name || null,
            role: 'client',
          },
          { onConflict: 'id' },
        )
        .select(PRIVATE_PROFILE_FIELDS)
        .single();

      if (createError || !newProfile) {
        this.logger.error(
          `Failed to auto-create profile: ${createError?.message}`,
        );
        throw new NotFoundException('User profile not found');
      }
      profile = newProfile;
      profileError = null;
    }

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Fetch provider_id if user is a provider
    let providerId: string | null = null;
    if (profile.role === UserRole.PROVIDER) {
      const { data: providerData } = await this.supabase
        .from('providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      providerId = providerData?.id || null;
    }

    const token = await this.generateToken(profile, providerId);

    await this.auditLogService.log(
      profile.id,
      'user_login',
      'users',
      profile.id,
      {
        role: profile.role,
      },
    );

    return {
      access_token: token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    };
  }

  async create(createUserDto: CreateUserDto): Promise<UserProfile> {
    // Check if user already exists
    const { data: existingUser } = await this.supabase
      .from('user_profiles')
      .select('email')
      .eq('email', createUserDto.email)
      .single();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Create user with admin API (preserves service_role context)
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: createUserDto.email,
        password: createUserDto.password,
        email_confirm: true,
      });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    // Create user profile
    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert({
        id: authData.user?.id,
        email: createUserDto.email,
        full_name: createUserDto.full_name,
        phone: createUserDto.phone,
        role: createUserDto.role || UserRole.CLIENT,
      })
      .select(PRIVATE_PROFILE_FIELDS)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(
    search?: string,
    limit?: number,
    offset?: number,
    role?: string,
    sortOrder?: string,
  ): Promise<{ data: UserProfile[]; total: number }> {
    let queryBuilder = this.supabase
      .from('user_profiles')
      .select(ADMIN_PROFILE_FIELDS, { count: 'exact' })
      .order('created_at', { ascending: sortOrder === 'asc' });

    if (search) {
      const term = sanitizeSearch(search);
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }

    if (role && role !== 'all') {
      queryBuilder = queryBuilder.eq('role', role);
    }

    if (limit !== undefined && offset !== undefined) {
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { data: data || [], total: count || 0 };
  }

  async searchProfiles(
    query: string,
    requesterId: string,
    limit: number = 8,
  ): Promise<
    Pick<UserProfile, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role'>[]
  > {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url, role')
      .neq('id', requesterId)
      .neq('role', UserRole.ADMIN)
      .or(
        `full_name.ilike.%${sanitizeSearch(searchTerm)}%,email.ilike.%${sanitizeSearch(searchTerm)}%`,
      )
      .order('full_name', { ascending: true })
      .limit(Math.min(limit, 20));

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  async findOne(id: string): Promise<PrivateUserProfile> {
    return this.findPrivateProfile(id);
  }

  async findPrivateProfile(id: string): Promise<PrivateUserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(PRIVATE_PROFILE_FIELDS)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('User not found');
    }

    return data;
  }

  async findPublicProfile(id: string): Promise<PublicUserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(PUBLIC_PROFILE_FIELDS)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('User not found');
    }

    return data;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(PRIVATE_PROFILE_FIELDS)
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async update(
    id: string,
    updateData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const allowedFields = [
      'full_name',
      'phone',
      'bio',
      'city',
      'avatar_url',
      'language',
      'timezone',
    ];
    const safeData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updateData) {
        safeData[key] = (updateData as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(safeData).length === 0) {
      return this.findOne(id);
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(safeData)
      .eq('id', id)
      .select(PRIVATE_PROFILE_FIELDS)
      .single();

    if (error) {
      throw new NotFoundException('User not found');
    }

    return data;
  }

  async updateRole(
    id: string,
    role: UserRole,
    adminId: string,
  ): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', id)
      .select(PRIVATE_PROFILE_FIELDS)
      .single();

    if (error) {
      throw new NotFoundException('User not found');
    }

    await this.authCache.invalidateUser(id);
    await this.auditLogService.log(adminId, 'user_role_update', 'users', id, {
      role,
    });

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('User not found');
    }
  }

  async refreshToken(userId: string): Promise<{
    access_token: string;
    user: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'role'>;
  }> {
    const profile = await this.findOne(userId);

    let providerId: string | null = null;
    if (profile.role === UserRole.PROVIDER) {
      const { data: providerData } = await this.supabase
        .from('providers')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      providerId = providerData?.id || null;
    }

    const token = await this.generateToken(profile, providerId);
    return {
      access_token: token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    };
  }

  /**
   * Logout: blacklist the current token so it can't be reused.
   */
  async logout(jti: string | undefined, userId: string): Promise<void> {
    if (jti) {
      await this.authCache.blacklistToken(jti);
    }
    await this.authCache.invalidateUser(userId);

    await this.auditLogService.log(userId, 'user_logout', 'users', userId, {});
  }

  private async generateToken(
    user: UserProfile,
    providerId: string | null = null,
  ): Promise<string> {
    const payload: Record<string, string> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    if (providerId) {
      payload.provider_id = providerId;
    }

    return this.jwtService.signAsync(payload);
  }

  private createPasswordAuthClient(): SupabaseClient {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      'http://localhost:54321';
    const supabaseKey =
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      (this.configService.get<string>('NODE_ENV') === 'test'
        ? 'test-anon-key'
        : undefined);

    if (!supabaseKey) {
      throw new InternalServerErrorException(
        'Supabase auth key is not configured',
      );
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
}
