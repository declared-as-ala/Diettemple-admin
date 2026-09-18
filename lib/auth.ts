import Cookies from 'js-cookie';
import { api } from './api';

export interface AdminUser {
  _id: string;
  email?: string;
  phone?: string;
  name?: string;
  role: 'admin' | 'employee' | 'user';
}

export const auth = {
  login: async (emailOrPhone: string, password: string): Promise<{ user: AdminUser; token: string }> => {
    const response = await api.login(emailOrPhone, password);
    
    // Check if user is admin or employee
    if (response.user.role !== 'admin' && response.user.role !== 'employee') {
      throw new Error('Accès réservé aux administrateurs et employés');
    }

    // Store token with explicit path and sameSite
    Cookies.set('admin_token', response.token, {
      expires: 7,
      path: '/',
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_user', JSON.stringify(response.user));
      } catch {}
    }

    return response;
  },

  logout: () => {
    Cookies.remove('admin_token', { path: '/' });
    Cookies.remove('admin_token');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('admin_user');
      } catch {}
      window.location.href = '/admin/login';
    }
  },

  getToken: (): string | undefined => {
    return Cookies.get('admin_token');
  },

  getUser: (): AdminUser | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('admin_user');
      if (stored) return JSON.parse(stored);
      const token = Cookies.get('admin_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.userId || payload.role) {
          return {
            _id: payload.userId || '',
            name: payload.name,
            role: payload.role,
          };
        }
      }
    } catch {}
    return null;
  },

  isAuthenticated: (): boolean => {
    return !!Cookies.get('admin_token');
  },
};
