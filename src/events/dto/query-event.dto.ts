import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';

export class QueryEventDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['wedding', 'birthday', 'corporate', 'conference', 'party', 'other'])
  @IsOptional()
  event_type?: 'wedding' | 'birthday' | 'corporate' | 'conference' | 'party' | 'other';

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
  min_budget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_budget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;

  @IsString()
  @IsOptional()
  sort_by?: 'event_date' | 'created_at' | 'title' | 'budget' | 'guest_count';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sort_order?: 'asc' | 'desc';
}
