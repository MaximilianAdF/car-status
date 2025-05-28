import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import API_BASE_URL from '../config'; // Ensure this path is correct

type User = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
};

type AuthContextType = {
    user: User | null;
    setUser: (user: User | null) => void;
    accessToken: string | null;
    operationLoading: boolean; // For login, logout, etc.
    isInitialized: boolean;    // True after initial auth check
    login: (email: string, pass: string, rememberMe: boolean) => Promise<void>;
    logout: () => Promise<void>;
    register?: (userData: any) => Promise<void>;
    getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUserState] = useState<User | null>(null);
    const [accessToken, setAccessTokenState] = useState<string | null>(() => localStorage.getItem('accessToken'));
    const [operationLoading, setOperationLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const setUser = (userData: User | null) => {
        setUserState(userData);
    };
    
    const getAccessToken = useCallback(() => {
        return accessToken;
    }, [accessToken]);

    const clearAuthData = () => {
        localStorage.removeItem('accessToken');
        setAccessTokenState(null);
        setUserState(null);
    };

    const fetchUserDetails = useCallback(async (token: string) => {
        if (!token) return null;
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                if (response.status === 401) {
                    // Token is invalid/expired
                    console.warn('[AuthContext] fetchUserDetails: Token invalid or expired.');
                } else {
                    console.error(`[AuthContext] fetchUserDetails: Failed with status ${response.status}`);
                }
                // Do not throw here, let caller handle null user
                return null;
            }
            const data = await response.json();
            return data.user as User;
        } catch (error) {
            console.error("[AuthContext] Error fetching user details:", error);
            return null;
        }
    }, []);

    useEffect(() => {
        const attemptAutoLoginViaRefreshToken = async () => {
            console.log('[AuthContext] Attempting auto-login via refresh token...');
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
                    method: 'POST',
                    credentials: 'include',
                });

                if (!response.ok) {
                    console.log('[AuthContext] Refresh token invalid, expired, or not present.');
                    clearAuthData(); // Clear any potentially stale data
                    return;
                }

                const data = await response.json();
                if (data.accessToken) {
                    console.log('[AuthContext] New access token received from refresh.');
                    localStorage.setItem('accessToken', data.accessToken);
                    setAccessTokenState(data.accessToken);
                    const refreshedUser = await fetchUserDetails(data.accessToken);
                    setUserState(refreshedUser); // This might be null if fetchUserDetails fails
                    if (!refreshedUser) clearAuthData(); // If user details couldn't be fetched with new token
                } else {
                    clearAuthData();
                }
            } catch (error) {
                console.error('[AuthContext] Error during refresh token attempt:', error);
                clearAuthData();
            }
        };

        const initializeAuth = async () => {
            const currentToken = localStorage.getItem('accessToken');
            if (currentToken) {
                console.log('[AuthContext] Found access token in localStorage, validating...');
                setAccessTokenState(currentToken); // Set it for getAccessToken to use immediately
                const fetchedUser = await fetchUserDetails(currentToken);
                if (fetchedUser) {
                    setUserState(fetchedUser);
                } else {
                    // Token was stale or invalid, clear it and attempt refresh
                    clearAuthData(); // Clear invalid token before trying refresh
                    await attemptAutoLoginViaRefreshToken();
                }
            } else {
                // No access token in local storage, try to use HttpOnly refresh token
                await attemptAutoLoginViaRefreshToken();
            }
            setIsInitialized(true); // Mark initialization complete AFTER all checks
        };

        initializeAuth();
    }, [fetchUserDetails]); // fetchUserDetails is stable

    const login = useCallback(async (email: string, pass: string, rememberMe: boolean) => {
        setOperationLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pass, rememberMe }),
                credentials: 'include',
            });
            const data = await response.json(); // Try to parse JSON regardless of response.ok
            if (!response.ok) {
                throw new Error(data.error || `Login failed with status: ${response.status}`);
            }
            if (data.accessToken && data.user) {
                localStorage.setItem('accessToken', data.accessToken);
                setAccessTokenState(data.accessToken);
                setUserState(data.user);
            } else {
                throw new Error(data.error || 'Login response missing token or user data.');
            }
        } catch (error) {
            console.error("[AuthContext] Login function error:", error);
            clearAuthData(); // Ensure state is clean on login failure
            throw error;
        } finally {
            setOperationLoading(false);
        }
    }, [fetchUserDetails]); // navigate removed as direct navigation from context is less ideal

    const logout = useCallback(async () => {
        setOperationLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error("[AuthContext] Logout API call failed:", error);
        } finally {
            clearAuthData();
            setOperationLoading(false);
            // Navigation should be handled by UI reacting to user state change
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, accessToken, operationLoading, isInitialized, login, logout, getAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};