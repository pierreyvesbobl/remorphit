import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase Project URL and Anon Key
// You can get these from your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: localStorage, // Chrome extensions can use localStorage
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
