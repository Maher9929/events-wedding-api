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
  Request
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    return await this.eventsService.create(req.user.id, createEventDto);
  }

  @Get()
  async findAll(@Query() query: QueryEventDto) {
    return await this.eventsService.findAll(query);
  }

  @Get('upcoming')
  async findUpcoming(@Query('limit') limit?: string) {
    return await this.eventsService.findUpcoming(limit ? parseInt(limit) : 10);
  }

  @Get('templates')
  async findTemplates(@Query('limit') limit?: string) {
    return await this.eventsService.findTemplates(limit ? parseInt(limit) : 10);
  }

  @Get('type/:eventType')
  async findByEventType(@Param('eventType') eventType: string, @Query('limit') limit?: string) {
    return await this.eventsService.findByEventType(eventType, limit ? parseInt(limit) : 10);
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CLIENT)
  async findMyEvents(@Request() req, @Query() query: { limit?: number; offset?: number }) {
    return await this.eventsService.findByClient(req.user.id, req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async update(
    @Param('id') id: string, 
    @Body() updateEventDto: UpdateEventDto, 
    @Request() req
  ) {
    return await this.eventsService.update(id, req.user.id, updateEventDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ) {
    return await this.eventsService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    await this.eventsService.remove(id, req.user.id);
  }
}
