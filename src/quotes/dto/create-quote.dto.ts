import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
} from 'class-validator';

export class QuoteItemDto {
  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateQuoteDto {
  @IsString()
  client_id: string;

  @IsArray()
  items: QuoteItemDto[];

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsDate()
  valid_until?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status?: string;
}
