// src/config.ts
const API_BASE_URL: string = import.meta.env.DEV
  ? "http://localhost:8080" // Your local backend port for 'npm run dev'
  : ""; // For production on Vercel, API calls will be relative (e.g., '/api/auth/login')

export default API_BASE_URL;
