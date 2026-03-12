import { UserRole } from '../dto/create-user.dto';

export class User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
}

export class UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
}
