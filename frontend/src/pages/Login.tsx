import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // This will now provide { user, login, operationLoading, isInitialized, ... }
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    // `authLoading` will now correspond to `operationLoading` from the updated AuthContext
    const { user, login, operationLoading: authLoading, isInitialized } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // This is the Login component's own submit button loading
    const [rememberMe, setRememberMe] = useState(false);
    const [messageFromRegister, setMessageFromRegister] = useState('');

    useEffect(() => {
        if (location.state?.message) {
            setMessageFromRegister(location.state.message);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);
    
    useEffect(() => {
        // Only navigate if user exists AND initial auth checks are done
        // AND no other auth operation is actively loading (authLoading refers to operationLoading)
        if (isInitialized && user && !authLoading) {
            // Check if there's a 'from' location to redirect to after login
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [user, authLoading, navigate, isInitialized, location.state]);

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); // Start form submission loading
        setError('');
        setMessageFromRegister('');

        if (!email || !password) {
            setError('Email and password are required.');
            setLoading(false); // End form submission loading
            return;
        }

        try {
            await login(email, password, rememberMe); // login from AuthContext will set operationLoading
            // On successful login, the useEffect for user navigation will handle redirection.
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
        } catch (err) {
            console.error("Login page caught error:", err); // More specific console log
            setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false); // End form submission loading
        }
    };

    // This loader uses `authLoading` (which is `operationLoading` from context)
    // It will show when the `login` function in AuthContext is processing.
    // Since Login component is no longer unmounted by App.tsx, its state will be preserved.
    if (authLoading && !user && isInitialized) { 
        // Show loader if an operation is in progress, we don't have a user yet,
        // and the app is initialized (to avoid this loader flashing before App's main loader is done)
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" /* ... */ ></svg>
                <p>Loading session...</p>
            </div>
        );
    }
    // If !isInitialized, App.tsx shows "Loading Application...". We don't want to show another loader here.
    // So, ensure Login page only renders its main content or its own "Loading session..." if app is initialized.
    // App.tsx structure ensures Login page isn't even rendered if !isInitialized.

    return (
        // ... Your existing JSX for the login form ...
        // The `disabled={loading}` on inputs/button refers to the Login component's own `loading` state.
        // The button text `loading ? 'Logging in...' : 'Login'` also uses this local `loading` state.
        // This is good as it provides immediate feedback on the submit button.
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-tr from-gray-100 to-gray-200 p-4 overflow-y-auto">
            <div className="w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-gray-800">Login</h1>
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4 border-1 border-black/10">
                    {messageFromRegister && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{messageFromRegister}</span>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                        <input type="email" id="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                            className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading} required/>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={e => setPassword(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                                disabled={loading} required/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label={showPassword ? "Hide password" : "Show password"}>
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="inline-flex items-center">
                            <input type="checkbox" className="form-checkbox h-4 w-4 sm:h-5 sm:w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={loading}/>
                            <span className="ml-2 text-gray-700 text-sm">Remember me</span>
                        </label>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <button type="submit"
                            className={`w-full cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline ${loading || authLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading || authLoading }> {/* Consider disabling if auth context is also busy */}
                            {(loading || authLoading) ? ( // Show spinner if local form loading OR context operation loading
                                 <svg className="animate-spin h-5 w-5 mr-3 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                 </svg>
                            ) : null}
                            {(loading || authLoading) ? 'Processing...' : 'Login'}
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }} className="font-semibold text-blue-500 hover:text-blue-700">Sign up</a>
                    </p>
                </form>
                <p className="text-center text-gray-500 text-xs">&copy;{new Date().getFullYear()} Maxi Cars. All rights reserved.</p>
            </div>
        </div>
    );
}