import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
} from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateBookingDto, @Request() req: AuthenticatedRequest) {
    return await this.bookingsService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all bookings (admin)' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return await this.bookingsService.findAll(
      status,
      paymentStatus,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
      sortBy,
      sortOrder,
    );
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user bookings' })
  @ApiResponse({ status: 200, description: 'User bookings retrieved successfully' })
  async findMyBookings(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return await this.bookingsService.findByClient(
      req.user.id,
      status,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
      sortOrder,
    );
  }

  @Get('provider/:providerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookings for a provider' })
  @ApiResponse({ status: 200, description: 'Provider bookings retrieved' })
  async findByProvider(
    @Param('providerId') providerId: string,
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    const targetProviderId =
      providerId === 'me' ? (req.user.provider_id ?? req.user.id) : providerId;
    return await this.bookingsService.findByProvider(
      targetProviderId,
      req.user.id,
      status,
      paymentStatus,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
      sortOrder,
    );
  }

  @Get('stats/:providerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getStats(@Param('providerId') providerId: string, @Request() req: AuthenticatedRequest) {
    const targetProviderId =
      providerId === 'me' ? (req.user.provider_id ?? req.user.id) : providerId;
    return await this.bookingsService.getStats(targetProviderId, req.user.id);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return await this.bookingsService.getAdminStats();
  }

  @Get('unavailable-dates/:providerId')
  async getUnavailableDates(
    @Param('providerId') providerId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return await this.bookingsService.getUnavailableDates(
      providerId,
      start,
      end,
    );
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.bookingsService.findOne(id, req.user.id);
  }

  @Patch('id/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.bookingsService.updateStatus(id, req.user.id, dto);
  }

  @Post('id/:id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for a booking' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createPaymentIntent(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('paymentType') paymentType: 'deposit' | 'balance' | 'full',
  ) {
    return await this.bookingsService.createPaymentIntent(
      id,
      req.user.id,
      paymentType,
    );
  }

  @Post('id/:id/mock-confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async confirmMockPayment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('paymentType') paymentType: string,
  ) {
    return this.bookingsService.confirmMockPayment(
      id,
      req.user.id,
      paymentIntentId,
      paymentType,
    );
  }
}
