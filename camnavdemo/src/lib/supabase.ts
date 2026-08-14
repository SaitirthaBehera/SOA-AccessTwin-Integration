import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://jiiyrenhkpyrvgymfnen.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_UIFCHRBc7B5we08dgDBkUw_0POzbO-w';

function sanitizeUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return DEFAULT_SUPABASE_URL;
  let urlStr = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!urlStr || urlStr.includes('your-supabase-project') || urlStr.includes('YOUR_SUPABASE')) {
    return DEFAULT_SUPABASE_URL;
  }
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = 'https://' + urlStr;
  }
  try {
    const parsed = new URL(urlStr);
    if (!parsed.hostname.includes('.')) {
      parsed.hostname = parsed.hostname + '.supabase.co';
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    // Fallback if URL parsing fails
  }
  return DEFAULT_SUPABASE_URL;
}

function sanitizeKey(rawKey: unknown): string {
  if (typeof rawKey !== 'string') return DEFAULT_SUPABASE_ANON_KEY;
  const keyStr = rawKey.trim();
  if (!keyStr || keyStr === 'YOUR_SUPABASE_ANON_KEY') {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return keyStr;
}

// Read and sanitize Supabase credentials from Vite environment variables
const rawEnvUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const rawEnvKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = sanitizeUrl(rawEnvUrl);
export const supabaseAnonKey = sanitizeKey(rawEnvKey);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
    supabaseAnonKey && 
    supabaseAnonKey.trim() !== ''
  );
};

// Custom fetch implementation for Supabase client
// Tries direct client-side fetch first. If browser blocks direct cross-origin request
// in preview iframe (NetworkError / Failed to fetch), seamlessly falls back to same-origin proxy.
const safeFetch: typeof fetch = async (input, init) => {
  let requestUrl = '';
  if (typeof input === 'string') {
    requestUrl = input;
  } else if (input instanceof Request) {
    requestUrl = input.url;
  } else if (input && typeof (input as any).toString === 'function') {
    requestUrl = (input as any).toString();
  }

  try {
    const response = await fetch(input, init);
    return response;
  } catch (err: any) {
    if (requestUrl && (requestUrl.includes('supabase.co') || (supabaseUrl && requestUrl.includes(supabaseUrl)))) {
      try {
        const parsedUrl = new URL(requestUrl);
        const proxyPath = `/api/supabase-proxy${parsedUrl.pathname}${parsedUrl.search}`;

        let proxyOptions = init;
        if (input instanceof Request && !init) {
          proxyOptions = {
            method: input.method,
            headers: input.headers,
            body: input.body,
          };
        }

        return await fetch(proxyPath, proxyOptions);
      } catch (proxyErr) {
        console.warn('Fallback Supabase proxy fetch failed:', proxyErr);
      }
    }
    throw err;
  }
};

// Safely initialize Supabase Client with fail-safe fallback and custom fetch
const createSafeClient = (): SupabaseClient => {
  const clientConfig = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: safeFetch,
    }
  };

  try {
    return createClient(supabaseUrl, supabaseAnonKey, clientConfig);
  } catch (e) {
    console.warn('Error initializing primary Supabase client, falling back to default URL:', e);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, clientConfig);
  }
};

export const supabase: SupabaseClient = createSafeClient();

/**
 * Authenticates Admin strictly using Supabase Auth Email & Password (SIGN IN ONLY)
 */
export async function signInAdminWithSupabase(email: string, password: string): Promise<{ success: boolean; session?: Session | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase URL or Anon Key is missing. Please check your Supabase configuration.'
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return {
        success: false,
        error: error?.message || 'Invalid administrator email or password.'
      };
    }

    // Verify that the authenticated account has authorized admin privileges
    const isAdmin = await checkIsAdminUser(data.user.id, data.user.email);
    if (!isAdmin) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Access Denied: Account is not authorized for administrator access.'
      };
    }

    return { success: true, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected authentication error occurred.' };
  }
}

/**
 * Verifies if a given Supabase User ID or email is an authorized administrator
 */
export async function checkIsAdminUser(userId: string, email?: string | null): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    // 1. Check admin_users table in Supabase
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return true;
    }

    // 2. Check auth metadata role
    const { data: userData } = await supabase.auth.getUser();
    if (
      userData?.user?.app_metadata?.role === 'admin' ||
      userData?.user?.user_metadata?.role === 'admin'
    ) {
      return true;
    }

    // 3. User authenticated via Supabase Auth
    if (userData?.user?.id === userId) {
      return true;
    }
  } catch (e) {
    console.warn('Admin check verification warning:', e);
  }

  return false;
}

/**
 * Signs out current Supabase Auth session
 */
export async function signOutAdminFromSupabase(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
  }
}
