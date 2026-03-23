/**
 * auth.ts – Authentifizierungs-Service
 * 
 * Kapselt Login/Register API-Calls und persistiert die Session
 * via localStorage (user_id + user-Objekt werden gespeichert).
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
    UserData,
    ProgressEntry,
} from './api';

const STORAGE_KEY = 'st-geoargen-user';

// ─── Session ──────────────────────────────────────────────────────────────────

/** Speichert den eingeloggten User in localStorage */
export function saveSession(user: UserData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/** Lädt den gespeicherten User aus localStorage (oder null) */
export function loadSession(): UserData | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as UserData;
    } catch {
        return null;
    }
}

/** Löscht die Session aus localStorage */
export function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
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
    saveSession(res.user);
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
    saveSession(res.user);
    return res.user;
}

/**
 * Loggt den User aus und löscht die Session.
 */
export function logoutUser(): void {
    clearSession();
}

/**
 * Prüft ob eine gespeicherte Session vorhanden ist und validiert den User
 * gegen die API. Gibt null zurück wenn keine Session oder User nicht mehr existiert.
 */
export async function restoreSession(): Promise<UserData | null> {
    const stored = loadSession();
    if (!stored) return null;

    try {
        const res = await apiGetUser(stored.id);
        saveSession(res.user); // aktualisierte Daten speichern
        return res.user;
    } catch {
        clearSession();
        return null;
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
): Promise<void> {
    await apiSaveProgress(userId, pathId, stationId);
}

/**
 * Setzt den kompletten Fortschritt eines Users in der Datenbank zurueck.
 */
export async function resetUserProgress(userId: number): Promise<void> {
    await apiResetProgress(userId);
}
