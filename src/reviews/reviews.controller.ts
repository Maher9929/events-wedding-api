import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async create(@Body() dto: CreateReviewDto, @Request() req) {
    return await this.reviewsService.create(req.user.id, dto);
  }

  @Get()
  async findAll(
    @Query('rating') rating?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return await this.reviewsService.findAll(
      rating ? parseInt(rating) : undefined,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
      sortBy,
      sortOrder,
    );
  }

  @Get('service/:serviceId')
  async findByService(@Param('serviceId') serviceId: string) {
    return await this.reviewsService.findByService(serviceId);
  }

  @Get('provider/:providerId')
  async findByProvider(
    @Param('providerId') providerId: string,
    @Query('rating') rating?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return await this.reviewsService.findByProvider(
      providerId,
      rating ? parseInt(rating) : undefined,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      sortBy,
      sortOrder,
    );
  }

  @Get('service/:serviceId/rating')
  async getAverageRating(@Param('serviceId') serviceId: string) {
    return await this.reviewsService.getAverageRating(serviceId);
  }

  @Post('id/:id/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reportReview(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return await this.reviewsService.reportReview(id, req.user.id, reason);
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Request() req) {
    return await this.reviewsService.remove(id, req.user.id);
  }
}
