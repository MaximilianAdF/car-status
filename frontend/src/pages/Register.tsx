import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import API_BASE_URL from '../config';

export default function Register() {
    const navigate = useNavigate();
    const { user, operationLoading: authLoading } = useAuth(); // Assuming setUser might be used or login function from context
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Renamed from addCarLoading to formLoading or just loading

    useEffect(() => {
        if (user && !authLoading) {
            navigate('/', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    first_name: firstName, 
                    last_name: lastName, 
                    email, 
                    pass: password,
                    // rememberMe: true // Optional: auto-login after register by setting rememberMe true
                                    // This depends on backend register returning tokens
                }),
                // credentials: 'include' // Important if backend register sets HttpOnly refresh token cookie
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || 'Registration failed. Please try again.');
                setLoading(false);
                return;
            }
            
            // Option 1: Navigate to login with a success message
            setLoading(false);
            navigate('/login', { state: { message: "Registration successful! Please log in." } });

            // Option 2: If backend register returns accessToken and user, log them in directly
            // if (data.accessToken && data.user && setUser) {
            //     localStorage.setItem('accessToken', data.accessToken); // Or use context to store token
            //     setUser(data.user);
            //     navigate('/', { replace: true });
            // } else {
            //     // Fallback if tokens are not returned
            //     navigate('/login', { state: { message: "Registration successful! Please log in." } });
            // }

        } catch (err) {
            console.error("Registration submit error:", err);
            setError('An error occurred during registration. Please try again later.');
            setLoading(false);
        }
    };

    if (authLoading && !user) {
        return <div className="flex justify-center items-center min-h-screen bg-gray-100"><p>Loading...</p></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Create Account</h1>
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4">
                    {error && <p className="text-red-500 text-center text-sm mb-4 bg-red-100 p-2 rounded">{error}</p>}
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">First Name</label>
                            <input type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required disabled={loading}/>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">Last Name</label>
                            <input type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required disabled={loading}/>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required disabled={loading}/>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={e => setPassword(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                required disabled={loading}/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">Confirm Password</label>
                        <input type={showPassword ? 'text' : 'password'} id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            required disabled={loading}/>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <button type="submit"
                            className={`w-full cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={loading}>
                            {loading && <svg className="animate-spin h-5 w-5 mr-3 text-white inline" /* SVG Spinner */><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                            {loading ? 'Registering...' : 'Create Account'}
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }} className="font-semibold text-blue-500 hover:text-blue-700">Log In</a>
                    </p>
                </form>
            </div>
        </div>
    );
}