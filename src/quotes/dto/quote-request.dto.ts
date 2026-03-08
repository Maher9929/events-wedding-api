import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
} from 'class-validator';

export class QuoteRequestItemDto {
  @IsString()
  category_id: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  estimated_budget?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateQuoteRequestDto {
  @IsString()
  event_id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  items: QuoteRequestItemDto[];

  @IsArray()
  @IsString({ each: true })
  provider_ids: string[];

  @IsOptional()
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @IsNumber()
  max_budget?: number;

  @IsOptional()
  @IsString()
  event_type?: string;

  @IsOptional()
  @IsString()
  event_date?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  guest_count?: number;

  @IsOptional()
  @IsEnum(['open', 'closed', 'draft'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
