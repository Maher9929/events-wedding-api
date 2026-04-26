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
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';
import {
  CreateReportDto,
  UpdateReportActionDto,
  ReviewKycDto,
} from './dto/moderation.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('moderation')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @Roles(UserRole.CLIENT, UserRole.PROVIDER, UserRole.ADMIN)
  async createReport(@Body() reportDto: CreateReportDto, @Request() req: AuthenticatedRequest) {
    return this.moderationService.createReport(reportDto, req.user.id);
  }

  @Get('reports')
  @Roles(UserRole.ADMIN)
  async getReports(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.moderationService.getReports(
      status,
      type,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Patch('reports/id/:id')
  @Roles(UserRole.ADMIN)
  async updateReport(
    @Param('id') id: string,
    @Body() action: UpdateReportActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moderationService.updateReport(id, action, req.user.id);
  }

  @Get('kyc/pending')
  @Roles(UserRole.ADMIN)
  async getKycPending() {
    return this.moderationService.getKycPending();
  }

  @Patch('kyc/id/:id')
  @Roles(UserRole.ADMIN)
  async reviewKycDocument(
    @Param('id') id: string,
    @Body() review: ReviewKycDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.moderationService.reviewKycDocument(
      id,
      review.status,
      review.notes,
      req.user.id,
    );
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getModerationStats() {
    return this.moderationService.getModerationStats();
  }
}
