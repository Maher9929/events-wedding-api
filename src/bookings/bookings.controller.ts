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
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
} from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async create(@Body() dto: CreateBookingDto, @Request() req) {
    return await this.bookingsService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  async findMyBookings(
    @Request() req,
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
  async findByProvider(
    @Param('providerId') providerId: string,
    @Request() req,
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    const targetProviderId = providerId === 'me' ? req.user.id : providerId;
    return await this.bookingsService.findByProvider(
      targetProviderId,
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
  async getStats(@Param('providerId') providerId: string) {
    return await this.bookingsService.getStats(providerId);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return await this.bookingsService.getAdminStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Request() req,
  ) {
    return await this.bookingsService.updateStatus(id, req.user.id, dto);
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Param('id') id: string,
    @Request() req,
    @Body('paymentType') paymentType: 'deposit' | 'balance' | 'full',
  ) {
    return await this.bookingsService.createPaymentIntent(
      id,
      req.user.id,
      paymentType,
    );
  }

  @Post(':id/mock-confirm')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async confirmMockPayment(
    @Param('id') id: string,
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('paymentType') paymentType: string,
  ) {
    return this.bookingsService.confirmMockPayment(
      id,
      paymentIntentId,
      paymentType,
    );
  }
}
