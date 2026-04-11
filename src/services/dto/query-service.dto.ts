import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryServiceDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  provider_id?: string;

  @IsEnum(['fixed', 'hourly', 'package', 'custom'])
  @IsOptional()
  price_type?: 'fixed' | 'hourly' | 'package' | 'custom';

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  min_price?: number;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  max_price?: number;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  min_rating?: number;

  @IsEnum(['onsite', 'online', 'both'])
  @IsOptional()
  location_type?: 'onsite' | 'online' | 'both';

  @IsString()
  @IsOptional()
  city?: string;

  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  limit?: number;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;

  @IsString()
  @IsOptional()
  sort_by?: 'price' | 'rating' | 'created_at' | 'title' | 'review_count';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sort_order?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  available_date?: string;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  max_budget?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  min_capacity?: number;

  @Transform(({ value }) =>
    value && !isNaN(Number(value)) ? Number(value) : undefined,
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  max_capacity?: number;

  @IsString()
  @IsOptional()
  event_style?: string;
}
