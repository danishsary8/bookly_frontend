import api from '../api/axios';
import type {
    AuthAdminLoginResponse,
    AuthUserResponse,
    BasicMessageResponse,
    ForgotPasswordResponse,
    LoginCredentials,
    RegisterData,
    RegisterResponse
} from '../types/auth.types';
import Cookies from 'js-cookie';

const notifyAuthChanged = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-changed'));
    }
};

const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthUserResponse> => {
        const response = await api.post<AuthUserResponse>('/customers/login', credentials);
        if (response.data.token) {
            Cookies.set('token', response.data.token, { expires: 7 }); // Expires in 7 days
            notifyAuthChanged();
        }
        return response.data;
    },

    register: async (userData: RegisterData): Promise<RegisterResponse> => {
        const response = await api.post<RegisterResponse>('/customers/register', userData);
        return response.data;
    },

    logout: () => {
        Cookies.remove('token');
        localStorage.removeItem('admin');
        notifyAuthChanged();
    },

    getCurrentUser: async () => {
        const response = await api.get('/customers');
        return response.data;
    },

    adminLogin: async (credentials: LoginCredentials): Promise<AuthAdminLoginResponse> => {
        const response = await api.post<AuthAdminLoginResponse>('/admin/login', credentials);
        if (response.data.token) {
            Cookies.set('token', response.data.token, { expires: 7 }); // Expires in 7 days
            if (response.data.admin) {
                localStorage.setItem('admin', JSON.stringify(response.data.admin));
            }
            notifyAuthChanged();
        }
        return response.data;
    },

    getStoredAdmin: () => {
        const admin = localStorage.getItem('admin');
        return admin ? JSON.parse(admin) : null;
    },

    forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
        const response = await api.post<ForgotPasswordResponse>('/customers/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token: string, newPassword: string): Promise<BasicMessageResponse> => {
        const response = await api.post<BasicMessageResponse>('/customers/reset-password', {
            token,
            new_password: newPassword
        });
        return response.data;
    },
};

export default authService;
