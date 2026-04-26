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
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async create(@Body() createServiceDto: CreateServiceDto, @Request() req: AuthenticatedRequest) {
    return await this.servicesService.createByUserId(
      req.user.id,
      createServiceDto,
    );
  }

  @Get()
  async findAll(@Query() query: QueryServiceDto) {
    return await this.servicesService.findAll(query);
  }

  @Get('featured')
  async findFeatured(@Query('limit') limit?: string) {
    return await this.servicesService.findFeatured(
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('category/:categoryId')
  async findByCategory(
    @Param('categoryId') categoryId: string,
    @Query() query: QueryServiceDto,
  ) {
    return await this.servicesService.findAll({
      ...query,
      category_id: categoryId,
    });
  }

  @Get('my-services')
  @UseGuards(JwtAuthGuard)
  async findMyServices(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.servicesService.findByUserId(
      req.user.id,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    return await this.servicesService.findOne(id);
  }

  @Patch('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.servicesService.update(id, req.user.id, updateServiceDto);
  }

  @Patch('id/:id/featured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateFeatured(
    @Param('id') id: string,
    @Body('isFeatured') isFeatured: boolean,
    @Body('featuredUntil') featuredUntil?: string,
  ) {
    return await this.servicesService.updateFeatured(
      id,
      isFeatured,
      featuredUntil ? new Date(featuredUntil) : undefined,
    );
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.servicesService.remove(id, req.user.id);
  }
}
