import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @Roles(UserRole.CLIENT, UserRole.PROVIDER, UserRole.ADMIN)
  async createReport(@Body() reportDto: any, @Request() req) {
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

  @Patch('reports/:id')
  @Roles(UserRole.ADMIN)
  async updateReport(
    @Param('id') id: string,
    @Body() action: any,
    @Request() req,
  ) {
    return this.moderationService.updateReport(id, action, req.user.id);
  }

  @Get('kyc/pending')
  @Roles(UserRole.ADMIN)
  async getKycPending() {
    return this.moderationService.getKycPending();
  }

  @Patch('kyc/:id')
  @Roles(UserRole.ADMIN)
  async reviewKycDocument(
    @Param('id') id: string,
    @Body() review: any,
    @Request() req,
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
