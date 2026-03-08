import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  short_description?: string;

  @IsEnum(['fixed', 'hourly', 'package', 'custom'])
  price_type: 'fixed' | 'hourly' | 'package' | 'custom';

  @IsNumber()
  @Min(0)
  base_price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(15)
  @IsOptional()
  duration_minutes?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  min_capacity?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  max_capacity?: number;

  @IsEnum(['onsite', 'online', 'both'])
  @IsOptional()
  location_type?: 'onsite' | 'online' | 'both';

  @IsString()
  @IsOptional()
  service_area?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inclusions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exclusions?: string[];

  @IsString()
  @IsOptional()
  additional_info?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  video_url?: string;

  @IsString()
  @IsOptional()
  cancellation_policy?: string;

  @IsObject()
  @IsOptional()
  availability_settings?: {
    advance_booking_days: number;
    cancellation_policy: string;
    deposit_required: boolean;
    deposit_percentage?: number;
  };

  @IsOptional()
  is_active?: boolean;

  @IsOptional()
  is_featured?: boolean;
}
