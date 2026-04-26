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
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
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
  async create(@Body() createEventDto: CreateEventDto, @Request() req: AuthenticatedRequest) {
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
    @Request() req: AuthenticatedRequest,
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

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    return await this.eventsService.findOne(id);
  }

  @Patch('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.update(id, req.user.id, updateEventDto);
  }

  @Patch('id/:id/status')
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
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.updateStatus(id, req.user.id, status);
  }

  @Delete('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.eventsService.remove(id, req.user.id);
  }

  // ─── Budget Endpoints ─────────────────────────────────────────────────────
  @Get('id/:id/budget')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getBudget(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.getBudget(id, req.user.id);
  }

  @Post('id/:id/budget')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addBudgetItem(
    @Param('id') id: string,
    @Body() dto: CreateBudgetDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.addBudgetItem(id, req.user.id, dto);
  }

  @Patch('budget/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateBudgetItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateBudgetDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.updateBudgetItem(itemId, req.user.id, dto);
  }

  @Delete('budget/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeBudgetItem(@Param('itemId') itemId: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.removeBudgetItem(itemId, req.user.id);
  }

  // ─── Checklist Endpoints ──────────────────────────────────────────────────
  @Get('id/:id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTasks(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.getTasks(id, req.user.id);
  }

  @Post('id/:id/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTask(
    @Param('id') id: string,
    @Body() dto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.addTask(id, req.user.id, dto);
  }

  @Patch('tasks/:taskId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.updateTask(taskId, req.user.id, dto);
  }

  @Delete('tasks/:taskId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeTask(@Param('taskId') taskId: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.removeTask(taskId, req.user.id);
  }

  // ─── Timeline Endpoints ───────────────────────────────────────────────────
  @Get('id/:id/timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getTimeline(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.getTimeline(id, req.user.id);
  }

  @Post('id/:id/timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addTimelineItem(
    @Param('id') id: string,
    @Body() dto: CreateTimelineItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.addTimelineItem(id, req.user.id, dto);
  }

  @Patch('timeline/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateTimelineItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTimelineItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.updateTimelineItem(
      itemId,
      req.user.id,
      dto,
    );
  }

  @Delete('timeline/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeTimelineItem(@Param('itemId') itemId: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.removeTimelineItem(itemId, req.user.id);
  }

  // ─── Guest Endpoints ──────────────────────────────────────────────────────
  @Get('id/:id/guests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all guests for an event' })
  async getGuests(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.getGuests(id, req.user.id);
  }

  @Get('id/:id/guests/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest statistics for an event' })
  async getGuestStats(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.eventsService.getGuestStats(id, req.user.id);
  }

  @Post('id/:id/guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a guest to an event' })
  async addGuest(
    @Param('id') id: string,
    @Body() dto: CreateGuestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.addGuest(id, req.user.id, dto);
  }

  @Patch('id/:id/guests/:guestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a guest' })
  async updateGuest(
    @Param('guestId') guestId: string,
    @Body() dto: UpdateGuestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.eventsService.updateGuest(guestId, req.user.id, dto);
  }

  @Delete('id/:id/guests/:guestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a guest from an event' })
  async removeGuest(@Param('guestId') guestId: string, @Request() req: AuthenticatedRequest) {
    await this.eventsService.removeGuest(guestId, req.user.id);
  }
}
