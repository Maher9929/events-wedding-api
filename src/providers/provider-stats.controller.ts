import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ProviderStatsService } from './provider-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('provider-analytics')
@ApiBearerAuth()
@Controller('provider-analytics')
@UseGuards(JwtAuthGuard)
export class ProviderStatsController {
  constructor(private readonly providerStatsService: ProviderStatsService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getStats(
    @Request() req: AuthenticatedRequest & { query: Record<string, string> },
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
  async getPerformance(@Request() req: AuthenticatedRequest & { query: Record<string, string> }) {
    const providerId =
      req.user.role === UserRole.ADMIN
        ? (req.query.providerId as string)
        : req.user.id;

    return this.providerStatsService.getPerformanceMetrics(providerId);
  }
}
