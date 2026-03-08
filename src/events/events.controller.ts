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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateTimelineItemDto,
  UpdateTimelineItemDto,
} from './dto/event-features.dto';
import { CreateGuestDto, UpdateGuestDto } from './dto/event-guests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@ApiTags('events')
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
  async findByEventType(
    @Param('eventType') eventType: string,
    @Query('limit') limit?: string,
  ) {
    return await this.eventsService.findByEventType(
      eventType,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  async findMyEvents(
    @Request() req,
    @Query('status') status?: string,
    @Query('sort_order') sortOrder?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('event_type') eventType?: string,
  ) {
    return await this.eventsService.findByClient(
      req.user.id,
      status,
      sortOrder,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      eventType,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return await this.eventsService.getStats();
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
    @Request() req,
  ) {
    return await this.eventsService.update(id, req.user.id, updateEventDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('status')
    status:
      | 'planning'
      | 'confirmed'
      | 'in_progress'
      | 'completed'
      | 'cancelled',
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

  // ─── Budget Endpoints ─────────────────────────────────────────────────────
  @Get(':id/budget')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getBudget(@Param('id') id: string) {
    return await this.eventsService.getBudget(id);
  }

  @Post(':id/budget')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addBudgetItem(@Param('id') id: string, @Body() dto: CreateBudgetDto) {
    return await this.eventsService.addBudgetItem(id, dto);
  }

  @Patch('budget/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateBudgetItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return await this.eventsService.updateBudgetItem(itemId, dto);
  }

  @Delete('budget/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeBudgetItem(@Param('itemId') itemId: string) {
    return await this.eventsService.removeBudgetItem(itemId);
  }

  // ─── Checklist Endpoints ──────────────────────────────────────────────────
  @Get(':id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTasks(@Param('id') id: string) {
    return await this.eventsService.getTasks(id);
  }

  @Post(':id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTask(@Param('id') id: string, @Body() dto: CreateTaskDto) {
    return await this.eventsService.addTask(id, dto);
  }

  @Patch('tasks/:taskId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return await this.eventsService.updateTask(taskId, dto);
  }

  @Delete('tasks/:taskId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeTask(@Param('taskId') taskId: string) {
    return await this.eventsService.removeTask(taskId);
  }

  // ─── Timeline Endpoints ───────────────────────────────────────────────────
  @Get(':id/timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTimeline(@Param('id') id: string) {
    return await this.eventsService.getTimeline(id);
  }

  @Post(':id/timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTimelineItem(
    @Param('id') id: string,
    @Body() dto: CreateTimelineItemDto,
  ) {
    return await this.eventsService.addTimelineItem(id, dto);
  }

  @Patch('timeline/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTimelineItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTimelineItemDto,
  ) {
    return await this.eventsService.updateTimelineItem(itemId, dto);
  }

  @Delete('timeline/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeTimelineItem(@Param('itemId') itemId: string) {
    return await this.eventsService.removeTimelineItem(itemId);
  }

  // ─── Guest Endpoints ──────────────────────────────────────────────────────
  @Get(':id/guests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all guests for an event' })
  async getGuests(@Param('id') id: string) {
    return await this.eventsService.getGuests(id);
  }

  @Get(':id/guests/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest statistics for an event' })
  async getGuestStats(@Param('id') id: string) {
    return await this.eventsService.getGuestStats(id);
  }

  @Post(':id/guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a guest to an event' })
  async addGuest(@Param('id') id: string, @Body() dto: CreateGuestDto) {
    return await this.eventsService.addGuest(id, dto);
  }

  @Patch(':id/guests/:guestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a guest' })
  async updateGuest(
    @Param('guestId') guestId: string,
    @Body() dto: UpdateGuestDto,
  ) {
    return await this.eventsService.updateGuest(guestId, dto);
  }

  @Delete(':id/guests/:guestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a guest from an event' })
  async removeGuest(@Param('guestId') guestId: string) {
    await this.eventsService.removeGuest(guestId);
  }
}
