import axios from 'axios';
import Cookies from 'js-cookie';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                Cookies.remove('token');
                // Optional: redirect to login or show modal
            }

            // Global error message handling
            const message = error.response.data?.message || error.response.statusText || 'Something went wrong';
            console.error(`[API Error]: ${message} (Status: ${error.response.status})`);
        } else if (error.request) {
            console.error('[API Error]: No response from server');
        } else {
            console.error('[API Error]:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
