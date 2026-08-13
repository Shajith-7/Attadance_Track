// In production, the frontend and backend are on the same domain (Vercel)
// In development, the Vite dev server runs on a different port than Express
const isProd = import.meta.env.MODE === 'production';

export const API_URL = isProd ? '/api' : 'http://localhost:5000/api';
export const BASE_URL = isProd ? '' : 'http://localhost:5000';
