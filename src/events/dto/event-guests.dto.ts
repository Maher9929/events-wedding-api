import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum GuestStatus {
  INVITED = 'invited',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  MAYBE = 'maybe',
}

export class CreateGuestDto {
  @ApiProperty({ example: 'Ahmed Benali' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'ahmed@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+212600000000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: GuestStatus, default: GuestStatus.INVITED })
  @IsEnum(GuestStatus)
  @IsOptional()
  status?: GuestStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGuestDto extends PartialType(CreateGuestDto) {}
