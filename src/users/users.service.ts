import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { UserProfile } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

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
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Create user profile
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .insert({
        id: authData.user?.id,
        email: registerDto.email,
        full_name: registerDto.full_name,
        phone: registerDto.phone,
        role: UserRole.CLIENT,
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(profileError.message);
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
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email: loginDto.email,
      password: loginDto.password,
    });

    if (authError) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user profile
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user?.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      console.error('Auth user ID:', authData.user?.id);
      throw new NotFoundException('User profile not found');
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
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
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

  async findAll(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
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

  async update(id: string, updateData: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updateData)
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

  private async generateToken(user: UserProfile): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }
}
