import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_NEXT_PATH = '/(tabs)/cuenta';
const PASSWORD_RESET_PATH = '/(auth)/login?mode=reset';
type SocialProvider = 'google' | 'facebook' | 'apple';

function normalizeInternalPath(value: string | null | undefined, fallback = DEFAULT_NEXT_PATH) {
  const normalized = value?.trim();

  if (!normalized || !normalized.startsWith('/')) {
    return fallback;
  }

  if (normalized.startsWith('//')) {
    return fallback;
  }

  return normalized;
}

function appendQueryParams(baseUrl: string, entries: Record<string, string | undefined>) {
  try {
    const url = new URL(baseUrl);

    Object.entries(entries).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      url.searchParams.set(key, value);
    });

    return url.toString();
  } catch {
    const query = new URLSearchParams();

    Object.entries(entries).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      query.set(key, value);
    });

    const separator = baseUrl.includes('?') ? '&' : '?';
    const encoded = query.toString();
    return encoded ? `${baseUrl}${separator}${encoded}` : baseUrl;
  }
}

function collectUrlParams(urlValue: string) {
  const url = new URL(urlValue);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;

  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

export function buildAuthRedirectUrl(nextPath = DEFAULT_NEXT_PATH, mode?: 'reset') {
  const redirectBaseUrl = Linking.createURL('/auth/callback');

  return appendQueryParams(redirectBaseUrl, {
    next: normalizeInternalPath(nextPath, DEFAULT_NEXT_PATH),
    ...(mode === 'reset' ? { mode: 'reset' } : {}),
  });
}

export function getPasswordRecoveryRedirectUrl() {
  return buildAuthRedirectUrl(PASSWORD_RESET_PATH, 'reset');
}

export async function completeAuthRedirectUrl(urlValue: string) {
  const params = collectUrlParams(urlValue);
  const providerError = params.get('error_description') || params.get('error');
  const nextPath = normalizeInternalPath(params.get('next'), DEFAULT_NEXT_PATH);
  const mode = params.get('mode');
  const type = params.get('type');

  if (providerError) {
    return {
      error: providerError,
      nextPath,
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return {
        error: error.message,
        nextPath,
      };
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return {
        error: error.message,
        nextPath,
      };
    }
  } else {
    return {
      error: 'No se encontro un codigo o token valido en el retorno de autenticacion.',
      nextPath,
    };
  }

  return {
    error: null,
    nextPath: type === 'recovery' || mode === 'reset' ? PASSWORD_RESET_PATH : nextPath,
  };
}

export async function signInWithGoogleOnMobile(nextPath = DEFAULT_NEXT_PATH) {
  return signInWithSocialProviderOnMobile('google', nextPath);
}

export async function signInWithFacebookOnMobile(nextPath = DEFAULT_NEXT_PATH) {
  return signInWithSocialProviderOnMobile('facebook', nextPath);
}

export async function signInWithAppleOnMobile(nextPath = DEFAULT_NEXT_PATH) {
  return signInWithSocialProviderOnMobile('apple', nextPath);
}

function getSocialProviderLabel(provider: SocialProvider) {
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  return 'Facebook';
}

async function signInWithSocialProviderOnMobile(
  provider: SocialProvider,
  nextPath = DEFAULT_NEXT_PATH,
) {
  const redirectTo = buildAuthRedirectUrl(nextPath);
  const providerLabel = getSocialProviderLabel(provider);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === 'google'
        ? {
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          }
        : provider === 'facebook'
          ? {
              scopes: 'email,public_profile',
            }
          : {}),
    },
  });

  if (error) {
    return {
      error: error.message,
      nextPath,
    };
  }

  if (!data?.url) {
    return {
      error: `No se pudo iniciar la autenticacion con ${providerLabel}.`,
      nextPath,
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return {
      error:
        result.type === 'cancel' || result.type === 'dismiss'
          ? 'Autenticacion cancelada.'
          : `No se pudo completar la autenticacion con ${providerLabel}.`,
      nextPath,
    };
  }

  return completeAuthRedirectUrl(result.url);
}
