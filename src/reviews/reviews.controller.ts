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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 409, description: 'Already reviewed' })
  async create(@Body() dto: CreateReviewDto, @Request() req: AuthenticatedRequest) {
    return await this.reviewsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
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
  @ApiOperation({ summary: 'List reviews for a service' })
  @ApiResponse({ status: 200, description: 'Service reviews retrieved' })
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
  @ApiOperation({ summary: 'Get average rating for a service' })
  @ApiResponse({ status: 200, description: 'Average rating returned' })
  async getAverageRating(@Param('serviceId') serviceId: string) {
    return await this.reviewsService.getAverageRating(serviceId);
  }

  @Post('id/:id/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  @ApiResponse({ status: 200, description: 'Review reported' })
  async reportReview(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.reviewsService.reportReview(id, req.user.id, reason);
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.reviewsService.remove(id, req.user.id);
  }
}
