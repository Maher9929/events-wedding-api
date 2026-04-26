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
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProviderDto } from './dto/query-provider.dto';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async create(@Body() createProviderDto: CreateProviderDto, @Request() req: AuthenticatedRequest) {
    return await this.providersService.create(req.user.id, createProviderDto);
  }

  @Get()
  async findAll(@Query() query: QueryProviderDto) {
    return await this.providersService.findAll(query);
  }

  @Get('top-rated')
  async findTopRated(@Query('limit') limit?: string) {
    return await this.providersService.findTopRated(
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('nearby')
  async findNearby(
    @Query('lat') latitude: string,
    @Query('lng') longitude: string,
    @Query('radius') radius?: string,
  ) {
    if (!latitude || !longitude) {
      throw new BadRequestException('Latitude and longitude are required');
    }
    return await this.providersService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 50,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getStats(@Request() req: AuthenticatedRequest, @Query('period') period?: string) {
    if (req.user.role === UserRole.PROVIDER) {
      // Return provider-specific stats if not admin
      return await this.providersService.getProviderStats(req.user.id, period);
    }
    return await this.providersService.getStats();
  }

  @Get('performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async getPerformance(@Request() req: AuthenticatedRequest) {
    return await this.providersService.getPerformanceMetrics(req.user.id);
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  async findMyProfile(@Request() req: AuthenticatedRequest) {
    return await this.providersService.findByUserId(req.user.id);
  }

  @Patch('my-profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return await this.providersService.updateByUserId(
      req.user.id,
      updateProviderDto,
    );
  }

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    return await this.providersService.findOnePublic(id);
  }

  // --- Availabilities ---

  @Get('id/:id/availabilities')
  async getAvailabilities(
    @Param('id') id: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return await this.providersService.getAvailabilities(
      id,
      startDate,
      endDate,
    );
  }

  @Post('id/:id/availabilities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async addAvailability(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.providersService.addAvailability(req.user.id, id, dto);
  }

  @Patch('id/:id/availabilities/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async updateAvailability(
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
    @Body() dto: UpdateAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.providersService.updateAvailability(
      req.user.id,
      id,
      availabilityId,
      dto,
    );
  }

  @Delete('id/:id/availabilities/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAvailability(
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.providersService.removeAvailability(
      req.user.id,
      id,
      availabilityId,
    );
  }

  // --- End Availabilities ---

  @Patch('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.providersService.update(
      id,
      req.user.id,
      updateProviderDto,
    );
  }

  @Patch('id/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateVerification(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return await this.providersService.updateVerification(id, isVerified);
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.providersService.remove(id, req.user.id);
  }

  // --- KYC Document Endpoints ---

  @Post('kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async submitKycDocument(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { document_type: string; file_url: string; original_name?: string },
  ) {
    return this.providersService.submitKycDocument(req.user.id, body);
  }

  @Get('kyc/my-documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  async getMyKycDocuments(@Request() req: AuthenticatedRequest) {
    return this.providersService.getMyKycDocuments(req.user.id);
  }

  @Get('kyc/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllPendingKycDocuments() {
    return this.providersService.getAllPendingKycDocuments();
  }

  @Get('id/:id/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getProviderKycDocuments(@Param('id') id: string) {
    return this.providersService.getProviderKycDocuments(id);
  }

  @Patch('kyc/:docId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reviewKycDocument(
    @Param('docId') docId: string,
    @Request() req: AuthenticatedRequest,
    @Body('status') status: 'approved' | 'rejected',
    @Body('notes') notes?: string,
  ) {
    return this.providersService.reviewKycDocument(
      docId,
      req.user.id,
      status,
      notes,
    );
  }
}
