import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateAvailabilityDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
