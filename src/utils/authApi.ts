type AuthUser = {
  id: number;
  username: string;
  email: string;
};

type AuthResponse = {
  user: AuthUser;
};

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | undefined>;
};

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = (import.meta as ImportMetaWithEnv).env?.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const rawText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let body: Record<string, unknown> = {};

    if (rawText) {
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        body = { message: rawText };
      }
    }

    if (!response.ok) {
      const message = typeof body?.message === 'string' ? body.message : `Request failed (${response.status})`;
      const apiError = new ApiError(message, response.status, { url, body });
      console.error(`[authApi] ${options.method || 'GET'} ${url} failed`, apiError);
      throw apiError;
    }

    const isLikelyJson = contentType.includes('application/json');
    if (!isLikelyJson) {
      const preview = rawText.slice(0, 120);
      const apiError = new ApiError(
        'Auth-Endpoint hat keine JSON-Antwort geliefert. Prüfe, ob das Backend unter /api/auth/*.php erreichbar ist.',
        response.status,
        { url, contentType, preview },
      );
      console.error(`[authApi] ${options.method || 'GET'} ${url} returned non-JSON response`, apiError);
      throw apiError;
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error(`[authApi] Network error during ${options.method || 'GET'} ${url}`, error);
    throw new ApiError('Keine Verbindung zur API. Prüfe, ob /api/auth/*.php auf demselben Host erreichbar ist.', 0, error);
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthResponse>('/api/auth/login.php', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!data || typeof data !== 'object' || !('user' in data) || !data.user) {
    const error = new ApiError('Ungültige Server-Antwort beim Login.', 500, data);
    console.error('[authApi] Invalid login response payload', error);
    throw error;
  }

  return data.user;
}

export async function registerWithEmail(username: string, email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthResponse>('/api/auth/register.php', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });

  if (!data || typeof data !== 'object' || !('user' in data) || !data.user) {
    const error = new ApiError('Ungültige Server-Antwort bei der Registrierung.', 500, data);
    console.error('[authApi] Invalid register response payload', error);
    throw error;
  }

  return data.user;
}

export { ApiError };
export type { AuthUser };
