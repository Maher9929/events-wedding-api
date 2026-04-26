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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/dto/create-user.dto';

@ApiTags('disputes')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Open a new dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      booking_id: string;
      reason: string;
      description: string;
      evidence_urls?: string[];
    },
  ) {
    return this.disputesService.create(req.user.id, body);
  }

  @Get('my-disputes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List disputes for the current user' })
  @ApiResponse({ status: 200, description: 'User disputes retrieved' })
  async getMyDisputes(@Request() req: AuthenticatedRequest) {
    return this.disputesService.getMyDisputes(req.user.id);
  }

  @Get('provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List disputes for a provider' })
  @ApiResponse({ status: 200, description: 'Provider disputes retrieved' })
  async getProviderDisputes(@Request() req: AuthenticatedRequest) {
    return this.disputesService.getDisputesByProvider(req.user.id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all disputes (admin)' })
  @ApiResponse({ status: 200, description: 'All disputes retrieved' })
  async getAllDisputes(@Query('status') status?: string) {
    return this.disputesService.getAllDisputes(status);
  }

  @Patch(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provider responds to a dispute' })
  @ApiResponse({ status: 200, description: 'Response submitted' })
  async providerRespond(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('response') response: string,
  ) {
    return this.disputesService.providerRespond(id, req.user.id, response);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a dispute (admin)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolve(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { resolution: string; resolution_notes?: string },
  ) {
    return this.disputesService.resolve(id, req.user.id, body);
  }
}
