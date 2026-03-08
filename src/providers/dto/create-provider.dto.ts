import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProviderDto {
  @IsString()
  @IsOptional()
  company_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  website?: string;

  @IsObject()
  @IsOptional()
  social_media?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  // Enhanced fields
  @IsNumber()
  @Min(0)
  @IsOptional()
  min_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_capacity?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  event_styles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  portfolio_images?: string[];

  @IsString()
  @IsOptional()
  video_url?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  years_experience?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  response_time_hours?: number;
}
