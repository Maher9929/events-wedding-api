import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsOptional()
  event_id?: string;

  @IsString()
  @IsOptional()
  quote_id?: string;

  @IsString()
  @IsOptional()
  service_id?: string;

  @IsString()
  @IsNotEmpty()
  provider_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDateString()
  booking_date: string;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  deposit_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  balance_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  platform_fee?: number;

  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed', 'rejected'])
  status?: string;

  @IsString()
  @IsOptional()
  cancellation_reason?: string;

  @IsOptional()
  @IsDateString()
  cancellation_deadline?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  promo_code_id?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  guest_count?: number;
}

export class UpdateBookingStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed', 'rejected'])
  status: string;

  @IsString()
  @IsOptional()
  cancellation_reason?: string;

  @IsString()
  @IsOptional()
  provider_notes?: string;

  @IsString()
  @IsOptional()
  client_notes?: string;
}
