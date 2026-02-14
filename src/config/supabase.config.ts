import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = (configService: ConfigService) => {
  const supabaseUrl = configService.get<string>('SUPABASE_URL');
  const supabaseKey = configService.get<string>('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
};

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: getSupabaseClient,
  inject: [ConfigService],
};
