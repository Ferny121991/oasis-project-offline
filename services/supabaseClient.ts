import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovmaieigdfkfkgwutres.supabase.co';
const supabaseAnonKey = 'sb_publishable_lhWXFbIDqFA6wSflqdsyjQ_3iCa-QdU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
