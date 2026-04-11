import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(['deposit', 'balance', 'full'])
  paymentType?: 'deposit' | 'balance' | 'full';
}

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
