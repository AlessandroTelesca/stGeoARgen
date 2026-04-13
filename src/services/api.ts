/**
 * api.ts – Zentraler API-Client
 * 
 * API-URL kann ueber VITE_API_BASE_URL konfiguriert werden.
 */
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultApiBaseUrl = isLocalHost ? '/api' : 'https://stgeoargen.iiius.de/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, '');

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

/**
 * Generische Fetch-Funktion für die API.
 * Wirft einen Error mit der Server-Fehlermeldung wenn success: false.
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;

    let response: Response;
    try {
        response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
    } catch {
        throw new Error(`API nicht erreichbar (${url}).`);
    }

    const contentType = response.headers.get('content-type') || '';

    let data: ApiResponse;
    try {
        data = (await response.json()) as ApiResponse;
    } catch {
        throw new Error(
            `Ungueltige API-Antwort (${url}) - HTTP ${response.status}, Content-Type: ${contentType || 'unbekannt'}.`
        );
    }

    if (!data.success) {
        throw new Error(data.message || `API-Fehler bei ${url}`);
    }

    return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserData {
    id: number;
    username: string;
    email: string;
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    user: UserData;
}

export interface PasswordResetRequestResponse {
    success: boolean;
    message: string;
    reset_token?: string;
}

export interface PasswordResetResponse {
    success: boolean;
    message: string;
}

export async function apiRegister(
    username: string,
    email: string,
    password: string
): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('register.php', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
}

export async function apiLogin(
    email: string,
    password: string
): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function apiGetUser(userId: number): Promise<AuthResponse> {
    return apiFetch<AuthResponse>(`get_user.php?user_id=${userId}`);
}

export async function apiRequestPasswordReset(
    email: string
): Promise<PasswordResetRequestResponse> {
    return apiFetch<PasswordResetRequestResponse>('request_password_reset.php', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function apiResetPassword(
    token: string,
    password: string
): Promise<PasswordResetResponse> {
    return apiFetch<PasswordResetResponse>('reset_password.php', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
    });
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface ProgressEntry {
    path_id: string;
    station_id: number;
    completed_at: string;
}

export interface ProgressResponse {
    success: boolean;
    progress: ProgressEntry[];
}

export async function apiGetProgress(userId: number): Promise<ProgressResponse> {
    return apiFetch<ProgressResponse>(`get_progress.php?user_id=${userId}`);
}

export async function apiSaveProgress(
    userId: number,
    pathId: string,
    stationId: number
): Promise<{ success: boolean; message: string }> {
    return apiFetch(`save_progress.php`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, path_id: pathId, station_id: stationId }),
    });
}

export async function apiResetProgress(
    userId: number
): Promise<{ success: boolean; message: string; deleted_rows: number }> {
    return apiFetch('reset_progress.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
    });
}

export interface PathBonusResponse {
    success: boolean;
    message: string;
    already_claimed: boolean;
    bonus?: number;
}

export interface TreasureRewardSaveResponse {
    success: boolean;
    message: string;
    already_claimed: boolean;
    points_awarded: number;
    points_total: number;
}

export interface TreasureRewardStatusResponse {
    success: boolean;
    claimed: boolean;
    points: number;
    reward_key: string;
}

/**
 * Speichert den Pfad-Abschluss-Bonus (500 Punkte) in der Datenbank.
 * Idempotent: Ein zweiter Aufruf liefert already_claimed: true.
 */
export async function apiSavePathBonus(
    userId: number,
    pathId: string,
    bonus: number = 500
): Promise<PathBonusResponse> {
    return apiFetch<PathBonusResponse>('save_path_bonus.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, path_id: pathId, bonus }),
    });
}

export async function apiSaveTreasureReward(
    userId: number,
    rewardKey: string = 'klosterweiher_treasure_chest',
    points: number = 50
): Promise<TreasureRewardSaveResponse> {
    return apiFetch<TreasureRewardSaveResponse>('save_treasure_reward.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reward_key: rewardKey, points }),
    });
}

export async function apiGetTreasureReward(
    userId: number,
    rewardKey: string = 'klosterweiher_treasure_chest'
): Promise<TreasureRewardStatusResponse> {
    return apiFetch<TreasureRewardStatusResponse>(
        `get_treasure_reward.php?user_id=${userId}&reward_key=${encodeURIComponent(rewardKey)}`,
    );
}
