// context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import API_BASE_URL from '../config';

type User = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
};

type AuthContextType = {
    user: User | null;
    setUser: (u: User | null) => void;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/session`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            setUser(data?.user ?? null);
            setLoading(false);
        })
        .catch((err) => {
            console.error('Error fetching auth session:', err);
            setUser(null); // Set user to null if there's an error
        })
        .finally(() => { setLoading(false); });
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
