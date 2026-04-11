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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteRequestDto } from './dto/quote-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
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
  findMyQuotes(
    @Request() req,
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
  findOne(@Request() req, @Param('id') id: string) {
    return this.quotesService.findOne(id, req.user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  create(@Request() req, @Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.create(req.user.id, createQuoteDto);
  }

  @Patch('id/:id/send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  send(@Request() req, @Param('id') id: string) {
    return this.quotesService.send(id, req.user.id);
  }

  @Patch('id/:id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: 'accepted' | 'rejected',
  ) {
    return this.quotesService.updateStatus(id, req.user.id, status);
  }

  @Delete('id/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req, @Param('id') id: string) {
    return this.quotesService.remove(id, req.user.id);
  }

  // Quote Request endpoints
  @Post('request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  createQuoteRequest(
    @Request() req,
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
  findQuoteRequests(@Request() req, @Query('status') status?: string) {
    return this.quotesService.findQuoteRequests(req.user.id, status);
  }

  @Get('request/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllQuoteRequests(@Query('status') status?: string) {
    return this.quotesService.findQuoteRequests(undefined, status);
  }
}
