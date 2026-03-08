import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (configService: ConfigService) => {
  const supabaseUrl =
    configService.get<string>('SUPABASE_URL') || 'http://localhost:54321';
  const supabaseKey =
    configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
    configService.get<string>('SUPABASE_ANON_KEY') ||
    'placeholder-key';

  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: getSupabaseClient,
  inject: [ConfigService],
};
