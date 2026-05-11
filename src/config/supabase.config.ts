import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (configService: ConfigService) => {
  const supabaseUrl =
    configService.get<string>('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseKey =
    configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
    configService.get<string>('SUPABASE_ANON_KEY') ||
    (configService.get<string>('NODE_ENV') === 'test'
      ? 'test-service-role-key'
      : undefined);

  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.',
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: getSupabaseClient,
  inject: [ConfigService],
};
