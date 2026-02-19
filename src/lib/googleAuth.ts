import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';

/**
 * Initiates Google SSO via chrome.identity.launchWebAuthFlow
 * and sets the resulting session in Supabase.
 */
export async function signInWithGoogleViaExtension() {
    // 1. Get the stable redirect URL for this extension
    // Returns: https://<extension-id>.chromiumapp.org/
    const redirectUrl = chrome.identity.getRedirectURL();

    // 2. Build the Supabase OAuth URL
    const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    authUrl.searchParams.set('provider', 'google');
    authUrl.searchParams.set('redirect_to', redirectUrl);

    // 3. Launch the web auth flow (opens a popup)
    const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
    });

    if (!responseUrl) {
        throw new Error('Authentication was cancelled.');
    }

    // 4. Parse tokens from the response URL
    // Supabase may return tokens in hash fragment (implicit) or code in query params (PKCE)

    // Try hash fragment first (implicit flow)
    const hashFragment = responseUrl.includes('#') ? responseUrl.split('#')[1] : '';
    const hashParams = new URLSearchParams(hashFragment);

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        if (error) throw error;
        return;
    }

    // Try PKCE flow (Supabase returns a code)
    const urlObj = new URL(responseUrl);
    const code = urlObj.searchParams.get('code') || hashParams.get('code');

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return;
    }

    // Check for OAuth error
    const oauthError = hashParams.get('error') || urlObj.searchParams.get('error');
    const errorDesc = hashParams.get('error_description') || urlObj.searchParams.get('error_description');
    if (oauthError) {
        throw new Error(`OAuth error: ${oauthError} - ${errorDesc || ''}`);
    }

    throw new Error('Authentication failed: no token received.');
}
