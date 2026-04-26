import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from './dto/create-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() registerDto: RegisterDto) {
    return await this.usersService.register(registerDto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return await this.usersService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidate the current token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req: AuthenticatedRequest) {
    await this.usersService.logout(req.user.jti, req.user.id);
    return { message: 'Logged out' };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh the JWT token' })
  @ApiResponse({ status: 200, description: 'New token generated' })
  async refresh(@Request() req: AuthenticatedRequest) {
    return await this.usersService.refreshToken(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return await this.usersService.findOne(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user profile' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: UpdateUserDto,
  ) {
    return await this.usersService.update(req.user.id, updateData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('role') role?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return await this.usersService.findAll(
      search,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      role,
      sortOrder,
    );
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchProfiles(
    @Request() req: AuthenticatedRequest,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.usersService.searchProfiles(
      query || '',
      req.user.id,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Patch('id/:id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Users can only update their own profile unless they're admin
    if (req.user.id !== id && req.user.role !== (UserRole.ADMIN as string)) {
      throw new ForbiddenException('Unauthorized');
    }
    return await this.usersService.update(id, updateData);
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  async uploadAvatar(
    @Request() req: AuthenticatedRequest,
    @Body('avatar_url') avatarUrl: string,
  ) {
    if (!avatarUrl) throw new BadRequestException('avatar_url is required');
    const updated = await this.usersService.update(req.user.id, {
      avatar_url: avatarUrl,
    });
    return { url: avatarUrl, data: updated };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }
}
