/**
 * useAuth.ts – React Hook für Auth-State
 * 
 * Verwaltet den eingeloggten User, stellt Login/Register/Logout-Funktionen
 * bereit und stellt beim App-Start die Session wieder her.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserData } from '../services/api';
import {
    loginUser,
    registerUser,
    logoutUser,
    restoreSession,
} from '../services/auth';

interface UseAuthReturn {
    /** Eingeloggter User oder null wenn nicht eingeloggt */
    user: UserData | null;
    /** True während einer async Auth-Operation */
    isLoading: boolean;
    /** True solange die initiale Session-Wiederherstellung läuft */
    isInitializing: boolean;
    /** Login-Funktion */
    login: (email: string, password: string) => Promise<void>;
    /** Register-Funktion */
    register: (username: string, email: string, password: string) => Promise<void>;
    /** Logout-Funktion */
    logout: () => void;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // Beim ersten Render: gespeicherte Session wiederherstellen
    useEffect(() => {
        let cancelled = false;

        restoreSession()
            .then((restoredUser) => {
                if (!cancelled) {
                    setUser(restoredUser);
                }
            })
            .catch(() => {
                // Fehler beim Wiederherstellen → kein User
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setIsInitializing(false);
            });

        return () => { cancelled = true; };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const loggedInUser = await loginUser(email, password);
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(
        async (username: string, email: string, password: string) => {
            setIsLoading(true);
            try {
                const newUser = await registerUser(username, email, password);
                setUser(newUser);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const logout = useCallback(() => {
        logoutUser();
        setUser(null);
    }, []);

    return { user, isLoading, isInitializing, login, register, logout };
}
