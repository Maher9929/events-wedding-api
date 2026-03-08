import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProviderDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_verified?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  min_rating?: number;

  @IsDateString()
  @IsOptional()
  available_date?: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  max_budget?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  min_capacity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  max_capacity?: number;

  @IsString()
  @IsOptional()
  event_style?: string; // ex: 'modern', 'traditional', 'rustic', etc.

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
  sort_by?: string;
}
