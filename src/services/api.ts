/**
 * api.ts – Zentraler API-Client
 * 
 * API-URL kann ueber VITE_API_BASE_URL konfiguriert werden.
 */
import type { QuizQuestion, StationModule } from '../stationModules/types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://stgeoargen.iiius.de/api').replace(/\/+$/, '');

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

/**
 * Fehler eines API-Aufrufs. `status` ist der HTTP-Status der Antwort;
 * undefined, wenn der Server gar nicht erreichbar war (offline, CORS, DNS).
 */
export class ApiError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// ─── Session-Token ───────────────────────────────────────────────────────────
// login.php/register.php liefern ein Session-Token. Nutzerbezogene Endpunkte leiten die
// user_id serverseitig daraus ab ("Authorization: Bearer <token>").

const AUTH_TOKEN_KEY = 'st-geoargen-session-token';

/** Wird ausgelöst, wenn der Server das Session-Token ablehnt (abgelaufen/ungültig). */
export const AUTH_EXPIRED_EVENT = 'st-geoargen-auth-expired';

export function getAuthToken(): string | null {
    try {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setAuthToken(token: string | null): void {
    try {
        if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
        /* Speicher nicht verfügbar (z. B. privater Modus) */
    }
}

interface ApiFetchConfig {
    /** Session-Token mitsenden (nutzerbezogene Endpunkte) */
    auth?: boolean;
}

/**
 * Generische Fetch-Funktion für die API.
 * Wirft einen ApiError mit der Server-Fehlermeldung wenn success: false.
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    config: ApiFetchConfig = {}
): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = new Headers(options.headers);
    // Bei FormData setzt der Browser Content-Type inkl. multipart-Boundary selbst
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (config.auth) {
        const token = getAuthToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch {
        throw new ApiError(`API nicht erreichbar (${url}).`);
    }

    const contentType = response.headers.get('content-type') || '';

    let data: ApiResponse;
    try {
        data = (await response.json()) as ApiResponse;
    } catch {
        throw new ApiError(
            `Ungueltige API-Antwort (${url}) - HTTP ${response.status}, Content-Type: ${contentType || 'unbekannt'}.`,
            response.status
        );
    }

    if (!data.success) {
        if (config.auth && response.status === 401 && typeof window !== 'undefined') {
            window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }
        throw new ApiError(data.message || `API-Fehler bei ${url}`, response.status);
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
    /** Session-Token (nur login.php/register.php) */
    token?: string;
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
    /** Abgelaufene, nicht eingelöste Gutscheine (optional: ältere Backends liefern das Feld nicht) */
    expired_vouchers?: AvailableVoucher[];
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

/** Beendet die Session serverseitig (Fehler werden ignoriert – lokal wird ohnehin abgemeldet). */
export async function apiLogout(token: string): Promise<void> {
    try {
        await apiFetch('logout.php', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
        /* egal – Token wird lokal verworfen */
    }
}

export async function apiGetUser(userId: number): Promise<AuthResponse> {
    return apiFetch<AuthResponse>(`get_user.php?user_id=${userId}`, {}, { auth: true });
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
    }, { auth: true });
}

export async function apiGetUserVouchers(userId: number): Promise<UserVouchersResponse> {
    return apiFetch<UserVouchersResponse>(`get_user_vouchers.php?user_id=${userId}`, {}, { auth: true });
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
    return apiFetch<ProgressResponse>(`get_progress.php?user_id=${userId}`, {}, { auth: true });
}

export async function apiSaveProgress(
    userId: number,
    pathId: string,
    stationId: number
): Promise<{ success: boolean; message: string }> {
    return apiFetch(`save_progress.php`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, path_id: pathId, station_id: stationId }),
    }, { auth: true });
}

/** Löscht das eigene Konto inkl. aller Daten (Passwort zur Bestätigung). */
export async function apiDeleteAccount(password: string): Promise<{ success: boolean; message: string }> {
    return apiFetch('delete_account.php', {
        method: 'POST',
        body: JSON.stringify({ password }),
    }, { auth: true });
}

export async function apiResetProgress(
    userId: number
): Promise<{ success: boolean; message: string; deleted_rows: number }> {
    return apiFetch('reset_progress.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
    }, { auth: true });
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
 * Speichert den Pfad-Abschluss in der Datenbank (vergibt serverseitig keinen Bonus).
 * Idempotent: Ein zweiter Aufruf liefert already_claimed: true.
 */
export async function apiSavePathBonus(
    userId: number,
    pathId: string
): Promise<PathBonusResponse> {
    return apiFetch<PathBonusResponse>('save_path_bonus.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, path_id: pathId }),
    }, { auth: true });
}

/** Punkte vergibt der Server laut reward_definitions. */
export async function apiSaveTreasureReward(
    userId: number,
    rewardKey: string = TREASURE_REWARD_KEY
): Promise<TreasureRewardSaveResponse> {
    return apiFetch<TreasureRewardSaveResponse>('save_treasure_reward.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reward_key: rewardKey }),
    }, { auth: true });
}

export async function apiGetTreasureReward(
    userId: number,
    rewardKey: string = TREASURE_REWARD_KEY
): Promise<TreasureRewardStatusResponse> {
    return apiFetch<TreasureRewardStatusResponse>(
        `get_treasure_reward.php?user_id=${userId}&reward_key=${encodeURIComponent(rewardKey)}`,
        {},
        { auth: true },
    );
}

export async function apiGetUserPoints(userId: number): Promise<UserPointsResponse> {
    return apiFetch<UserPointsResponse>(`get_user_points.php?user_id=${userId}`, {}, { auth: true });
}

// ─── Punkte-Konfiguration ────────────────────────────────────────────────────

export const TREASURE_REWARD_KEY = 'klosterweiher_treasure_chest';

/** Alle Punktwerte aus der DB (get_point_config.php). */
export interface PointConfig {
    /** Fest eingebaute Stationen (Custom-Stationen liefern ihre Punkte selbst) */
    stations: { station_id: number; path_id: string; points: number }[];
    /** reward_key → Punkte */
    rewards: Record<string, number>;
    /** In Anzeigereihenfolge. threshold_points null = Regel im Frontend (z. B. Pfad komplett) */
    achievements: { key: string; threshold_points: number | null; badge_points: number }[];
    settings: { level_size: number; default_station_points: number };
}

export async function apiGetPointConfig(): Promise<PointConfig> {
    const { stations, rewards, achievements, settings } = await apiFetch<PointConfig & { success: boolean }>('get_point_config.php');
    return { stations, rewards, achievements, settings };
}

// ─── Custom-Stationen (Stationsverwaltung) ──────────────────────────────────

/**
 * Station, wie sie von get_custom_stations.php / admin_get_content.php / admin_save_station.php
 * geliefert wird. Der Inhalt steckt in `modules` (siehe src/stationModules/types.ts).
 */
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
    /** Ablauf der Station, wird beim Start der Reihe nach abgespielt */
    modules: StationModule[];
    points: number;
    latitude: number;
    longitude: number;
    /** false = Entwurf, nur in der Stationsverwaltung sichtbar */
    published: boolean;
    /** Position innerhalb des Pfads (aufsteigend) */
    sort_order: number;
    created_at: string;
    updated_at: string;
}

/**
 * Daten zum Anlegen/Aktualisieren. Bildreferenzen sind vorhandene Dateinamen (werden behalten)
 * oder neue Dateien: `cover_image: 'new'` → `newCover`, in `modules` jedes `'new:N'` → `files[N]`.
 */
export type CustomStationInput = Omit<CustomStation, 'id' | 'sort_order' | 'created_at' | 'updated_at'> & { id?: number };

/** Felder älterer Stationen (vor den Modulen), aus denen `modules` abgeleitet wird */
interface LegacyQuiz {
    question_de: string;
    question_en: string | null;
    options_de: string[];
    options_en: string[] | null;
    correct_answer: number;
    image?: string | null;
}
interface LegacyStationFields {
    station_type?: 'image_sequence' | 'panorama_quiz';
    slides?: { image: string; text_de: string; text_en: string | null }[];
    panorama_image?: string | null;
    live_camera?: boolean;
    quiz_questions?: LegacyQuiz[];
    quiz?: LegacyQuiz | null;
}

function legacyQuestion(q: LegacyQuiz): QuizQuestion {
    return {
        question_de: q.question_de,
        question_en: q.question_en ?? null,
        options_de: q.options_de,
        options_en: q.options_en ?? null,
        correct_answer: q.correct_answer,
        image: q.image ?? null,
        explanation_de: null,
        explanation_en: null,
    };
}

/** Stationen von vor den Modulen: Bildfolge (+ Quiz) bzw. 360°-Quiz als Module darstellen */
function legacyModules(s: LegacyStationFields): StationModule[] {
    const slides = Array.isArray(s.slides) ? s.slides : [];
    const noTitle = { title_de: null, title_en: null };
    if (s.station_type === 'panorama_quiz') {
        return [{
            id: 'legacy-0',
            ...noTitle,
            type: 'ar_panorama',
            background: s.live_camera ? 'camera' : 'panorama',
            panorama_image: s.panorama_image ?? null,
            slides,
            questions: (s.quiz_questions ?? []).map(legacyQuestion),
        }];
    }
    const modules: StationModule[] = [];
    if (slides.length > 0) modules.push({ id: 'legacy-0', ...noTitle, type: 'slideshow', slides });
    if (s.quiz) modules.push({ id: 'legacy-1', ...noTitle, type: 'quiz', questions: [legacyQuestion(s.quiz)] });
    return modules;
}

/** Serverdaten absichern: ein veralteter Server (ohne modules/published) darf die App nicht zum Absturz bringen. */
function normalizeStation(s: Partial<CustomStation> & LegacyStationFields): CustomStation {
    return {
        ...(s as CustomStation),
        cover_image: typeof s.cover_image === 'string' ? s.cover_image : '',
        modules: Array.isArray(s.modules) ? s.modules : legacyModules(s),
        published: s.published !== false,
        sort_order: typeof s.sort_order === 'number' ? s.sort_order : 0,
    };
}

/** Bild bzw. Audio über station_image.php (setzt CORS-Header; nginx liefert uploads/ ohne sie aus). */
export function customStationImageUrl(filename: string): string {
    return `${API_BASE_URL}/station_image.php?file=${encodeURIComponent(filename)}`;
}

function adminHeaders(adminPassword: string): HeadersInit {
    return { Authorization: `Bearer ${adminPassword}` };
}

/** Öffentliche Stationen (ohne Entwürfe und ohne Stationen in Entwurfs-Pfaden) */
export async function apiGetCustomStations(): Promise<CustomStation[]> {
    const res = await apiFetch<{ stations: (Partial<CustomStation> & LegacyStationFields)[] }>('get_custom_stations.php');
    return (Array.isArray(res.stations) ? res.stations : []).map(normalizeStation);
}

export async function apiAdminVerify(adminPassword: string): Promise<void> {
    await apiFetch('admin_verify.php', { method: 'POST', headers: adminHeaders(adminPassword) });
}

/** Alle Pfade und Stationen inklusive Entwürfen (nur Admin) */
export async function apiAdminGetContent(adminPassword: string): Promise<{ paths: CustomPath[]; stations: CustomStation[] }> {
    const res = await apiFetch<{ paths: Partial<CustomPath>[]; stations: (Partial<CustomStation> & LegacyStationFields)[] }>(
        'admin_get_content.php',
        { method: 'POST', headers: adminHeaders(adminPassword) }
    );
    return {
        paths: (Array.isArray(res.paths) ? res.paths : []).map(normalizePath),
        stations: (Array.isArray(res.stations) ? res.stations : []).map(normalizeStation),
    };
}

export async function apiAdminSaveStation(
    adminPassword: string,
    station: CustomStationInput,
    newCover: File | null,
    files: File[]
): Promise<CustomStation> {
    const body = new FormData();
    body.append('station', JSON.stringify(station));
    if (newCover) body.append('cover', newCover, newCover.name);
    files.forEach((file) => body.append('files[]', file, file.name));
    const res = await apiFetch<{ station: Partial<CustomStation> & LegacyStationFields }>('admin_save_station.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body,
    });
    return normalizeStation(res.station);
}

export async function apiAdminDeleteStation(adminPassword: string, id: number): Promise<void> {
    await apiFetch('admin_delete_station.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ id }),
    });
}

/** Neue Reihenfolge: `ids` in gewünschter Reihenfolge (Stationen eines Pfads bzw. alle Custom-Pfade) */
export async function apiAdminReorder(adminPassword: string, kind: 'paths' | 'stations', ids: (string | number)[]): Promise<void> {
    await apiFetch('admin_reorder.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ kind, ids }),
    });
}

/** Pfad oder Station veröffentlichen bzw. zum Entwurf machen */
export async function apiAdminSetPublished(adminPassword: string, kind: 'path' | 'station', id: string | number, published: boolean): Promise<void> {
    await apiFetch('admin_set_published.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ kind, id, published }),
    });
}

// ─── Custom-Pfade (Stationsverwaltung) ──────────────────────────────────────

/** ID des fest eingebauten AR-Pfads – nicht über die Stationsverwaltung änderbar */
export const AR_PATH_ID = 'tourist';

export type PathDifficulty = 'Einfach' | 'Mittel' | 'Schwer';

/** Themenpfad, wie er von get_custom_paths.php / admin_save_path.php geliefert wird. */
export interface CustomPath {
    /** Aus dem Namen erzeugt, ändert sich nach dem Anlegen nie */
    id: string;
    title_de: string;
    title_en: string | null;
    description_de: string;
    description_en: string | null;
    difficulty: PathDifficulty;
    estimated_time: string;
    /** Optionales Pfadbild (Dateiname in api/uploads/stations/) */
    cover_image: string | null;
    /** false = Entwurf: Pfad und seine Stationen sind nur in der Stationsverwaltung sichtbar */
    published: boolean;
    /** Position in der Pfadliste (aufsteigend) */
    sort_order: number;
    created_at: string;
    updated_at: string;
}

/** Ohne `id` wird ein Pfad angelegt. `cover_image: 'new'` → `newCover`, `null` → kein Bild. */
export type CustomPathInput = Omit<CustomPath, 'id' | 'sort_order' | 'created_at' | 'updated_at'> & { id?: string };

function normalizePath(p: Partial<CustomPath>): CustomPath {
    return {
        ...(p as CustomPath),
        published: p.published !== false,
        sort_order: typeof p.sort_order === 'number' ? p.sort_order : 0,
    };
}

export async function apiGetCustomPaths(): Promise<CustomPath[]> {
    const res = await apiFetch<{ paths: Partial<CustomPath>[] }>('get_custom_paths.php');
    return (Array.isArray(res.paths) ? res.paths : []).map(normalizePath);
}

export async function apiAdminSavePath(adminPassword: string, path: CustomPathInput, newCover: File | null): Promise<CustomPath> {
    const body = new FormData();
    body.append('path', JSON.stringify(path));
    if (newCover) body.append('cover', newCover, newCover.name);
    const res = await apiFetch<{ path: Partial<CustomPath> }>('admin_save_path.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body,
    });
    return normalizePath(res.path);
}

export async function apiAdminDeletePath(adminPassword: string, id: string): Promise<void> {
    await apiFetch('admin_delete_path.php', {
        method: 'POST',
        headers: adminHeaders(adminPassword),
        body: JSON.stringify({ id }),
    });
}
