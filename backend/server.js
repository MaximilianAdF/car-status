// backend/server.js (Modified)
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
// require('dotenv').config(); // Not needed on Vercel; use Vercel env vars

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const carsRoutes = require('./routes/car'); // Defines /cars, /add-car, /remove-car

const app = express();

// Important for running behind Vercel's proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  // VERCEL_URL is the deployment's URL (e.g., car-status.vercel.app or a preview URL)
  // For production, explicitly use your main frontend URL.
  // For local dev, use your Vite dev server URL.
  origin: process.env.VERCEL_ENV === 'production'
            ? `https://car-status.vercel.app` // Your main production frontend URL
            : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
// Since vercel.json will route /api/(.*) to this serverless function,
// the paths defined by your routers will effectively be prefixed with /api.
// For example, if authRoutes defines /login, it becomes /api/auth/login.
// If carsRoutes defines /cars, it becomes /api/cars.
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use(carsRoutes); // Mounts /cars, /add-car, /remove-car directly.
                     // So they become /api/cars, /api/add-car, /api/remove-car respectively.

// DO NOT call app.listen() here if this file is directly used by Vercel Serverless.
// Vercel handles the server lifecycle.
// If you need to run this file locally for backend dev, conditionally call listen:
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.BACKEND_PORT || 8080; // Use a different port than Vite locally
  app.listen(PORT, () => {
    console.log(`Backend server running locally for dev on PORT ${PORT}`);
  });
}

module.exports = app; // Export the app for Vercel