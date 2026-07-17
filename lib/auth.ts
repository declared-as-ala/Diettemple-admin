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

    // Store token
    Cookies.set('admin_token', response.token, { expires: 7 }); // 7 days

    return response;
  },

  logout: () => {
    Cookies.remove('admin_token');
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  },

  getToken: (): string | undefined => {
    return Cookies.get('admin_token');
  },

  isAuthenticated: (): boolean => {
    return !!Cookies.get('admin_token');
  },
};
