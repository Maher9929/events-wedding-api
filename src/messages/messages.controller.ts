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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  sendMessage(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    // req.user should be populated by AuthGuard
    return this.messagesService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('conversations')
  getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.id);
  }

  @Get('conversations/:id')
  getMessages(@Param('id') id: string) {
    return this.messagesService.getMessages(id);
  }

  @Post('conversations')
  createConversation(
    @Request() req,
    @Body() body: { recipient_id: string; first_message?: string },
  ) {
    return this.messagesService.sendMessage(req.user.id, {
      recipient_id: body.recipient_id,
      content: body.first_message || '',
    });
  }

  @Patch('conversations/:id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.messagesService.markConversationRead(id, req.user.id);
  }
}
