export class Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}
