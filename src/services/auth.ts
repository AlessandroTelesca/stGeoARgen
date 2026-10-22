/**
 * auth.ts – Authentifizierungs-Service
 * 
 * Kapselt Login/Register API-Calls und persistiert die Session
 * via localStorage (user-Objekt + Session-Token werden gespeichert).
 * Der Server leitet die user_id ausschließlich aus dem Session-Token ab.
 */

import {
    apiLogin,
    apiRegister,
    apiGetUser,
    apiRequestPasswordReset,
    apiResetPassword,
    apiGetProgress,
    apiSaveProgress,
    apiResetProgress,
    apiDeleteAccount,
    apiLogout,
    getAuthToken,
    setAuthToken,
    ApiError,
    UserData,
    ProgressEntry,
} from './api';

const STORAGE_KEY = 'st-geoargen-user';

// ─── Session ──────────────────────────────────────────────────────────────────

/** Speichert den eingeloggten User (und ggf. ein neues Session-Token) in localStorage */
export function saveSession(user: UserData, token?: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
        /* Speicher nicht verfügbar – Session gilt nur bis zum Reload */
    }
    if (token) setAuthToken(token);
}

/** Lädt den gespeicherten User aus localStorage (oder null, auch wenn kein Session-Token vorliegt) */
export function loadSession(): UserData | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw || !getAuthToken()) return null;
        const user = JSON.parse(raw) as UserData;
        return user && typeof user.id === 'number' ? user : null;
    } catch {
        return null;
    }
}

/** Löscht die Session (User + Token) aus localStorage */
export function clearSession(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignorieren */
    }
    setAuthToken(null);
}

/** Server hat keine Session erhalten (Token fehlt im Response) */
function requireToken(token: string | undefined): string {
    if (!token) {
        throw new Error('Anmeldung fehlgeschlagen: Server hat keine Sitzung erstellt.');
    }
    return token;
}

// ─── Auth-Aktionen ────────────────────────────────────────────────────────────

/**
 * Registriert einen neuen User und speichert die Session.
 * Wirft einen Error mit der Fehlermeldung wenn fehlgeschlagen.
 */
export async function registerUser(
    username: string,
    email: string,
    password: string
): Promise<UserData> {
    const res = await apiRegister(username, email, password);
    saveSession(res.user, requireToken(res.token));
    return res.user;
}

/**
 * Loggt einen User ein und speichert die Session.
 * Wirft einen Error mit der Fehlermeldung wenn fehlgeschlagen.
 */
export async function loginUser(
    email: string,
    password: string
): Promise<UserData> {
    const res = await apiLogin(email, password);
    saveSession(res.user, requireToken(res.token));
    return res.user;
}

/**
 * Loggt den User aus und löscht die Session (serverseitig best effort).
 */
export function logoutUser(): void {
    const token = getAuthToken();
    clearSession();
    if (token) void apiLogout(token);
}

/**
 * Prüft ob eine gespeicherte Session vorhanden ist und validiert den User
 * gegen die API. Gibt null zurück wenn keine Session oder User nicht mehr existiert.
 */
export async function restoreSession(): Promise<UserData | null> {
    const stored = loadSession();
    if (!stored) {
        // Alte Sessions ohne Token (vor Einführung der Session-Tokens) → neu anmelden
        clearSession();
        return null;
    }

    try {
        const res = await apiGetUser(stored.id);
        saveSession(res.user); // aktualisierte Daten speichern
        return res.user;
    } catch (error) {
        // Nur abmelden, wenn der Server die Session wirklich ablehnt. Bei Netzwerk- oder
        // Serverfehlern (offline, 5xx) bleibt man mit den gespeicherten Daten eingeloggt.
        const status = error instanceof ApiError ? error.status : undefined;
        if (status === 401 || status === 403 || status === 404) {
            clearSession();
            return null;
        }
        return stored;
    }
}

/**
 * Fordert ein Passwort-Reset an und liefert ggf. das Reset-Token zurueck.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
    const res = await apiRequestPasswordReset(email);
    return {
        message: res.message,
        resetToken: res.reset_token,
    };
}

/**
 * Setzt das Passwort mit einem gueltigen Reset-Token.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<string> {
    const res = await apiResetPassword(token, newPassword);
    return res.message;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Lädt den Fortschritt des Users aus der Datenbank.
 * Gibt eine Liste abgeschlossener Stationen zurück.
 */
export async function getUserProgress(userId: number): Promise<ProgressEntry[]> {
    const res = await apiGetProgress(userId);
    return res.progress;
}

/**
 * Speichert einen Stations-Abschluss in der Datenbank.
 */
export async function saveStationProgress(
    userId: number,
    pathId: string,
    stationId: number
): Promise<{ success: boolean; message: string; points_awarded?: number; total_points?: number }> {
    return apiSaveProgress(userId, pathId, stationId);
}

/**
 * Setzt den kompletten Fortschritt eines Users in der Datenbank zurueck.
 */
export async function resetUserProgress(userId: number): Promise<void> {
    await apiResetProgress(userId);
}

/**
 * Löscht das Konto serverseitig und meldet lokal ab.
 * Wirft bei falschem Passwort, damit die Oberfläche die Meldung anzeigen kann.
 */
export async function deleteAccount(password: string): Promise<void> {
    await apiDeleteAccount(password);
    clearSession();
}