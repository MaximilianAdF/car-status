// src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


type Status = 'active' | 'maintenance' | 'inactive';
type Car = { registration: string; status: Status; }

const ACCESS_LEVEL_OPTIONS = [
    { value: 'owner', label: 'Owner' },
    { value: 'driver', label: 'Driver' },
    { value: 'guest', label: 'Guest' },
    { value: 'practice driver', label: 'Practice Driver' },
];

export default function Home() {
    const { user, setUser, loading: authLoading } = useAuth();
    const [cars, setCars] = useState<Car[] | null>(null);
    const [selectedCarRegistration, setSelectedCarRegistration] = useState<string | null>(null);

    // States for the "Add Car" panel
    const [plateValue, setPlateValue] = useState('');
    const [accessLevel, setAccessLevel] = useState<string>(ACCESS_LEVEL_OPTIONS[0].value);
    const [addCarError, setAddCarError] = useState(''); // Specific error for add car form
    const [addCarLoading, setAddCarLoading] = useState(false); // Specific loading for add car form
    const [addCarSuccess, setAddCarSuccess] = useState(false); 
    const [isAddCarPanelVisible, setIsAddCarPanelVisible] = useState(false);

    // State for Garage panel
    const [garageLoading, setGarageLoading] = useState(false);

    // State for Trip panel
    const [startKm, setStartKm] = useState('');
    const [endKm, setEndKm] = useState('');
    const [tripNotes, setTripNotes] = useState('');

    // Parking location
    const PREDEFINED_PARKING_LOCATIONS = [
        { id: 'p1', name: 'Mälaren' },
        { id: 'p2', name: 'Kungsholmstorg - Systembolaget Sidan'},
        { id: 'p3', name: 'Kungsholmstorg - Ica Sidan'},
        { id: 'p4', name: 'Garvargatan'},
        { id: 'p5', name: 'Garvargatan - Lastplats'}
    ]

    const [selectedParkingType, setSelectedParkingType] = useState<'predefined' | 'custom'>(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
    const [predefinedParkingLocation, setPredefinedParkingLocation] = useState<string>(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
    const [customParkingLocation, setCustomParkingLocation] = useState('');

    const [logTripError, setLogTripError] = useState('');
    const [logTripLoading, setLogTripLoading] = useState(false);
    const [logTripSuccess, setLogTripSuccess] = useState(false);

    const navigate = useNavigate();

    // Fetch Cars Logic (simplified for brevity, keep your existing logic)
    const fetchCars = async () => {
        if (!user?.id) { setCars(null); setGarageLoading(false); return; }
        
        setGarageLoading(true); // Indicate general loading for cars list
        try {
            const response = await fetch('http://localhost:8080/api/cars', { /* your fetch options */
                method: 'POST', headers: { 'Content-Type': 'application/json', 'user_id': String(user.id) },
                credentials: 'include', body: JSON.stringify({})
            });
            if (!response.ok) throw new Error('Failed to fetch cars');
            const data = await response.json();
            setCars(data);
        } catch (err) {
            console.error('Error fetching cars:', err);
            setCars([]); // Default to empty on error
        } finally {
            setGarageLoading(false);
        }
    };

    useEffect(() => { 
        if (user?.id) {
            fetchCars();
        } else {
            setCars(null); // Reset cars if user is not authenticated
            setGarageLoading(false); // Stop loading if no user
            setSelectedCarRegistration(null); // Reset selected car
        }
    }, [user]);

    useEffect(() => {
        if (!garageLoading && cars && cars.length > 0) {
            if (selectedCarRegistration === null || !cars.find(c => c.registration === selectedCarRegistration)) {
                setSelectedCarRegistration(cars[0].registration);
            }
        } else if (!garageLoading && (!cars || cars.length === 0)) {
            setSelectedCarRegistration(null);
        }
    }, [cars, garageLoading]);

    const handleLogTrip = async () => {
        setLogTripError('');
        setLogTripSuccess(false);

        if (!selectedCarRegistration) {
            setLogTripError('Please select a car from the garage first.');
            return;
        }
        if (!startKm || !endKm) {
            setLogTripError('Start and End KM are required.');
            return;
        }
        const startMileage = parseInt(startKm, 10);
        const endMileage = parseInt(endKm, 10);
        if (isNaN(startMileage) || isNaN(endMileage) || endMileage < startMileage) {
            setLogTripError('End KM must be a valid number and greater than or equal to Start KM.');
            return;
        }

        let finalParkedLocation = '';
        if (selectedParkingType === 'predefined') {
            const foundLocation = PREDEFINED_PARKING_LOCATIONS.find(loc => loc.id === predefinedParkingLocation);
            finalParkedLocation = foundLocation ? foundLocation.name : 'Unknown Predefined';
        } else {
            if (!customParkingLocation.trim()) {
                setLogTripError('Please enter the custom parking location.');
                return;
            }
            finalParkedLocation = customParkingLocation.trim();
        }

        setLogTripLoading(true);
        try {
            if (!user || !user.id) {
                setLogTripError('User not authenticated.');
                return; // Early return
            }

            const payload = {
                registration: selectedCarRegistration,
                userId: user.id, // Or let backend derive from session using verifySession
                start_mileage: startMileage,
                end_mileage: endMileage,
                notes: tripNotes,
                parked_location: finalParkedLocation,
                // You might want to add startedAt, endedAt timestamps here or on the backend
            };

            // Replace with your actual API endpoint for logging a trip
            const response = await fetch('http://localhost:8080/api/log-trip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user_id': String(user.id), // If your verifySession needs it
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setLogTripError(data.error || 'Failed to log trip.');
            } else {
                setLogTripSuccess(true);
                // Reset form fields
                setStartKm('');
                setEndKm('');
                setTripNotes('');
                setSelectedParkingType(PREDEFINED_PARKING_LOCATIONS.length > 0 ? 'predefined' : 'custom');
                setPredefinedParkingLocation(PREDEFINED_PARKING_LOCATIONS[0]?.id || '');
                setCustomParkingLocation('');
                // Maybe fetch updated car history or dashboard data if needed
                // setIsLogTripPanelVisible(false); // Optionally hide panel on success
            }
        } catch (err) {
            console.error('handleLogTrip error:', err);
            setLogTripError('An unexpected error occurred while logging the trip.');
        } finally {
            setLogTripLoading(false);
        }
    };

    const handleCarSelect = (registration: string) => {
        setSelectedCarRegistration(prev => prev === registration ? null : registration);
    };
    
    const handleAddCar = async () => {
        setAddCarError('');
        setAddCarSuccess(false);
        if (plateValue.length < 6) { setAddCarError('Registration must be at least 6 characters.'); return; }
        if (!accessLevel) { setAddCarError('Please select an access level.'); return; }
        
        setAddCarLoading(true);
        try {
            if (!user || !user.id) { setAddCarError('User not authenticated.'); return; }
            const response = await fetch('http://localhost:8080/api/add-car', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'user_id': String(user.id) },
                credentials: 'include',
                body: JSON.stringify({ registration: plateValue.replace(/\s+/g, '').toUpperCase(), access_level: accessLevel }),
            });
            const data = await response.json();
            if (!response.ok) { setAddCarError(data.error || 'Failed to add car.'); }
            else {
                setAddCarSuccess(true); setPlateValue(''); setAccessLevel(ACCESS_LEVEL_OPTIONS[0].value);
                await fetchCars();
                // Hide panel on success after a short delay
                // setTimeout(() => { setIsAddCarPanelVisible(false); setAddCarSuccess(false); }, 2000);
            }
        } catch (err) { console.error('handleAddCar error:', err); setAddCarError('An unexpected error occurred.'); }
        finally { setAddCarLoading(false); }
    };


    const handleRemoveCar = async (registration: string) => {
        if (!user || !user.id) { console.error('User not authenticated.'); return; }
        try {
            const response = await fetch(`http://localhost:8080/api/remove-car/${registration}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'user_id': String(user.id) },
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to remove car');
            const data = await response.json();
            console.log(data.message); // "Car removed successfully" or similar
            await fetchCars(); // Refresh car list after removal
        } catch (err) {
            console.error('Error removing car:', err);
        }
    }

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/logout', {
                method: 'POST', // Or GET, depending on your backend API design for logout
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important: ensures cookies (like session_id) are sent
            });

            const data = await response.json();

            if (response.ok) {
                console.log(data.message); // "Logout successful" or similar
                setUser(null); // Clear user from AuthContext
                // Optionally clear other local storage items if you've set any manually
                // localStorage.removeItem('someToken');
                navigate('/login', { replace: true }); // Redirect to login page
            } else {
                // Handle logout error (e.g., show a message)
                console.error('Logout failed:', data.error || response.statusText);
                // You might want to inform the user, or perhaps force client-side logout anyway
                setUser(null); // Clear user from AuthContext even if backend call fails
                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('An error occurred during logout:', error);
            // Force client-side logout in case of network error
            setUser(null);
            navigate('/login', { replace: true });
        }
    };

    const toggleAddCarPanel = () => {
        setIsAddCarPanelVisible(prev => {
            const newVisibility = !prev;
            if (!newVisibility) { // If hiding panel
                setAddCarError('');
                setAddCarSuccess(false);
            }
            return newVisibility;
        });
    };

    if (authLoading) return <div className="flex justify-center items-center min-h-screen"><p>Loading user data...</p></div>;
    if (!user) { navigate('/login', { replace: true }); return null; }

    return (
        <div className="container mx-auto p-4">
            {/* Welcome Header & Logout Button */}
            <div className="flex justify-between mb-6 items-center">
                                <button
                    onClick={toggleAddCarPanel}
                    className={`font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center transition-colors duration-150
                        ${isAddCarPanelVisible 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-800' 
                            : 'bg-blue-500 hover:bg-blue-700 text-white'}`}
                >
                    {isAddCarPanelVisible ? (
                        <>
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            Cancel Adding Car
                        </>
                    ) : (
                        <>
                            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Add New Car
                        </>
                    )}
                </button>
                
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Logout
                </button>
            </div>

            {/* Conditionally Rendered Add Car Panel */}
            {isAddCarPanelVisible && (
                <div className="mb-8 p-6 bg-gradient-to-b from-blue-50 to-green-200 shadow-xl rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">Register a New Car</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="plateInput" className="block text-sm font-medium text-gray-700 mb-1">
                                Registration Number
                            </label>
                            <input
                                id="plateInput" type="text" placeholder="e.g. MAX 007"
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 font-bold text-xl leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={plateValue.length > 3 && plateValue.length <= 7 ? plateValue.slice(0, 3) + ' ' + plateValue.slice(3) : plateValue}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 7);
                                    setPlateValue(raw);
                                }}
                            />
                        </div>

                        <div>
                            <label htmlFor="accessLevelSelect" className="block text-sm font-medium text-gray-700 mb-1">
                                Your Access Level
                            </label>
                            <div className="relative">
                                <select
                                    id="accessLevelSelect"
                                    value={accessLevel}
                                    onChange={(e) => setAccessLevel(e.target.value)}
                                    className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 font-semibold text-base leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-transparent pr-10"
                                >
                                    {ACCESS_LEVEL_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={handleAddCar}
                                disabled={addCarLoading}
                                className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center ${addCarLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {addCarLoading && (
                                    <svg 
                                        className="animate-spin h-5 w-5 mr-3 text-white" 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        fill="none" 
                                        viewBox="0 0 24 24"
                                    >
                                        <circle 
                                            className="opacity-25" 
                                            cx="12" 
                                            cy="12" 
                                            r="10" 
                                            stroke="currentColor" 
                                            strokeWidth="4"
                                        ></circle>
                                        <path 
                                            className="opacity-75" 
                                            fill="currentColor" 
                                            // This is a more standard path for a quarter-circle segment spinner
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
                                        ></path>
                                    </svg>
                                )}
                                {addCarLoading ? 'Adding...' : 'Confirm and Add Car'}
                            </button>
                        </div>
                    </div>

                    {addCarError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{addCarError}</div>}
                    {addCarSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Car successfully added to Garage!</div>}
                </div>
            )}

            {/* Garage Panel */}
            <div className="bg-gradient-to-tr from-gray-50 to-gray-200 p-6 rounded-lg shadow-lg border-1 border-gray-400/10">
                <div className="flex justify-between items-center mb-1">
                    <h2 className='text-2xl font-semibold'>Garage</h2>
                </div>
                 
                {/* Car List Loading State */}
                {garageLoading && (
                    <div className="flex justify-center items-center py-10">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <p className="ml-3 text-gray-600">Loading your cars...</p>
                    </div>
                )}
                
                {/* Empty State - Shown when not loading AND cars array is empty or null */}
                {!garageLoading && (!cars || cars.length === 0) && (
                    <p className="text-gray-600 mt-4 text-center py-5">Your garage is empty. Add a car to get started!</p>
                )}
                
                {!garageLoading && cars && cars.length > 0 && (
                    <ul className="space-y-3 mt-4">
                        {cars.map((car) => {
                            const isSelected = selectedCarRegistration === car.registration;
                            return (
                                <li
                                    key={car.registration}
                                    className={`
                                        rounded-lg shadow p-4 flex items-center justify-between 
                                        transition-all duration-150 ease-in-out transform
                                        ${isSelected
                                            ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-[1.01]'
                                            : 'bg-white hover:bg-gray-50' // Keep hover for row, selection changes background
                                        }
                                        ${!isSelected ? 'cursor-pointer' : ''} // Only show pointer if not selected, or always if selection is main action
                                    `}
                                    onClick={() => handleCarSelect(car.registration)} // Selects the car
                                >
                                    {/* Car Details (Registration & Status) */}
                                    <div className="flex-1 overflow-hidden mr-2"> {/* Added mr-2 for spacing */}
                                        <span className="block text-gray-800 font-bold text-xl leading-tight truncate">
                                            {car.registration.length > 3
                                                ? car.registration.slice(0, 3) + ' ' + car.registration.slice(3)
                                                : car.registration}
                                        </span>
                                        <span className={`block text-sm font-medium mt-1 ${
                                            car.status === 'active' ? 'text-red-600' :
                                            car.status === 'maintenance' ? 'text-yellow-600' : 'text-green-600'
                                        }`}>
                                            {car.status === 'active' ? 'Occupied' : car.status === 'maintenance' ? 'In Maintenance' : 'Available'}
                                        </span>
                                    </div>

                                    {/* Actions Area: Delete Button and Selection Checkmark */}
                                    <div className="flex items-center flex-shrink-0 space-x-2">
                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // IMPORTANT: Prevents li's onClick (handleCarSelect)
                                                if (window.confirm(`Are you sure you want to remove your access to car ${car.registration}?`)) {
                                                    handleRemoveCar(car.registration);
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-150"
                                            title={`Remove car ${car.registration}`} // Tooltip for accessibility
                                        >
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>

                                        {/* Checkmark Indicator for selected item */}
                                        {isSelected && (
                                            <div className="flex-shrink-0"> {/* Checkmark doesn't need extra margin if actions div has space-x */}
                                                <svg className="h-7 w-7 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                        )}
                                        {/* Placeholder for checkmark to maintain layout consistency if needed when not selected,
                                            or ensure delete button is always similarly positioned.
                                            With flex-shrink-0 on checkmark div and space-x on parent, it should be okay.
                                            Alternatively, make checkmark always present but visually hidden:
                                        */}
                                        {/* {!isSelected && <div className="h-7 w-7"></div>} */}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Car Trip Panel, start km, end km, parking spot, ev.notes */} 
            {selectedCarRegistration && !garageLoading && (
                <div className="mt-8 p-6 bg-gradient-to-tl from-gray-50 to-gray-200 shadow-xl rounded-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                        Log Trip for: <span className="text-indigo-600">{selectedCarRegistration || "No Car Selected"}</span>
                    </h2>

                    {!selectedCarRegistration && cars && cars.length > 0 && (
                        <p className="text-yellow-700 bg-yellow-100 p-3 rounded-md mb-4">
                            Please select a car from your garage to log a trip. The first car has been pre-selected.
                        </p>
                    )}
                    {!cars || cars.length === 0 && (
                        <p className="text-red-700 bg-red-100 p-3 rounded-md mb-4">
                            You need to add a car to your garage before logging a trip.
                        </p>
                    )}


                    <div className="space-y-4">
                        {/* Start KM */}
                        <div>
                            <label htmlFor="startKm" className="block text-sm font-medium text-gray-700 mb-1">Start Kilometer</label>
                            <input type="number" id="startKm" value={startKm} onChange={(e) => setStartKm(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 15000" />
                        </div>

                        {/* End KM */}
                        <div>
                            <label htmlFor="endKm" className="block text-sm font-medium text-gray-700 mb-1">End Kilometer</label>
                            <input type="number" id="endKm" value={endKm} onChange={(e) => setEndKm(e.target.value)}
                                className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 15100" />
                        </div>

                        {/* Parking Location */}
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Parked Location</label>
                            <div className="space-y-2">
                                {/* Radio buttons for predefined locations */}
                                {PREDEFINED_PARKING_LOCATIONS.map(loc => (
                                    <div key={loc.id} className="flex items-center">
                                        <input
                                            id={`parking-${loc.id}`} name="parkingLocationOption" type="radio"
                                            value={loc.id}
                                            checked={selectedParkingType === 'predefined' && predefinedParkingLocation === loc.id}
                                            onChange={() => { setSelectedParkingType('predefined'); setPredefinedParkingLocation(loc.id); }}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                        />
                                        <label htmlFor={`parking-${loc.id}`} className="ml-3 block text-sm text-gray-700">{loc.name}</label>
                                    </div>
                                ))}
                                {/* Radio button for custom location */}
                                <div className="flex items-center">
                                    <input
                                        id="parking-custom" name="parkingLocationOption" type="radio" value="custom"
                                        checked={selectedParkingType === 'custom'}
                                        onChange={() => setSelectedParkingType('custom')}
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                    />
                                    <label htmlFor="parking-custom" className="ml-3 block text-sm text-gray-700">Other Location:</label>
                                </div>
                                {/* Custom location text input */}
                                {selectedParkingType === 'custom' && (
                                    <input type="text" value={customParkingLocation} onChange={(e) => setCustomParkingLocation(e.target.value)}
                                        className="mt-1 shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter address or location name" />
                                )}
                            </div>
                        </div>
                        
                        {/* Map Placeholder - this is where you'd integrate a map component */}
                        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-md text-center text-gray-500">
                            Map Display for Parking Locations (Future Enhancement)
                            <p className="text-xs">(For now, select from options above or enter custom text)</p>
                        </div>


                        {/* Notes */}
                        <div>
                            <label htmlFor="tripNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                            <textarea id="tripNotes" value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} rows={3}
                                    className="shadow-sm block w-full border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Any notes about the trip, e.g., purpose, issues..."></textarea>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button onClick={handleLogTrip} disabled={logTripLoading || !selectedCarRegistration || !cars || cars.length === 0}
                                    className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center 
                                                ${(logTripLoading || !selectedCarRegistration || !cars || cars.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {logTripLoading && <svg className="animate-spin h-5 w-5 mr-3 text-white" /* SVG Spinner */><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                {logTripLoading ? 'Logging Trip...' : 'Log This Trip'}
                            </button>
                        </div>
                    </div>

                    {logTripError && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{logTripError}</div>}
                    {logTripSuccess && <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">Trip logged successfully!</div>}
                </div>
            )}

            {/* Car Calendar Panel */}

            {/* Car History Panel */}


            {/* User Details Panel */}
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-200 shadow-lg border-1 border-gray-400/10 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">User Details</h2>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>First Name:</strong> {user?.first_name}</p>
                <p><strong>Last Name:</strong> {user?.last_name}</p>
            </div>
        </div>
    );
}