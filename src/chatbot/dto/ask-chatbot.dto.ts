import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  MaxLength,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'], {
    message: 'Role must be user or assistant',
  })
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000, { message: 'Message content too long (max 2000 chars)' })
  content: string;
}

export class AskChatbotDto {
  @IsArray()
  @ArrayMaxSize(30, { message: 'Too many messages in conversation (max 30)' })
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'Language code too long' })
  language?: string;
}
