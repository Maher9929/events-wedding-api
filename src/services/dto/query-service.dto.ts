import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min } from 'class-validator';

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

  @IsNumber()
  @Min(0)
  @IsOptional()
  min_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_price?: number;

  @IsEnum(['onsite', 'online', 'both'])
  @IsOptional()
  location_type?: 'onsite' | 'online' | 'both';

  @IsString()
  @IsOptional()
  city?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

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
  sort_by?: 'price' | 'rating' | 'created_at' | 'title';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sort_order?: 'asc' | 'desc';
}
