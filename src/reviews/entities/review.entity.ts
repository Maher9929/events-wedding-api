export class Review {
  id: string;
  service_id: string;
  client_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}
