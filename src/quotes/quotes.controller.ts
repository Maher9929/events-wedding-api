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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteRequestDto } from './dto/quote-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all quotes (admin)' })
  @ApiResponse({ status: 200, description: 'Quotes retrieved' })
  findAll(
    @Query('status') status?: string,
    @Query('provider_id') providerId?: string,
    @Query('client_id') clientId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return this.quotesService.findAll(
      status,
      providerId,
      clientId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
      sortOrder,
    );
  }

  @Get('my-quotes')
  @ApiOperation({ summary: 'List current user quotes' })
  @ApiResponse({ status: 200, description: 'User quotes retrieved' })
  findMyQuotes(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.quotesService.findByUser(
      req.user.id,
      status,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
      search,
    );
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get a single quote' })
  @ApiResponse({ status: 200, description: 'Quote retrieved' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quotesService.findOne(id, req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  create(@Request() req: AuthenticatedRequest, @Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(req.user.id, createQuoteDto);
  }

  @Patch('id/:id/send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send a draft quote to client' })
  @ApiResponse({ status: 200, description: 'Quote sent' })
  send(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quotesService.send(id, req.user.id);
  }

  @Patch('id/:id/status')
  @ApiOperation({ summary: 'Accept or reject a quote' })
  @ApiResponse({ status: 200, description: 'Quote status updated' })
  updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('status') status: 'accepted' | 'rejected',
  ) {
    return this.quotesService.updateStatus(id, req.user.id, status);
  }

  @Delete('id/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quote' })
  @ApiResponse({ status: 204, description: 'Quote deleted' })
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quotesService.remove(id, req.user.id);
  }

  // Quote Request endpoints
  @Post('request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a quote request' })
  @ApiResponse({ status: 201, description: 'Quote request created' })
  createQuoteRequest(
    @Request() req: AuthenticatedRequest,
    @Body() createQuoteRequestDto: CreateQuoteRequestDto,
  ) {
    return this.quotesService.createQuoteRequest(
      req.user.id,
      createQuoteRequestDto,
    );
  }

  @Get('request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List quote requests for current user' })
  @ApiResponse({ status: 200, description: 'Quote requests retrieved' })
  findQuoteRequests(@Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.quotesService.findQuoteRequests(req.user.id, status);
  }

  @Get('request/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all quote requests (admin)' })
  @ApiResponse({ status: 200, description: 'All quote requests retrieved' })
  findAllQuoteRequests(@Query('status') status?: string) {
    return this.quotesService.findQuoteRequests(undefined, status);
  }
}
