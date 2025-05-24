// /api/index.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
// No need for dotenv in Vercel serverless, environment variables are injected.

// Adjust paths if your 'routes', 'controllers', 'middleware', 'db.js' are elsewhere
// Assuming they are in the project root relative to this /api directory
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const carsRoutes = require('../routes/car'); // Contains /cars, /add-car, /remove-car etc.
// const pool = require('../db'); // Database pool is used by controllers

const app = express();

// Important for running behind Vercel's proxy and getting correct IP/protocol
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  // For same-origin, VERCEL_URL provides the deployment's URL.
  // For production, you'd want your canonical URL.
  // process.env.VERCEL_URL will be like 'your-project-git-branch.vercel.app' or 'your-project.vercel.app'
  // For the main production deployment, it should match your frontend domain.
  origin: process.env.VERCEL_ENV === 'production'
            ? `https://car-status.vercel.app` // Your main frontend URL
            : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'), // Allow Vercel previews & local dev
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
// Since vercel.json will route /api/* to this file,
// the paths here are effectively what comes after /api/
// e.g., if authRoutes has /login, it becomes /api/auth/login
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use(carsRoutes); // Mounts routes like /cars, /add-car, /remove-car directly
                     // so they become /api/cars, /api/add-car, /api/remove-car

// Optional: A root handler for /api itself
// This is handled by the file system routing if you create /api/index.js
// If this file is /api/index.js and handles ALL /api/* traffic, this next line might be redundant
// or you might define specific top-level /api routes here if not in other routers.

// Export the Express API
module.exports = app;