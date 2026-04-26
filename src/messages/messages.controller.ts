import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  sendMessage(@Request() req: AuthenticatedRequest, @Body() createMessageDto: CreateMessageDto) {
    // req.user should be populated by AuthGuard
    return this.messagesService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  getConversations(@Request() req: AuthenticatedRequest) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get('conversations/id/:id')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  getMessages(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.messagesService.getMessages(id, req.user.id);
  }

  @Post('conversations')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Create a conversation and send first message' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  createConversation(
    @Request() req: AuthenticatedRequest,
    @Body() body: { recipient_id: string; first_message?: string },
  ) {
    return this.messagesService.sendMessage(req.user.id, {
      recipient_id: body.recipient_id,
      content: body.first_message || '',
    });
  }

  @Patch('conversations/id/:id/read')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  markRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.messagesService.markConversationRead(id, req.user.id);
  }
}
