import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ovmaieigdfkfkgwutres.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lhWXFbIDqFA6wSflqdsyjQ_3iCa-QdU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
