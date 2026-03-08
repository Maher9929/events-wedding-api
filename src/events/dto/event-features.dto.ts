import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  category: string;

  @IsString()
  item_name: string;

  @IsNumber()
  estimated_cost: number;

  @IsOptional()
  @IsNumber()
  actual_cost?: number;

  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBudgetDto {
  category?: string;
  item_name?: string;
  estimated_cost?: number;
  actual_cost?: number;
  paid_amount?: number;
  notes?: string;
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed'])
  status?: 'pending' | 'in_progress' | 'completed';

  @IsOptional()
  @IsDateString()
  due_date?: Date;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}

export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  due_date?: Date;
  assigned_to?: string;
}

export class CreateTimelineItemDto {
  @IsString()
  start_time: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsString()
  activity: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order_index?: number;
}

export class UpdateTimelineItemDto {
  start_time?: string;
  end_time?: string;
  activity?: string;
  description?: string;
  order_index?: number;
}
