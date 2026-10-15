/**
 * api.ts – Zentraler API-Client
 * 
 * API-URL kann ueber VITE_API_BASE_URL konfiguriert werden.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://stgeoargen.iiius.de/api').replace(/\/+$/, '');

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
    const headers = new Headers(options.headers);
    // Bei FormData setzt der Browser Content-Type inkl. multipart-Boundary selbst
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
        response = await fetch(url, { ...options, headers });
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

export interface AvailableVoucher {
    id: number;
    code: string | null;
    description: string;
    partner_name?: string;
    address?: string;
    points_value: number;
    expiry_date?: string;
    quantity?: number;
}

export interface AvailableVouchersResponse {
    success: boolean;
    vouchers: AvailableVoucher[];
}

export interface RedeemVoucherResponse {
    success: boolean;
    message: string;
    code?: string;
}

export interface UserPointsResponse {
    success: boolean;
    total_points: number;
}

export interface UserVouchersResponse {
    success: boolean;
    redeemable_vouchers: AvailableVoucher[];
    redeemed_vouchers: AvailableVoucher[];
}

export interface PartnerVoucherValidateResponse {
    success: boolean;
    message: string;
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

export async function apiGetAvailableVouchers(): Promise<AvailableVouchersResponse> {
    return apiFetch<AvailableVouchersResponse>('get_available_vouchers.php');
}

export async function apiRedeemVoucherFromShop(
    userId: number,
    voucherId: number
): Promise<RedeemVoucherResponse> {
    return apiFetch<RedeemVoucherResponse>('redeem_voucher_from_shop.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, voucher_id: voucherId }),
    });
}

export async function apiGetUserVouchers(userId: number): Promise<UserVouchersResponse> {
    return apiFetch<UserVouchersResponse>(`get_user_vouchers.php?user_id=${userId}`);
}

export async function apiValidatePartnerVoucher(
    username: string,
    password: string,
    code: string
): Promise<PartnerVoucherValidateResponse> {
    return apiFetch<PartnerVoucherValidateResponse>('partner_voucher_validate.php', {
        method: 'POST',
        body: JSON.stringify({ username, password, code }),
    });
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

export async function apiGetUserPoints(userId: number): Promise<UserPointsResponse> {
    return apiFetch<UserPointsResponse>(`get_user_points.php?user_id=${userId}`);
}

// ─── Custom-Stationen (Stationsverwaltung) ──────────────────────────────────

/** Station, wie sie von get_custom_stations.php / admin_save_station.php geliefert wird. */
export interface CustomStation {
    id: number;
    path_id: string;
    title_de: string;
    title_en: string | null;
    description_de: string;
    description_en: string | null;
    long_description_de: string;
    long_description_en: string | null;
    /** Profilbild (Dateiname in api/uploads/stations/) – Listen und Titelbild */
    cover_image: string;
    /** Bildfolge, die beim Start der Station durchgeklickt wird */
    slides: CustomStationSlide[];
    points: number;
    latitude: number;
    longitude: number;
    quiz: {
        question_de: string;
        question_en: string | null;
        options_de: string[];
        options_en: string[] | null;
        correct_answer: number;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface CustomStationSlide {
    image: string;
    text_de: string;
    text_en: string | null;
}

/**
 * Daten zum Anlegen/Aktualisieren. Bildreferenzen sind vorhandene Dateinamen (werden behalten)
 * oder neue Dateien: `cover_image: 'new'` → `newCover`, `slides[i].image: 'new:N'` → `newSlideImages[N]`.
 */
export type CustomStationInput = Omit<CustomStation, 'id' | 'created_at' | 'updated_at'> & { id?: number };

export function customStationImageUrl(filename: string): string {
    return `${API_BASE_URL}/uploads/stations/${encodeURIComponent(filename)}`;
}

function adminHeaders(adminPassword: string): HeadersInit {
    return { Authorization: `Bearer ${adminPassword}` };
}

export async function apiGetCustomStations(): Promise<CustomStation[]> {
    const res = await apiFetch<{ stations: Partial<CustomStation>[] }>('get_custom_stations.php');
    // Serverdaten absichern: ein veralteter Server (z. B. noch ohne cover_image/slides)
    // darf die App nicht zum Absturz bringen.
    return (Array.isArray(res.stations) ? res.stations : []).map((s) => ({
        ...(s as CustomStation),
        cover_image: typeof s.cover_image === 'string' ? s.cover_image : '',
        slides: Array.isArray(s.slides) ? s.slides : [],
    }));
}

export async function apiAdminVerify(adminPassword: string): Promise<void> {
    await apiFetch('admin_verify.php', { method: 'POST', headers: adminHeaders(adminPassword) });
}

export async function apiAdminSaveStation(
    adminPassword: string,
    station: CustomStationInput,
    newCover: File | null,
    newSlideImages: File[]
): Promise<CustomStation> {
    const body = new FormData();
    body.append('station', JSON.stringify(station));
    if (newCover) body.append('cover', newCover, newCover.name);
    newSlideImages.forEach((file) => body.append('slide_images[]', file, file.name));
    const res = await apiFetch<{ station: CustomStation }>('admin_save_station.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body,
    });
    return res.station;
}

export async function apiAdminDeleteStation(adminPassword: string, id: number): Promise<void> {
    await apiFetch('admin_delete_station.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ id }),
    });
}
