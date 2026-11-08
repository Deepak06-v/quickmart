import { create } from 'zustand';
import { IUser } from '../types';
import {
  saveAuthToken,
  saveStoredUser,
  getAuthToken,
  getStoredUser,
  clearAuthSession,
} from '../utils/storage';
import { api } from '../api/client';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  login: (token: string, user: IUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<IUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      const [token, storedUser] = await Promise.all([
        getAuthToken(),
        getStoredUser(),
      ]);

      if (token && storedUser) {
        set({ token, user: storedUser, isAuthenticated: true, isLoading: false });

        // Refresh user profile quietly in background
        try {
          const res = await api.get<{ success: boolean; user: IUser }>('/auth/me');
          if (res.success && res.user) {
            await saveStoredUser(res.user);
            set({ user: res.user });
          }
        } catch (err: any) {
          if (err.statusCode === 401) {
            await clearAuthSession();
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      } else {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (token: string, user: IUser) => {
    await Promise.all([saveAuthToken(token), saveStoredUser(user)]);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    await clearAuthSession();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: async (updatedFields: Partial<IUser>) => {
    const current = get().user;
    if (!current) return;
    const merged = { ...current, ...updatedFields };
    await saveStoredUser(merged);
    set({ user: merged });
  },
}));
