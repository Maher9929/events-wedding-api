import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['wedding', 'birthday', 'corporate', 'conference', 'party', 'other'])
  event_type: 'wedding' | 'birthday' | 'corporate' | 'conference' | 'party' | 'other';

  @IsString()
  event_date: string;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsNumber()
  @Min(1)
  guest_count: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  venue_name?: string;

  @IsString()
  @IsOptional()
  venue_address?: string;

  @IsString()
  @IsOptional()
  venue_city?: string;

  @IsString()
  @IsOptional()
  venue_region?: string;

  @IsObject()
  @IsOptional()
  venue_coordinates?: {
    latitude: number;
    longitude: number;
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsString()
  @IsOptional()
  special_requests?: string;

  @IsEnum(['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  @IsEnum(['private', 'public'])
  @IsOptional()
  visibility?: 'private' | 'public';

  @IsOptional()
  is_template?: boolean;

  @IsString()
  @IsOptional()
  template_name?: string;
}
