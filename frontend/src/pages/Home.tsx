import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';
import { RotateCcw, PlayCircle, StopCircle, XCircle, Edit3, ChevronRight, ChevronLeft, LogOut, CirclePlus, Clock, Gauge, CircleAlert, CircleParking, Flag, Timer, MapPin, MessageSquare, CheckCheck } from 'lucide-react';

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
    make?: string;
    model?: string;
    year?: number;
    valuation?: string;
    access_level?: typeof ACCESS_LEVEL_OPTIONS[number]['value']; 
    logo_url?: string;
};

interface ActiveTripData {
    registration: string;
    startKm: number;
    endKm?: number;
    startTime: number; // Timestamp from Date.now()
    endTime?: number; // Optional, only set when trip is completed
    ongoingNotes: string;
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

    // --- Trip Logging States ---
    const [activeTrip, setActiveTrip] = useState<ActiveTripData | null>(null);
    const [tripLogStep, setTripLogStep] = useState<'start' | 'active_trip_running' | 'enter_end_km' | 'enter_parking' | 'trip_summary'>('start');
    const [currentStartKmInput, setCurrentStartKmInput] = useState('');
    const [ongoingTripNotes, setOngoingTripNotes] = useState('');
    
    const [endKm, setEndKm] = useState('');
    const [finalTripNotes, setFinalTripNotes] = useState(''); // Additional notes at the very end
    const [selectedParkingType, setSelectedParkingType] = useState<'predefined' | 'custom'>(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
    const [predefinedParkingLocation, setPredefinedParkingLocation] = useState<string>(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
    const [customParkingLocation, setCustomParkingLocation] = useState('');
    
    const [logTripError, setLogTripError] = useState('');
    const [logTripLoading, setLogTripLoading] = useState(false);
    const [logTripSuccess, setLogTripSuccess] = useState(false);
    
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
    const [timerIntervalId, setTimerIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
    // --- End Trip Logging States ---

    const navigate = useNavigate();

    const makeAuthenticatedRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const token = getAccessToken();
        if (!token) { console.error("No access token."); authLogout(); throw new Error("User not authenticated"); }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers },
            credentials: 'include',
        });
        if (response.status === 401) { authLogout(); throw new Error("Unauthorized or token expired"); }
        return response;
    }, [getAccessToken, authLogout]);

    const fetchCars = useCallback(async () => {
        if (!user?.id) { setCars(null); setGarageLoading(false); return; }
        setGarageLoading(true);
        try {
            const response = await makeAuthenticatedRequest(`/api/cars`, { method: 'GET' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Failed to fetch cars - ${response.statusText}` }));
                throw new Error(errorData.error || `Failed to fetch cars`);
            }
            const data: Car[] = await response.json();
            setCars(
                data.map(car => ({
                    ...car,
                    logo_url: car.make ? `/images/car-logos/optimized/${car.make.toLowerCase().replace(/\s+/g, '-')}.png` : '/images/car-logos/optimized/default-car.png'
                }))
            );
        } catch (err) { console.error('Error fetching cars:', err); setCars([]); }
        finally { setGarageLoading(false); }
    }, [user, makeAuthenticatedRequest]);

    useEffect(() => {
        if (user?.id) { fetchCars(); }
        else { setCars(null); setSelectedCarRegistration(null); setGarageLoading(false); }
    }, [user, fetchCars]);
    
    const getActiveTripStorageKey = useCallback(() => {
        if (user?.id && selectedCarRegistration) return `activeTrip_${user.id}_${selectedCarRegistration}`;
        return null;
    }, [user?.id, selectedCarRegistration]);

    // useEffect that loads active trip from localStorage when selectedCarRegistration changes
    useEffect(() => {
        if (selectedCarRegistration && user?.id) {
            const storageKey = getActiveTripStorageKey();
            const savedTripData = storageKey ? localStorage.getItem(storageKey) : null;
            
            setLogTripError(''); 
            setLogTripSuccess(false);

            if (savedTripData) {
                try {
                    const parsedTrip: ActiveTripData = JSON.parse(savedTripData);
                    if (parsedTrip.registration === selectedCarRegistration) {
                        setActiveTrip(parsedTrip);
                        setOngoingTripNotes(parsedTrip.ongoingNotes || '');
                        setCurrentStartKmInput(String(parsedTrip.startKm)); // For display if needed, actual input for new trip

                        if (parsedTrip.endKm !== undefined) {
                            setEndKm(String(parsedTrip.endKm)); // Populate endKm state if it exists
                            setTripLogStep('enter_parking');    // User was likely at parking details step
                        } else {
                            setTripLogStep('active_trip_running'); // Trip was started but end KM not yet entered
                            setEndKm(''); // Ensure endKm input is clear
                        }
                        // Reset fields for the current or next step
                        setFinalTripNotes('');
                        setSelectedParkingType(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
                        setPredefinedParkingLocation(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
                        setCustomParkingLocation('');
                    } else { // Stale data for a different car
                        if(storageKey) localStorage.removeItem(storageKey);
                        setActiveTrip(null); setCurrentStartKmInput(''); setTripLogStep('start'); setOngoingTripNotes(''); setEndKm('');
                    }
                } catch (e) { 
                    console.error("Failed to parse active trip data:", e); 
                    setActiveTrip(null); setCurrentStartKmInput(''); setTripLogStep('start'); setOngoingTripNotes(''); setEndKm('');
                }
            } else { // No saved trip for this car
                setActiveTrip(null); setCurrentStartKmInput(''); setTripLogStep('start'); setOngoingTripNotes(''); setEndKm('');
            }
        } else { // No car selected or no user
            setActiveTrip(null); setCurrentStartKmInput(''); setOngoingTripNotes(''); setTripLogStep('start'); setEndKm('');
            if (timerIntervalId) clearInterval(timerIntervalId); setTimerIntervalId(null); setElapsedTime('00:00:00');
        }
    }, [selectedCarRegistration, user?.id, getActiveTripStorageKey]); // Dependencies updated

    useEffect(() => {
        if (!garageLoading && cars && cars.length > 0) {
            if (selectedCarRegistration === null || !cars.find(c => c.registration === selectedCarRegistration)) {
                setSelectedCarRegistration(cars[0].registration);
            }
        } else if (!garageLoading && (!cars || cars.length === 0)) {
            setSelectedCarRegistration(null);
        }
    }, [cars, garageLoading]);


    const formatElapsedTime = (startTime: number) => {
        const now = Date.now();
        let difference = now - startTime;
        if (difference < 0) difference = 0;
        let seconds = Math.floor((difference / 1000) % 60);
        let minutes = Math.floor((difference / (1000 * 60)) % 60);
        let hours = Math.floor(difference / (1000 * 60 * 60));
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    useEffect(() => {
        if (activeTrip && tripLogStep !== 'start') { // Timer runs as long as trip is active (not in 'start' step)
            setElapsedTime(formatElapsedTime(activeTrip.startTime));
            const intervalId = setInterval(() => {
                setElapsedTime(formatElapsedTime(activeTrip.startTime));
            }, 1000);
            setTimerIntervalId(intervalId);
            return () => { clearInterval(intervalId); setTimerIntervalId(null); };
        } else {
            if (timerIntervalId) clearInterval(timerIntervalId);
            setTimerIntervalId(null); setElapsedTime('00:00:00');
        }
    }, [activeTrip, tripLogStep]);

    const handleStartTrip = () => {
        setLogTripError(''); setLogTripSuccess(false);
        if (!selectedCarRegistration) { setLogTripError("No car selected."); return; }
        if (!currentStartKmInput) { setLogTripError("Starting KM is required."); return; }
        const startMileage = parseInt(currentStartKmInput, 10); 
        if (isNaN(startMileage) || startMileage < 0) { setLogTripError("Invalid starting KM."); return; }
        
        setLogTripLoading(true); 
        const tripData: ActiveTripData = {
            registration: selectedCarRegistration, 
            startKm: startMileage,
            startTime: Date.now(), 
            ongoingNotes: "" // Initialize ongoingNotes
            // endKm and endTime are not set here
        };
        const storageKey = getActiveTripStorageKey();
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(tripData));
        
        setActiveTrip(tripData); 
        setOngoingTripNotes(""); // Clear UI field for ongoing notes
        setTripLogStep('active_trip_running');
        setLogTripSuccess(true); setTimeout(() => setLogTripSuccess(false), 2000);
        setLogTripLoading(false);

        // Clear fields for the next steps
        setEndKm(''); 
        setFinalTripNotes('');
        setSelectedParkingType(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
        setPredefinedParkingLocation(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
        setCustomParkingLocation('');
    };

    const handleOngoingNotesChange = (newNotes: string) => {
        setOngoingTripNotes(newNotes);
        if (activeTrip) {
            const storageKey = getActiveTripStorageKey();
            if (storageKey) {
                const updatedTripData = { ...activeTrip, ongoingNotes: newNotes };
                localStorage.setItem(storageKey, JSON.stringify(updatedTripData));
                setActiveTrip(updatedTripData); 
            }
        }
    };

    const handleProceedToEndKm = () => {
        setTripLogStep('enter_end_km');
        setLogTripError(''); setLogTripSuccess(false); // Clear messages from previous step
    };

    const handleProceedToParking = () => {
        setLogTripError(''); setLogTripSuccess(false);
        if (!endKm) { setLogTripError('End Kilometer is required.'); return; }
        const endMileageNum = parseInt(endKm, 10); 
        if (isNaN(endMileageNum) || (activeTrip && endMileageNum < activeTrip.startKm)) {
            setLogTripError('End KM must be valid and >= Start KM.'); return;
        }

        if (activeTrip) {
            const updatedActiveTrip: ActiveTripData = {
                ...activeTrip,
                endKm: endMileageNum,
                endTime: Date.now(), // Capture time when end KM is confirmed
            };
            setActiveTrip(updatedActiveTrip);
            const storageKey = getActiveTripStorageKey();
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(updatedActiveTrip));
            }
        }
        setTripLogStep('enter_parking');
    };

    const handleProceedToSummary = () => {
        setLogTripError(''); setLogTripSuccess(false);
         // Validate parking location before proceeding to summary
        if (selectedParkingType === 'custom' && !customParkingLocation.trim()) {
            setLogTripError('Please enter the custom parking location or select a predefined one.');
            return;
        }
        if (selectedParkingType === 'predefined' && !predefinedParkingLocation) {
            setLogTripError('Please select a predefined parking location or choose "Other".');
            return;
        }
        // Ensure activeTrip and its endTime are set (should be by handleProceedToParking)
        if (activeTrip && activeTrip.endTime) {
            setElapsedTime(formatElapsedTime(activeTrip.startTime - activeTrip.endTime)); // Calculate final duration
        }
        setTripLogStep('trip_summary');
    };

    const handleCompleteTrip = async () => {
        setLogTripError(''); setLogTripSuccess(false);
        if (!activeTrip || !selectedCarRegistration || activeTrip.registration !== selectedCarRegistration) {
            setLogTripError("No active trip or car mismatch."); return;
        }
        if (activeTrip.endKm === undefined) { 
            setLogTripError("End kilometer not recorded. Please go back and enter it."); return;
        }
        if (activeTrip.endTime === undefined) {
            setLogTripError("End time not recorded. Please go back through the steps."); return;
        }


        const startMileage = activeTrip.startKm; 
        const endMileageNum = activeTrip.endKm; 

        let finalParkedLocation = '';
        if (selectedParkingType === 'predefined') {
            const foundLocation = PREDEFINED_PARKING_LOCATIONS.find(loc => loc.id === predefinedParkingLocation);
            finalParkedLocation = foundLocation ? foundLocation.name : 'Unknown Predefined';
        } else {
            if (!customParkingLocation.trim()) { setLogTripError('Custom parking location is empty.'); return; }
            finalParkedLocation = customParkingLocation.trim();
        }
        setLogTripLoading(true);
        try {
            const combinedNotes = ongoingTripNotes 
                ? (finalTripNotes ? `${ongoingTripNotes}\n--- Final Notes ---\n${finalTripNotes}` : ongoingTripNotes) 
                : finalTripNotes;
            const payload = {
                registration: activeTrip.registration, 
                start_mileage: startMileage,
                end_mileage: endMileageNum, notes: combinedNotes, 
                parked_location: finalParkedLocation,
                started_at: new Date(activeTrip.startTime).toISOString(), 
                ended_at: new Date(activeTrip.endTime).toISOString(), 
            };
            const response = await makeAuthenticatedRequest(`/api/log-trip`, { method: 'POST', body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to complete trip log.'); }
            setLogTripSuccess(true);
            const storageKey = getActiveTripStorageKey();
            if (storageKey) localStorage.removeItem(storageKey);
            setActiveTrip(null); setTripLogStep('start');
            setCurrentStartKmInput(''); setEndKm(''); setFinalTripNotes(''); setOngoingTripNotes('');
            setSelectedParkingType(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
            setPredefinedParkingLocation(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
            setCustomParkingLocation('');
            setTimeout(() => setLogTripSuccess(false), 3000);
        } catch (err) { console.error('handleCompleteTrip error:', err); setLogTripError(err instanceof Error ? err.message : 'An unexpected error occurred.'); }
        finally { setLogTripLoading(false); }
    };
    
    const handleCancelTrip = () => {
        if (window.confirm("Are you sure you want to cancel the current active trip? Any ongoing notes will be lost.")) {
            const storageKey = getActiveTripStorageKey();
            if (storageKey) localStorage.removeItem(storageKey);
            setActiveTrip(null); setCurrentStartKmInput(''); setTripLogStep('start'); setOngoingTripNotes('');
            setLogTripError(''); setLogTripSuccess(false);
        }
    };

    const handleCarSelect = (registration: string) => {
        setSelectedCarRegistration(prev => {
            if (activeTrip && prev !== registration && prev === activeTrip.registration) {
                const confirmSwitch = window.confirm("You have an active trip for the current car. Switching cars will cancel this active trip. Do you want to proceed?");
                if (confirmSwitch) {
                    const currentKey = getActiveTripStorageKey(); // Key for the *currently* active trip
                    if (currentKey) localStorage.removeItem(currentKey);
                    setActiveTrip(null); // Clear the global active trip state
                    setTripLogStep('start');
                    setOngoingTripNotes('');
                } else {
                    return prev; // Don't change selection if user cancels
                }
            }
            return prev === registration ? null : registration;
        });
    };
    
    const handleAddCar = async () => { 
        setAddCarError(''); setAddCarSuccess(false);
        if (plateValue.length < 3) { setAddCarError('Registration must be at least 3 characters.'); return; }
        if (!accessLevel) { setAddCarError('Please select an access level.'); return; }
        setAddCarLoading(true);
        try {
            const response = await makeAuthenticatedRequest(`/api/add-car`, {
                method: 'POST',
                body: JSON.stringify({ registration: plateValue.replace(/\s+/g, '').toUpperCase(), access_level: accessLevel }),
            });
            const data = await response.json();
            if (!response.ok) { setAddCarError(data.error || 'Failed to add car.'); }
            else {
                setAddCarSuccess(true); setPlateValue(''); setAccessLevel(ACCESS_LEVEL_OPTIONS[0].value);
                await fetchCars();
                setTimeout(() => {setAddCarSuccess(false); setIsAddCarPanelVisible(false);}, 2000);
            }
        } catch (err) { console.error('handleAddCar error:', err); setAddCarError(err instanceof Error ? err.message : 'An unexpected error occurred.'); }
        finally { setAddCarLoading(false); }
    };

    const handleRemoveCar = async (registration: string) => { 
        setAddCarError(''); setAddCarSuccess(false);
        try {
            const response = await makeAuthenticatedRequest(`/api/remove-car/${registration}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: "Unknown error removing car"}));
                throw new Error(errorData.error || `Failed to remove car: ${response.statusText}`);
            }
            await fetchCars();
        } catch (err) { console.error('Error removing car:', err); setAddCarError(err instanceof Error ? err.message : "Could not remove car."); }
    };

    const formatKilometersForDisplay = (value: string): string => {
        if (!value) return '';

        const numStr = value.replace(/[^\d]/g, '');
        if (numStr.length === 0) return ''; // Return empty if no digits

        return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };


    const toggleAddCarPanel = () => setIsAddCarPanelVisible(prev => { const nv = !prev; if (!nv) {setAddCarError(''); setAddCarSuccess(false);} return nv;});

    if (authLoading && !user) {
        return <div className="flex justify-center items-center min-h-screen"><p>Initializing session...</p></div>;
    }
    if (!user && !authLoading) {
        navigate('/login', {replace: true});
        return null;
    }

    // ----- JSX Starts Here -----
    return (
        <div className="container mx-auto p-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.first_name || 'User'}!</h1>
                <div className="flex gap-4 flex-wrap justify-center">
                    <button onClick={toggleAddCarPanel} className={`font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center transition-colors duration-150 whitespace-nowrap ${isAddCarPanelVisible ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' : 'bg-blue-500 hover:bg-blue-700 text-white'}`}>
                        {isAddCarPanelVisible ? (<><XCircle size={20} className="mr-2" />Cancel Adding Car</>) : (<><CirclePlus size={20} className="mr-2" />Add New Car</>)}
                    </button>
                    <button
                        type="button"
                        onClick={authLogout}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline whitespace-nowrap flex flex-row items-center"
                    >
                        <LogOut className="mr-2" /> Logout
                    </button></div>
            </div>

            {/* Add Car Panel */}
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
                    {addCarSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Car successfully added!</div>}
                </div>
            )}

            {/* Log Car Trip Panel - Visible if a car is selected */}
            {selectedCarRegistration && !garageLoading && (
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-200 shadow-xl rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Tripometer
                        </h2>
                        <div className="flex items-center space-x-3">
                            {(() => {
                                const car = cars?.find(c => c.registration === selectedCarRegistration);
                                return car ? (
                                    <img
                                        src={car.logo_url || '/images/car-logos/optimized/default-car.png'}
                                        alt={`${car.make || 'Car'} logo`}
                                        className="h-8 w-auto object-contain mix-blend-multiply"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/car-logos/optimized/default-car.png'; }}
                                    />
                                ) : null;
                            })()}
                        </div>
                    </div>
                    
                    {/* START TRIP UI */}
                    {tripLogStep === 'start' && (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="currentStartKmInput" className="block text-sm font-medium text-gray-700 mb-1">Current Starting Kilometer</label>
                                <input type="text" id="currentStartKmInput" value={formatKilometersForDisplay(currentStartKmInput)} 
                                       onChange={(e) => setCurrentStartKmInput(e.target.value.replace(/\s+/g, ''))}
                                       className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 150 000" />
                            </div>
                            <div>
                                <button onClick={handleStartTrip} disabled={logTripLoading || !selectedCarRegistration}
                                        className={`w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${logTripLoading || !selectedCarRegistration ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <PlayCircle size={20} className="mr-2"/>
                                    {logTripLoading ? 'Starting...' : 'Start Trip'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ACTIVE TRIP RUNNING UI */}
                    {tripLogStep === 'active_trip_running' && activeTrip && (
                        <div className="space-y-4 mt-4">
                            <div className="p-4 bg-slate-700 text-slate-100 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <PlayCircle size={22} className="mr-2 text-emerald-400 animate-pulse" />
                                        Trip Active!
                                    </h3>
                                    <div className="text-3xl font-mono text-emerald-400 tracking-wider">
                                        {elapsedTime}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Gauge size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Start Kilometer:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{formatKilometersForDisplay(String(activeTrip.startKm))} km</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Clock size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Started:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{new Date(activeTrip.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                 <label htmlFor="ongoingTripNotes" className="flex flex-row text-sm font-medium text-gray-700 mb-1 items-center">
                                    Notes During Trip <span className="text-xs text-gray-500 ml-1">(auto-saves)</span>:
                                </label>
                                <textarea id="ongoingTripNotes" value={ongoingTripNotes} 
                                          onChange={(e) => handleOngoingNotesChange(e.target.value)}
                                          rows={3}
                                          className="shadow-sm block w-full border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="e.g. malfunctions, strange behaviour..."/>
                            </div>
                             <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                <button onClick={handleProceedToEndKm} disabled={logTripLoading}
                                        className={`w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center`}>
                                    <Edit3 size={20} className="mr-2"/>Prepare to End Trip
                                </button>
                                <button onClick={handleCancelTrip} disabled={logTripLoading}
                                        className="w-full sm:flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center">
                                    <XCircle size={20} className="mr-2"/>Cancel Active Trip
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* ENTER END KM UI */}
                    {tripLogStep === 'enter_end_km' && activeTrip && (
                        <div className="space-y-4 mt-4">
                            <div className="p-4 bg-slate-700 text-slate-100 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <CircleAlert size={22} className="mr-2 text-orange-400 animate-pulse" />
                                        Finalizing!
                                    </h3>
                                    <div className="text-3xl font-mono text-orange-400 tracking-wider">
                                        {elapsedTime}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Gauge size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Start Kilometer:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{formatKilometersForDisplay(String(activeTrip.startKm))} km</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Clock size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Started:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{new Date(activeTrip.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                {activeTrip.ongoingNotes && 
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                        <p className="text-xs text-slate-400">Ongoing Notes:</p>
                                        <p className="text-sm text-slate-200 whitespace-pre-wrap">{activeTrip.ongoingNotes}</p>
                                    </div>
                                }
                            </div>
                            <div>
                                <label htmlFor="endKmInput" className="block text-sm font-medium text-gray-700 mb-1">Enter End Kilometer</label>
                                <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    id="endKmInput" 
                                    value={formatKilometersForDisplay(endKm)} 
                                    onChange={(e) => setEndKm(e.target.value.replace(/\s+/g, ''))}
                                    className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 200 000" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setTripLogStep('active_trip_running')} className="w-full sm:w-1/2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center">
                                   <ChevronLeft size={20} className="mr-2"/> Back
                                </button>
                                <button onClick={handleProceedToParking} disabled={!endKm.trim()}
                                        className={`w-full sm:w-1/2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${!endKm.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Next: Parking <ChevronRight size={20} className="ml-2"/>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ENTER PARKING & FINAL NOTES UI */}
                    {tripLogStep === 'enter_parking' && activeTrip && (
                        <div className="space-y-4 mt-4">
                            <div className="p-4 bg-slate-700 text-slate-100 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <CircleParking size={22} className="mr-2 text-blue-400 animate-pulse" />
                                        Parking!
                                    </h3>
                                    <div className="text-3xl font-mono text-blue-400 tracking-wider">
                                        {elapsedTime}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="flex items-center">
                                        <Gauge size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Start Kilometer:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{formatKilometersForDisplay(String(activeTrip.startKm))} km</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Flag size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">End Kilometer:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{formatKilometersForDisplay(String(endKm))} km</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Timer size={16} className="mr-2 text-slate-400" />
                                        <span className="text-slate-300">Interval:</span>
                                        <span className="ml-1 font-semibold text-slate-100">{new Date(activeTrip.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span className="ml-1 text-slate-400"> — </span>
                                        <span className="ml-1 font-semibold text-slate-100">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                {activeTrip.ongoingNotes && 
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                        <p className="text-xs text-slate-400">Ongoing Notes:</p>
                                        <p className="text-sm text-slate-200 whitespace-pre-wrap">{activeTrip.ongoingNotes}</p>
                                    </div>
                                }
                            </div>
                            {/* Parking Location Section */}
                            <div className="p-4 bg-slate-700 rounded-md border border-gray-200">
                                <label className="text-lg font-bold text-white mb-3 flex items-center">
                                    <MapPin size={22} className="mr-2 text-blue-400" /> Parked Location
                                </label>
                                <div className="space-y-3">
                                    {PREDEFINED_PARKING_LOCATIONS.map(loc => (
                                        <label key={loc.id} htmlFor={`parking-${loc.id}`} className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border border-slate-600 has-[:checked]:bg-slate-800 has-[:checked]:border-indigo-400">
                                            <input id={`parking-${loc.id}`} name="parkingLocationOption" type="radio" value={loc.id}
                                                checked={selectedParkingType === 'predefined' && predefinedParkingLocation === loc.id}
                                                onChange={() => { setSelectedParkingType('predefined'); setPredefinedParkingLocation(loc.id); }}
                                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-600"/>
                                            <span className="ml-3 block text-sm text-white">{loc.name}</span>
                                        </label>
                                    ))}
                                    <label htmlFor="parking-custom" className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border border-slate-600 has-[:checked]:bg-slate-800 has-[:checked]:border-indigo-400">
                                        <input id="parking-custom" name="parkingLocationOption" type="radio" value="custom"
                                            checked={selectedParkingType === 'custom'} onChange={() => setSelectedParkingType('custom')}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600"/>
                                        <span className="ml-3 block text-sm text-white">Other Location:</span>
                                    </label>
                                    {selectedParkingType === 'custom' && (
                                        <input type="text" value={customParkingLocation} onChange={(e) => setCustomParkingLocation(e.target.value)}
                                               className="mt-1 shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 bg-slate-800"
                                               placeholder="Enter address or location name" />
                                    )}
                                </div>
                            </div>
                            {/* Map Placeholder */}
                            <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-md text-center text-gray-500">
                                Map Display for Parking Locations (Future Enhancement)
                                <p className="text-xs">(For now, select from options above or enter custom text)</p>
                            </div>
                            {/* Final Trip Notes */}
                            <div>
                                <label htmlFor="finalTripNotes" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <MessageSquare size={16} className="mr-2 text-gray-500"/>
                                    Final Trip Notes <span className="text-xs text-gray-500 ml-1">(optional)</span>:
                                </label>
                                <textarea id="finalTripNotes" value={finalTripNotes} onChange={(e) => setFinalTripNotes(e.target.value)} rows={3}
                                          className="shadow-sm block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400"
                                          placeholder="Any final notes about the trip..."></textarea>
                            </div>
                            <div className="flex flex-row gap-3 mt-4">
                                <button onClick={() => setTripLogStep('enter_end_km')} className="w-full sm:flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center">
                                   <ChevronLeft size={20} className="mr-2"/> Back
                                </button>
                                <button onClick={handleProceedToSummary} disabled={logTripLoading}
                                        className={`w-full sm:flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${logTripLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {logTripLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                    {logTripLoading ? 'Completing...' : <>Review Trip <ChevronRight size={20} className="ml-2"/></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TRIP SUMMARY UI (NEW STEP) */}
                    {tripLogStep === 'trip_summary' && activeTrip && (
                        <div className="space-y-6 mt-4">
                            <div className="p-4 bg-slate-700 text-slate-100 rounded-lg shadow-lg border border-slate-700">
                                <h3 className="text-xl flex flex-row items-center font-semibold text-emerald-400 mb-4 border-b border-slate-600 pb-2">
                                    <CheckCheck size={22} className="mr-2 text-emerald-400 animate-pulse" />
                                    Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <p><strong className="text-slate-300 font-normal">Car:</strong> <span className="font-mono">{
                                    activeTrip.registration.length > 3
                                        ? activeTrip.registration.slice(0, 3) + ' ' + activeTrip.registration.slice(3)
                                        : activeTrip.registration
                                    }</span></p>
                                    <p><strong className="text-slate-300 font-normal">Start Kilometer:</strong> {formatKilometersForDisplay(String(activeTrip.startKm))} km</p>
                                    <p><strong className="text-slate-300 font-normal">End Kilometer:</strong> {formatKilometersForDisplay(String(activeTrip.endKm || ''))} km</p>
                                    <p><strong className="text-slate-300 font-normal">Distance:</strong> {activeTrip.endKm ? formatKilometersForDisplay(String(activeTrip.endKm - activeTrip.startKm)) : 'N/A'} km</p>
                                    <p><strong className="text-slate-300 font-normal">Started At:</strong> {new Date(activeTrip.startTime).toLocaleString()}</p>
                                    <p><strong className="text-slate-300 font-normal">Ended At:</strong> {activeTrip.endTime ? new Date(activeTrip.endTime).toLocaleString() : 'N/A'}</p>
                                    <div className="md:col-span-2">
                                        <strong className="text-slate-400 block mb-1">Parked Location:</strong>
                                        <p className="bg-slate-800 p-2 rounded text-slate-200">
                                            {selectedParkingType === 'custom' ? customParkingLocation : PREDEFINED_PARKING_LOCATIONS.find(p => p.id === predefinedParkingLocation)?.name || 'Not Specified'}
                                        </p>
                                    </div>
                                    {(activeTrip.ongoingNotes || finalTripNotes) && (
                                        <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-700">
                                            <strong className="text-slate-400 block mb-1">Notes:</strong>
                                            <p className="text-slate-200 whitespace-pre-wrap bg-slate-800 p-2 rounded">
                                                {ongoingTripNotes && <>{ongoingTripNotes}</>}
                                                {ongoingTripNotes && finalTripNotes && <span className="block my-1 border-t border-slate-600"></span>}
                                                {finalTripNotes && <>{finalTripNotes}</>}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <button onClick={() => setTripLogStep('enter_parking')} className="w-full sm:flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center">
                                   <ChevronLeft size={20} className="mr-2"/> Back to Parking Details
                                </button>
                                <button onClick={handleCompleteTrip} disabled={logTripLoading}
                                        className={`w-full sm:flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${logTripLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {logTripLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                    {logTripLoading ? 'Logging...' : <><StopCircle size={20} className="mr-2"/>Confirm & Log Trip</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Common Error/Success messages for all trip log steps */}
                    {logTripError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{logTripError}</div>}
                    {logTripSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Trip action successful!</div>}
                </div>
            )}
            
            {/* Garage Panel */}
            <div className="bg-gradient-to-tr from-gray-50 to-gray-200 p-6 rounded-lg shadow-lg border-1 border-gray-400/10">
                <div className="flex justify-between items-center mb-1">
                    <h2 className='text-2xl font-semibold'>My Garage</h2>
                    <button onClick={fetchCars} disabled={garageLoading} className="p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md" title="Refresh Car List">
                        <RotateCcw className={`h-5 w-5 ${garageLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {garageLoading && <div className="flex justify-center items-center py-10"><svg className="animate-spin h-8 w-8 text-blue-600"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p className="ml-3 text-gray-600">Loading your cars...</p></div>}
                {!garageLoading && (!cars || cars.length === 0) && <p className="text-gray-600 mt-4 text-center py-5">Your garage is empty. Add a car to get started!</p>}
                {!garageLoading && cars && cars.length > 0 && (
                    <ul className="space-y-3 mt-4">
                        {cars.map((car) => {
                            const isSelected = selectedCarRegistration === car.registration;
                            const isCarActiveTrip = activeTrip?.registration === car.registration;
                            return (
                                <li key={car.registration} 
                                    className={`relative rounded-lg shadow-md p-4 flex items-start cursor-pointer transition-all duration-150 ease-in-out transform 
                                    ${isSelected 
                                        ? (isCarActiveTrip && tripLogStep !== 'start' ? 'bg-blue-100 ring-2 ring-blue-500 shadow-lg' : 'bg-indigo-100 ring-2 ring-indigo-500 shadow-lg')
                                        : 'bg-white hover:bg-gray-50 hover:shadow-lg active:bg-gray-100'
                                    }
                                    ${isCarActiveTrip && tripLogStep !== 'start' ? 'border-2 border-blue-400' : ''}
                                    `}
                                    onClick={() => handleCarSelect(car.registration)}>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="w-20 sm:w-28 h-auto pr-4 flex-shrink-0 flex flex-col justify-center items-center self-center">
                                            <img src={car.logo_url || '/images/car-logos/optimized/default-car.png'} alt={`${car.make || 'Car'} logo`} className="max-w-full max-h-16 sm:max-h-20 object-contain mix-blend-multiply" onError={(e) => { (e.target as HTMLImageElement).src = '/images/car-logos/optimized/default-car.png'; }}/>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="text-md sm:text-lg font-bold text-gray-800 truncate" title={`${car.make || ''} ${car.model || ''}`.trim()}>
                                                {car.make || 'Unknown Make'} {car.model || ''}
                                            </h3>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1">
                                                <div className="flex items-center mb-0.5 sm:mb-0">
                                                    <span className={`h-2.5 w-2.5 rounded-full mr-1.5 flex-shrink-0 
                                                        ${isCarActiveTrip && tripLogStep !== 'start' ? 'bg-blue-500 animate-pulse' : 
                                                          (car.status === 'active' ? 'bg-red-500' : 
                                                          car.status === 'maintenance' ? 'bg-yellow-400' : 
                                                          'bg-green-500')}`}>
                                                    </span>
                                                    <span className={`text-xs font-medium 
                                                        ${isCarActiveTrip && tripLogStep !== 'start' ? 'text-blue-700' :
                                                          (car.status === 'active' ? 'text-red-700' : 
                                                          car.status === 'maintenance' ? 'text-yellow-700' : 
                                                          'text-green-700')}`}>
                                                        {isCarActiveTrip && tripLogStep !== 'start' ? 'Trip Active' :
                                                         (car.status === 'active' ? 'Occupied' : 
                                                         car.status === 'maintenance' ? 'Maintenance' : 
                                                         'Available')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 font-mono tracking-wide truncate" title={car.registration}>
                                                    REG: {car.registration.length > 3 ? car.registration.slice(0, 3) + ' ' + car.registration.slice(3) : car.registration}
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">Year: <span className="font-semibold">{car.year || 'N/A'}</span></p>
                                            <p className="text-xs sm:text-sm text-gray-600">Valuation: <span className="font-semibold">{car.valuation || 'N/A'}</span></p>
                                            <p className="text-xs sm:text-sm text-gray-500">Your access: <span className="font-semibold not-italic text-gray-600">{car.access_level ? ACCESS_LEVEL_OPTIONS.find(opt => opt.value === car.access_level)?.label : 'N/A'}</span></p>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 flex space-y-1">
                                        {isSelected && (
                                            <div className="p-0.5 bg-indigo-600 rounded-full shadow z-10" title="Selected for an action"> 
                                                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className='absolute bottom-2 right-2 flex space-y-1'>
                                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Are you sure you want to remove your access to car ${car.registration}?`)) { handleRemoveCar(car.registration); } }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-150 z-0"
                                            title={`Remove car ${car.registration}`}>
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            
            <div className="mt-8 p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                 <h2 className="text-2xl font-semibold text-gray-800 mb-6">Car Bookings (Future)</h2>
            </div>
            <div className="mt-8 p-6 bg-white shadow-xl rounded-lg border border-gray-200">
                 <h2 className="text-2xl font-semibold text-gray-800 mb-6">Car Usage History (Future)</h2>
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