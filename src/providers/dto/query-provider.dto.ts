import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

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
  is_verified?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  min_rating?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}
