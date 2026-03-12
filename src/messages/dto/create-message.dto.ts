import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';

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
  attachments?: any[];

  @IsEnum(['text', 'quote_request', 'quote_offer', 'attachment'])
  @IsOptional()
  type?: 'text' | 'quote_request' | 'quote_offer' | 'attachment';

  @IsOptional()
  metadata?: any;
}
