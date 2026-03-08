import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEventDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['wedding', 'birthday', 'corporate', 'conference', 'party', 'other'])
  @IsOptional()
  event_type?:
    | 'wedding'
    | 'birthday'
    | 'corporate'
    | 'conference'
    | 'party'
    | 'other';

  @IsString()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  venue_city?: string;

  @IsString()
  @IsOptional()
  venue_region?: string;

  @IsEnum(['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  @IsEnum(['private', 'public'])
  @IsOptional()
  visibility?: 'private' | 'public';

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_template?: boolean;

  @IsString()
  @IsOptional()
  date_from?: string;

  @IsString()
  @IsOptional()
  date_to?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  min_budget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  max_budget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @IsString()
  @IsOptional()
  sort_by?: 'event_date' | 'created_at' | 'title' | 'budget' | 'guest_count';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sort_order?: 'asc' | 'desc';
}
