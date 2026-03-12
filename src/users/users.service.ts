import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { UserProfile } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const { data: existingUser } = await this.supabase
      .from('user_profiles')
      .select('email')
      .eq('email', registerDto.email)
      .single();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.auth.signUp({
        email: registerDto.email,
        password: registerDto.password,
      });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Retry fetching the profile created by the DB trigger (up to 3 x 500ms)
    let profile: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      profile = result.data;
      if (profile) break;
    }

    // If trigger didn't create it, create it manually
    if (!profile) {
      const { data: manualProfile, error: manualError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: registerDto.email,
          full_name: registerDto.full_name || null,
          phone: registerDto.phone || null,
          role: registerDto.role || 'client',
        })
        .select()
        .single();

      if (manualError || !manualProfile) {
        throw new Error(
          'Failed to create user profile. Please contact support.',
        );
      }
      profile = manualProfile;
    }

    // Update additional profile info if provided
    if (registerDto.full_name || registerDto.phone || registerDto.role) {
      const { data: updatedProfile } = await this.supabase
        .from('user_profiles')
        .update({
          full_name: registerDto.full_name || null,
          phone: registerDto.phone || null,
          role: registerDto.role || 'client',
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updatedProfile) {
        Object.assign(profile, updatedProfile);
      }
    }

    const token = await this.generateToken(profile);

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
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user profile
    const authId = authData.user?.id;

    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authId)
      .single();

    if (profileError || !profile) {
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

    // Create user with Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.auth.signUp({
        email: createUserDto.email,
        password: createUserDto.password,
      });

    if (authError) {
      throw new Error(authError.message);
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
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
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
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: sortOrder === 'asc' });

    if (search) {
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`,
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
      throw new Error(error.message);
    }

    return { data: data || [], total: count || 0 };
  }

  async findOne(id: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
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
      .select('*')
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
      'is_banned',
    ];
    const safeData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updateData) {
        safeData[key] = (updateData as any)[key];
      }
    }

    if (Object.keys(safeData).length === 0) {
      return this.findOne(id);
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(safeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('User not found');
    }

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

  private async generateToken(
    user: UserProfile,
    providerId: string | null = null,
  ): Promise<string> {
    const payload: any = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    if (providerId) {
      payload.provider_id = providerId;
    }

    return this.jwtService.signAsync(payload);
  }
}
