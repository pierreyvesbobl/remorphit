import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

/**
 * Custom storage adapter using chrome.storage.local
 * so all extension contexts (sidepanel, auth page, background)
 * share the same Supabase session.
 */
const chromeStorageAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        const result = await chrome.storage.local.get(key);
        return (result[key] as string) ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        await chrome.storage.local.set({ [key]: value });
    },
    removeItem: async (key: string): Promise<void> => {
        await chrome.storage.local.remove(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // We handle tokens manually via chrome.identity
    }
});
