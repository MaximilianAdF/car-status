import React, { useEffect, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';

const ACCESS_LEVEL_OPTIONS = [
    { value: 'owner', label: 'Owner' },
    { value: 'driver', label: 'Driver' },
    { value: 'guest', label: 'Guest' },
    { value: 'practice driver', label: 'Practice Driver' },
];

const PREDEFINED_PARKING_LOCATIONS = [
    { id: 'p1', name: 'Mälaren' },
    { id: 'p2', name: 'Kungsholmstorg - Systembolaget Sidan'},
    { id: 'p3', name: 'Kungsholmstorg - Ica Sidan'},
    { id: 'p4', name: 'Garvargatan'},
    { id: 'p5', name: 'Garvargatan - Lastplats'}
];


type Status = 'active' | 'maintenance' | 'inactive';
type Car = { 
    registration: string; 
    status: Status; 
    make: string;
    model: string;
    year: number;
    valuation: string;
    access_level: typeof ACCESS_LEVEL_OPTIONS[number]['value']; 
    logo_url: string;
}


export default function Home() {
    const { user, operationLoading: authLoading, getAccessToken, logout: authLogout } = useAuth();
    const [cars, setCars] = useState<Car[] | null>(null);
    const [selectedCarRegistration, setSelectedCarRegistration] = useState<string | null>(null);

    const [plateValue, setPlateValue] = useState('');
    const [accessLevel, setAccessLevel] = useState<string>(ACCESS_LEVEL_OPTIONS[0].value);
    const [addCarError, setAddCarError] = useState('');
    const [addCarLoading, setAddCarLoading] = useState(false);
    const [addCarSuccess, setAddCarSuccess] = useState(false);
    const [isAddCarPanelVisible, setIsAddCarPanelVisible] = useState(false);

    const [garageLoading, setGarageLoading] = useState(true);

    const [startKm, setStartKm] = useState('');
    const [endKm, setEndKm] = useState('');
    const [tripNotes, setTripNotes] = useState('');
    const [selectedParkingType, setSelectedParkingType] = useState<'predefined' | 'custom'>(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
    const [predefinedParkingLocation, setPredefinedParkingLocation] = useState<string>(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
    const [customParkingLocation, setCustomParkingLocation] = useState('');
    const [logTripError, setLogTripError] = useState('');
    const [logTripLoading, setLogTripLoading] = useState(false);
    const [logTripSuccess, setLogTripSuccess] = useState(false);

    const navigate = useNavigate();

    const makeAuthenticatedRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const token = getAccessToken();
        if (!token) {
            // Handle case where token is not available (e.g., redirect to login)
            console.error("No access token available for authenticated request.");
            authLogout(); // Or navigate('/login');
            throw new Error("User not authenticated");
        }

        const defaultHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            // credentials: 'include' // Only needed if you expect cookies to be sent TO this API from frontend,
                                     // or if the API sets HttpOnly cookies you want the browser to store for THIS origin.
                                     // For JWT in header, 'credentials' is not for sending the JWT itself.
                                     // It might be relevant if some other cookie-based mechanism is also in play.
                                     // For sending HttpOnly refresh token cookie TO /api/auth/refresh-token, it's important.
                                     // For general Bearer token auth, it's often 'omit' or not set.
                                     // Let's keep it 'include' for now if refresh token handling via cookies will use it.
            credentials: 'include', 
        };
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            // Potential token expiry, try to refresh or logout
            console.warn("Received 401, attempting token refresh or logout.");
            // Here you would ideally call a context function to refresh the token.
            // For now, just log out.
            authLogout();
            throw new Error("Unauthorized or token expired");
        }
        return response;
    }, [getAccessToken, authLogout, navigate]);


    const fetchCars = useCallback(async () => {
        if (!user?.id) { setCars(null); setGarageLoading(false); return; }
        setGarageLoading(true);
        try {
            // const response = await fetch(`${API_BASE_URL}/api/cars`, { // Original POST
            // Changed to GET for fetching cars as it's more conventional if no body is truly needed
            // and backend route router.get('/cars', verifyToken, ...)
            const response = await makeAuthenticatedRequest(`/api/cars`, { method: 'GET' });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Failed to fetch cars - ${response.statusText}` }));
                throw new Error(errorData.error || `Failed to fetch cars`);
            }
            const data = await response.json();
            setCars(
                {
                    ...data,
                    logo_url: '../../public/images/car-logos/optimized/' + data.make.toLowerCase() + '.png'
                }
            );
            console.log('Fetched cars:', cars);
        } catch (err) {
            console.error('Error fetching cars:', err);
            setCars([]);
        } finally {
            setGarageLoading(false);
        }
    }, [user, makeAuthenticatedRequest]); // makeAuthenticatedRequest added

    useEffect(() => {
        if (user?.id) {
            fetchCars();
        } else {
            setCars(null);
            setSelectedCarRegistration(null);
            setGarageLoading(false);
        }
    }, [user, fetchCars]); // fetchCars added as dependency

    useEffect(() => {
        if (!garageLoading && cars && cars.length > 0) {
            if (selectedCarRegistration === null || !cars.find(c => c.registration === selectedCarRegistration)) {
                setSelectedCarRegistration(cars[0].registration);
            }
        } else if (!garageLoading && (!cars || cars.length === 0)) {
            setSelectedCarRegistration(null);
        }
    }, [cars, garageLoading]);
    
    useEffect(() => { // Reset trip form when selected car changes
        setStartKm(''); setEndKm(''); setTripNotes('');
        setSelectedParkingType(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
        setPredefinedParkingLocation(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
        setCustomParkingLocation('');
        setLogTripError(''); setLogTripSuccess(false);
    }, [selectedCarRegistration]);

    const handleCarSelect = (registration: string) => {
        setSelectedCarRegistration(prev => prev === registration ? null : registration);
    };
    
    const handleAddCar = async () => {
        setAddCarError(''); setAddCarSuccess(false);
        if (plateValue.length < 6) { setAddCarError('Registration must be at least 6 characters.'); return; }
        if (!accessLevel) { setAddCarError('Please select an access level.'); return; }
        setAddCarLoading(true);
        try {
            if (!user || !user.id) { setAddCarError('User not authenticated.'); return; }
            const response = await makeAuthenticatedRequest(`/api/add-car`, {
                method: 'POST',
                body: JSON.stringify({ registration: plateValue.replace(/\s+/g, '').toUpperCase(), access_level: accessLevel }),
            });
            const data = await response.json();
            if (!response.ok) { setAddCarError(data.error || 'Failed to add car.'); }
            else {
                setAddCarSuccess(true); setPlateValue(''); setAccessLevel(ACCESS_LEVEL_OPTIONS[0].value);
                await fetchCars();
            }
        } catch (err) { console.error('handleAddCar error:', err); setAddCarError('An unexpected error occurred.'); }
        finally { setAddCarLoading(false); }
    };

    const handleRemoveCar = async (registration: string) => {
        setAddCarError(''); setAddCarSuccess(false);
        try {
            if (!user || !user.id) { setAddCarError('User not authenticated.'); return; }
            const response = await makeAuthenticatedRequest(`/api/remove-car/${registration}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: "Unknown error"}));
                throw new Error(errorData.error || `Failed to remove car: ${response.statusText}`);
            }
            await fetchCars();
            if (selectedCarRegistration === registration) setSelectedCarRegistration(null);
        } catch (err) { console.error('Error removing car:', err); setAddCarError(err instanceof Error ? err.message : "Could not remove car."); }
    };

    const handleLogTrip = async () => {
        setLogTripError(''); setLogTripSuccess(false);
        if (!selectedCarRegistration) { setLogTripError('Please select a car.'); return; }
        if (!startKm || !endKm) { setLogTripError('Start and End KM are required.'); return; }
        const startMileage = parseInt(startKm, 10); const endMileage = parseInt(endKm, 10);
        if (isNaN(startMileage) || isNaN(endMileage) || endMileage < startMileage) { setLogTripError('End KM must be valid and >= Start KM.'); return; }
        let finalParkedLocation = '';
        if (selectedParkingType === 'predefined') {
            const foundLocation = PREDEFINED_PARKING_LOCATIONS.find(loc => loc.id === predefinedParkingLocation);
            finalParkedLocation = foundLocation ? foundLocation.name : 'Unknown Predefined';
        } else {
            if (!customParkingLocation.trim()) { setLogTripError('Please enter custom parking location.'); return; }
            finalParkedLocation = customParkingLocation.trim();
        }
        setLogTripLoading(true);
        try {
            if (!user || !user.id) { setLogTripError('User not authenticated.'); return; }
            const payload = { registration: selectedCarRegistration, start_mileage: startMileage, end_mileage: endMileage, notes: tripNotes, parked_location: finalParkedLocation };
            const response = await makeAuthenticatedRequest(`/api/log-trip`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) { setLogTripError(data.error || 'Failed to log trip.'); }
            else {
                setLogTripSuccess(true);
                // Reset form fields - now handled by useEffect on selectedCarRegistration change
            }
        } catch (err) { console.error('handleLogTrip error:', err); setLogTripError('An error occurred.'); }
        finally { setLogTripLoading(false); }
    };

    const toggleAddCarPanel = () => {
        setIsAddCarPanelVisible(prev => {
            const newVisibility = !prev;
            if (!newVisibility) { setAddCarError(''); setAddCarSuccess(false); }
            return newVisibility;
        });
    };

    if (authLoading && !user) { // Show main auth loading only if user is not yet determined
      return <div className="flex justify-center items-center min-h-screen"><p>Initializing session...</p></div>;
    }
    // User object might exist while authLoading is still true if re-fetching session in background
    // The ProtectedRoute handles redirection if !user after loading.

    return (
        <div className="container mx-auto p-4 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.first_name || 'User'}!</h1>
                <div className="flex gap-4 flex-wrap justify-center">
                    <button
                        onClick={toggleAddCarPanel}
                        className={`font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center transition-colors duration-150 whitespace-nowrap
                            ${isAddCarPanelVisible 
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' 
                                : 'bg-blue-500 hover:bg-blue-700 text-white'}`}
                    >
                        {isAddCarPanelVisible ? (
                            <><svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Cancel Adding Car</>
                        ) : (
                            <><svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>Add New Car</>
                        )}
                    </button>
                    <button onClick={authLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline whitespace-nowrap">
                        Logout
                    </button>
                </div>
            </div>

            {isAddCarPanelVisible && (
                <div className="p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Register a New Car</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="plateInput" className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                            <input id="plateInput" type="text" placeholder="e.g. MAX 007"
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 font-bold text-xl leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={plateValue.length > 3 && plateValue.length <= 7 ? plateValue.slice(0, 3) + ' ' + plateValue.slice(3) : plateValue}
                                onChange={(e) => { const raw = e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 7); setPlateValue(raw); }}/>
                        </div>
                        <div>
                            <label htmlFor="accessLevelSelect" className="block text-sm font-medium text-gray-700 mb-1">Your Access Level</label>
                            <div className="relative">
                                <select id="accessLevelSelect" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}
                                    className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 font-semibold text-base leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white pr-10">
                                    {ACCESS_LEVEL_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"><svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></div>
                            </div>
                        </div>
                        <div>
                            <button onClick={handleAddCar} disabled={plateValue.length < 3 || addCarLoading}
                                className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${addCarLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {addCarLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                {addCarLoading ? 'Adding...' : 'Confirm and Add Car'}
                            </button>
                        </div>
                    </div>
                    {addCarError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{addCarError}</div>}
                    {addCarSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Car successfully added to Garage!</div>}
                </div>
            )}

            {/* Update trip so its two staged, start by entering curr kilometer, timestamp stored and then when user is done driving they enter final kilometer and parking area */}
            {selectedCarRegistration && !garageLoading && (
                <div className="p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Log Trip for: <span className="text-indigo-600 font-mono">{selectedCarRegistration}</span></h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="startKm" className="block text-sm font-medium text-gray-700 mb-1">Start Kilometer</label>
                            <input type="number" id="startKm" value={startKm} onChange={(e) => setStartKm(e.target.value)}
                                   className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 15000" />
                        </div>
                        <div>
                            <label htmlFor="endKm" className="block text-sm font-medium text-gray-700 mb-1">End Kilometer</label>
                            <input type="number" id="endKm" value={endKm} onChange={(e) => setEndKm(e.target.value)}
                                   className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 15100" />
                        </div>
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Parked Location</label>
                            <div className="space-y-2">
                                {PREDEFINED_PARKING_LOCATIONS.map(loc => (
                                    <div key={loc.id} className="flex items-center">
                                        <input id={`parking-${loc.id}`} name="parkingLocationOption" type="radio" value={loc.id}
                                            checked={selectedParkingType === 'predefined' && predefinedParkingLocation === loc.id}
                                            onChange={() => { setSelectedParkingType('predefined'); setPredefinedParkingLocation(loc.id); }}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                        <label htmlFor={`parking-${loc.id}`} className="ml-3 block text-sm text-gray-700">{loc.name}</label>
                                    </div>
                                ))}
                                <div className="flex items-center">
                                    <input id="parking-custom" name="parkingLocationOption" type="radio" value="custom"
                                        checked={selectedParkingType === 'custom'} onChange={() => setSelectedParkingType('custom')}
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                    <label htmlFor="parking-custom" className="ml-3 block text-sm text-gray-700">Other Location:</label>
                                </div>
                                {selectedParkingType === 'custom' && (
                                    <input type="text" value={customParkingLocation} onChange={(e) => setCustomParkingLocation(e.target.value)}
                                           className="mt-1 shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           placeholder="Enter address or location name" />
                                )}
                            </div>
                        </div>
                        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-md text-center text-gray-500">
                            Map Display for Parking Locations (Future Enhancement)
                            <p className="text-xs">(For now, select from options above or enter custom text)</p>
                        </div>
                        <div>
                            <label htmlFor="tripNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                            <textarea id="tripNotes" value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} rows={3}
                                      className="shadow-sm block w-full border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Any notes about the trip..."></textarea>
                        </div>
                        <div>
                            <button onClick={handleLogTrip} disabled={logTripLoading}
                                    className={`w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${logTripLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {logTripLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                {logTripLoading ? 'Logging Trip...' : 'Log This Trip'}
                            </button>
                        </div>
                    </div>
                    {logTripError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{logTripError}</div>}
                    {logTripSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Trip logged successfully!</div>}
                </div>
            )}

            <div className="bg-gradient-to-tr from-gray-50 to-gray-200 p-6 rounded-lg shadow-lg border-1 border-gray-400/10">
                <div className="flex justify-between items-center mb-1">
                    <h2 className='text-2xl font-semibold'>My Garage</h2>
                    <button onClick={fetchCars} disabled={garageLoading} className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md">
                        <RotateCcw />
                    </button>
                </div>
                {garageLoading && <div className="flex justify-center items-center py-10"><svg className="animate-spin h-8 w-8 text-blue-600"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p className="ml-3 text-gray-600">Loading your cars...</p></div>}
                {!garageLoading && (!cars || cars.length === 0) && <p className="text-gray-600 mt-4">Your garage is empty. Add a car to get started!</p>}
                {!garageLoading && cars && cars.length > 0 && (
                    <ul className="space-y-3 mt-4">
                        {cars.map((car) => {
                            const isSelected = selectedCarRegistration === car.registration;
                            return (
                                <li key={car.registration} 
                                    className={`rounded-lg shadow p-4 flex items-center justify-between cursor-pointer transition-all duration-150 ease-in-out transform ${isSelected ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-[1.01]' : 'bg-white hover:bg-gray-50 active:bg-gray-100'}`}
                                    onClick={() => handleCarSelect(car.registration)}>
                                    <div className="flex items-center flex-1 overflow-hidden mr-2">
                                        <div className="flex-1 overflow-hidden">
                                            <span className="block text-gray-800 font-bold text-xl leading-tight truncate">{car.registration.length > 3 ? car.registration.slice(0, 3) + ' ' + car.registration.slice(3) : car.registration}</span>
                                            <span className={`block text-sm font-medium mt-1 ${car.status === 'active' ? 'text-red-600' : car.status === 'maintenance' ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {car.status === 'active' ? 'Occupied' : car.status === 'maintenance' ? 'In Maintenance' : 'Available'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 space-x-2">
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Are you sure you want to remove your access to car ${car.registration}?`)) { handleRemoveCar(car.registration); } }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-150"
                                            title={`Remove car ${car.registration}`}>
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                        {isSelected && (<div className="flex-shrink-0"><svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>)}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-200 shadow-xl rounded-lg border border-gray-200">
                 <h2 className="text-2xl font-semibold text-gray-800 mb-6">Car Bookings</h2>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-200  shadow-xl rounded-lg border border-gray-200">
                 <h2 className="text-2xl font-semibold text-gray-800 mb-6">Car Usage History</h2>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-200 shadow-lg border-1 border-gray-400/10 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">User Details</h2>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>First Name:</strong> {user?.first_name}</p>
                <p><strong>Last Name:</strong> {user?.last_name}</p>
            </div>
        </div>
    );
}