import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ProviderStatsService } from './provider-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('provider-analytics')
@UseGuards(JwtAuthGuard)
export class ProviderStatsController {
  constructor(private readonly providerStatsService: ProviderStatsService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getStats(
    @Request() req,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    const providerId =
      req.user.role === UserRole.ADMIN
        ? (req.query.providerId as string)
        : req.user.id;

    return this.providerStatsService.getProviderStats(providerId, period);
  }

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getPerformance(@Request() req) {
    const providerId =
      req.user.role === UserRole.ADMIN
        ? (req.query.providerId as string)
        : req.user.id;

    return this.providerStatsService.getPerformanceMetrics(providerId);
  }
}
