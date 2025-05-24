import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import API_BASE_URL from '../config'; // Adjust the import path as needed

export default function Login() {
    const navigate = useNavigate();
    const { user, setUser, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State for password visibility
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // State for "Remember Me" checkbox


    // Redirect if already logged in
    useEffect(() => {
        if (user && !authLoading) {
            navigate('/'); // Redirect to home if user is logged in
        }
    }, [user, authLoading, navigate]);

    // Effect to load remembered email from localStorage
    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true); // Check the box if email was remembered
        }
    }, []); // Empty dependency array means this runs once on mount

    const handleSubmit = async (e: React.FormEvent) => {
        console.log('[Login Attempt] Inside login function.');
        console.log('[Login Attempt] Raw import.meta.env.VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
        console.log('[Login Attempt] Imported API_BASE_URL from config.ts:', API_BASE_URL);

        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setError('');

        // Basic frontend validation (optional, but good practice)
        if (!email || !password) {
            setError('Email and password are required.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, long_token: rememberMe, pass: password }), // Extra long token life if remember me is checked
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle errors from the backend (e.g., invalid credentials, server error)
                setError(data?.error || `Error: ${response.status} - ${response.statusText}`);
                setLoading(false);
                return;
            }

            // Login was successful
            setError('');
            setSuccess(true);
            setLoading(false);



            // 2. Update auth context
            if (setUser && data?.user) { // Check if data and data.user exist
                setUser(data.user);
            } else {
                // If backend doesn't send back the full user object on login,
                // you might set a generic authenticated state or fetch user data separately.
                // For now, let's assume login implies some user data is available or can be set to a generic truthy value.
                // Or, if your `setUser` can handle `null` to clear and a user object to set:
                // If `data.user` is not present, but login is successful, you might need to fetch user details
                // or your `setUser` function might handle this scenario (e.g. by setting a generic logged-in state).
                // For this example, we'll assume `data.user` is expected on successful login.
                // If not, you might need to adjust this logic or what your API returns.
                console.warn("User data not found in login response, but login was successful. API response:", data);
                // setUser({ id: Date.now(), email: email, first_name: 'Logged In User', last_name: '' }); // Example placeholder if no user data from backend
            }

            // 3. Navigate to a protected route or dashboard
            setTimeout(() => {
                navigate('/'); // Navigate to /
            }, 1000); // 1-second delay to show success message

        } catch (err) {
            // Handle network errors or other unexpected issues
            console.error('Login failed:', err);
            setError('Login failed. Please try again later.');
            setLoading(false);
        }
    };

    if (authLoading || user) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-200">
                <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
            </div>
        ); // Or some other loading indicator, or null if redirect is fast
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-tr from-gray-100 to-gray-200 p-4 overflow-y-auto">
            <div className="w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-gray-800">Login</h1>
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4 border-1 border-black/10">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">Login successful! Redirecting...</span>
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="mb-4"> {/* Password input section */}
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                //placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10" // Added pr-10 for icon space
                                disabled={loading}
                                required
                            />
                            <button
                                type="button" // Prevent form submission
                                onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                        </div>
                    </div>
                    <div className="mb-6"> {/* Added Remember Me checkbox section */}
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 sm:h-5 sm:w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                                disabled={loading}
                            />
                            <span className="ml-2 text-gray-700 text-sm">Remember me</span>
                        </label>
                        {/* Optional: Add a "Forgot password?" link here on the right */}
                        {/* <a href="#" className="inline-block align-baseline float-right text-sm text-blue-500 hover:text-blue-800">
                            Forgot Password?
                        </a> */}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="submit"
                            className={`w-full cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/register');
                            }}
                            className="font-semibold text-blue-500 hover:text-blue-700"
                        >
                            Sign up
                        </a>
                    </p>
                </form>
                <p className="text-center text-gray-500 text-xs">
                    &copy;{new Date().getFullYear()} Maxi Cars. All rights reserved.
                </p>
            </div>
        </div>
    );
}
