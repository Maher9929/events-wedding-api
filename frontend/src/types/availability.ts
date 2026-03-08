export interface Availability {
  id: string;
  provider_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  is_blocked: boolean;
  reason?: string;
}

export interface CreateAvailabilityDto {
  date: string;
  start_time?: string;
  end_time?: string;
  is_blocked?: boolean;
  reason?: string;
}

export interface UpdateAvailabilityDto extends Partial<CreateAvailabilityDto> {}
