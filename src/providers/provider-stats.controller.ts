import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
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
    const providerId = this.resolveProviderStatsUserId(req);

    return this.providerStatsService.getProviderStats(providerId, period);
  }

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getPerformance(
    @Request() req: AuthenticatedRequest & { query: Record<string, string> },
  ) {
    const providerId = this.resolveProviderStatsUserId(req);

    return this.providerStatsService.getPerformanceMetrics(providerId);
  }

  private resolveProviderStatsUserId(
    req: AuthenticatedRequest & { query: Record<string, string> },
  ): string {
    if (req.user.role !== (UserRole.ADMIN as string)) {
      return req.user.id;
    }

    const providerUserId = req.query.providerUserId || req.query.providerId;
    if (!providerUserId) {
      throw new BadRequestException(
        'providerUserId query parameter is required for admin analytics',
      );
    }

    return providerUserId;
  }
}
