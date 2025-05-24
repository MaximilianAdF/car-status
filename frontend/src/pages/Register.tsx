// src/pages/Register.tsx
import React, { useState, useEffect } from 'react'; // Make sure useEffect is imported
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { Eye, EyeOff } from 'lucide-react'; // Import icons for password visibility toggle
import API_BASE_URL from '../config';

export default function Register() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth(); // Get user and authLoading

    // Form states (email, password, etc.)
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // For password visibility toggle
    const [confirmPassword, setConfirmPassword] = useState(''); // For password confirmation
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Form submission loading

    // Redirect if user is already logged in
    useEffect(() => {
        if (!authLoading && user) {
            navigate('/', { replace: true }); // Redirect to home or dashboard
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email, pass: password }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || 'Registration failed');
                setLoading(false);
                return;
            }

            setLoading(false);
            navigate('/login', { state: { message: "Registration successful! Please log in." } });


        } catch (err) {
            setError('An error occurred during registration.');
            setLoading(false);
        }
    };

    // Conditional Rendering for Register page
    if (authLoading || user) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-200">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 p-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Create Account</h1>
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4">
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="mb-4 flex flex-row justify-between gap-2">
                        <div className='flex flex-col'>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
                                First Name
                            </label>
                            <input
                                type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required disabled={loading}
                            />
                        </div>
                        <div className='flex flex-col'>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">
                                Last Name
                            </label>
                            <input
                                type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email" id="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required disabled={loading}
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
                    <div className="mb-4"> {/* Confirm Password input section */}
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10" // Added pr-10 for icon space
                            disabled={loading}
                            required
                        />
                    </div>
                
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="submit"
                            className={`w-full cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                            className="font-semibold text-blue-500 hover:text-blue-700"
                        >
                            Log In
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}