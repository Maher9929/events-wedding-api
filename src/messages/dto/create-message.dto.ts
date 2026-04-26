import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
} from 'class-validator';

export interface MessageAttachment {
  url: string;
  filename: string;
  content_type?: string;
  size?: number;
}

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  conversation_id?: string;

  @IsString()
  @IsOptional()
  recipient_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: MessageAttachment[];

  @IsEnum(['text', 'quote_request', 'quote_offer', 'attachment'])
  @IsOptional()
  type?: 'text' | 'quote_request' | 'quote_offer' | 'attachment';

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
