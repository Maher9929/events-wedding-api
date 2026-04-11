import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString()
  entity_type: string;

  @IsString()
  entity_id: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateReportActionDto {
  @IsEnum(['resolved', 'dismissed', 'escalated', 'pending'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  action_taken?: string;
}

export class ReviewKycDto {
  @IsEnum(['approved', 'rejected'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
