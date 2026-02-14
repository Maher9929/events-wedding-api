import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async create(@Body() createProviderDto: CreateProviderDto, @Request() req) {
    return await this.providersService.create(req.user.id, createProviderDto);
  }

  @Get()
  async findAll(@Query() query: QueryProviderDto) {
    return await this.providersService.findAll(query);
  }

  @Get('top-rated')
  async findTopRated(@Query('limit') limit?: string) {
    return await this.providersService.findTopRated(limit ? parseInt(limit) : 10);
  }

  @Get('nearby')
  async findNearby(
    @Query('lat') latitude: string,
    @Query('lng') longitude: string,
    @Query('radius') radius?: string
  ) {
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }
    return await this.providersService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 50
    );
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.PROVIDER)
  async findMyProfile(@Request() req) {
    return await this.providersService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.providersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async update(
    @Param('id') id: string, 
    @Body() updateProviderDto: UpdateProviderDto, 
    @Request() req
  ) {
    return await this.providersService.update(id, req.user.id, updateProviderDto);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateVerification(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean
  ) {
    return await this.providersService.updateVerification(id, isVerified);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    await this.providersService.remove(id, req.user.id);
  }
}
