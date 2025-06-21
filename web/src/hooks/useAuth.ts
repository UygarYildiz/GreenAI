'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  expertiseAreas: string[];
  userType: 'farmer' | 'expert' | 'moderator' | 'admin';
  reputationScore: number;
  isVerified: boolean;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
  userType?: 'farmer' | 'expert';
  location?: string;
  expertiseAreas?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyTwoFactor: (tempToken: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const isAuthenticated = !!user && !!accessToken;

  // API çağrıları için helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/auth${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken && !endpoint.includes('/refresh')) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Cookie'ler için
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }, [accessToken]);

  // Token'ı localStorage'dan yükle
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setAccessToken(token);
    }
    setIsLoading(false);
  }, []);

  // Kullanıcı bilgilerini yükle
  const loadUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await apiCall('/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Token geçersizse temizle
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
    }
  }, [accessToken, apiCall]);

  // Access token değiştiğinde kullanıcıyı yükle
  useEffect(() => {
    if (accessToken) {
      loadUser();
    }
  }, [accessToken, loadUser]);

  // Token yenileme
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const newToken = data.data.accessToken;
        
        localStorage.setItem('accessToken', newToken);
        setAccessToken(newToken);
        
        return newToken;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  // Otomatik token yenileme
  useEffect(() => {
    if (!accessToken) return;

    // Token'ın süresini kontrol et (JWT decode etmeden basit kontrol)
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiryTime = tokenPayload.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;

    // Token 2 dakika içinde sona erecekse yenile
    if (timeUntilExpiry < 2 * 60 * 1000) {
      refreshToken().catch(() => {
        // Token yenileme başarısız olursa logout
        logout();
      });
    } else {
      // Token süresi dolmadan 1 dakika önce yenile
      const refreshTimeout = setTimeout(() => {
        refreshToken().catch(() => logout());
      }, timeUntilExpiry - 60 * 1000);

      return () => clearTimeout(refreshTimeout);
    }
  }, [accessToken, refreshToken]);

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.requiresTwoFactor) {
        return {
          requiresTwoFactor: true,
          tempToken: response.tempToken,
        };
      }

      const token = response.data.accessToken;
      localStorage.setItem('accessToken', token);
      setAccessToken(token);
      setUser(response.data.user);

      toast({
        title: 'Giriş Başarılı',
        description: 'Hoş geldiniz!',
      });

      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş başarısız';
      toast({
        title: 'Giriş Hatası',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // Register
  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Kayıt Başarılı',
        description: 'Email adresinizi kontrol ederek hesabınızı doğrulayın.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız';
      toast({
        title: 'Kayıt Hatası',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await apiCall('/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
      
      toast({
        title: 'Çıkış Yapıldı',
        description: 'Güvenli bir şekilde çıkış yaptınız.',
      });
      
      router.push('/');
    }
  }, [accessToken, apiCall, router, toast]);

  // Email doğrulama
  const verifyEmail = useCallback(async (token: string) => {
    try {
      await apiCall('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      toast({
        title: 'Email Doğrulandı',
        description: 'Email adresiniz başarıyla doğrulandı.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email doğrulama başarısız';
      toast({
        title: 'Doğrulama Hatası',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [apiCall, toast]);

  // Email doğrulama tekrar gönder
  const resendVerification = useCallback(async (email: string) => {
    try {
      await apiCall('/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      toast({
        title: 'Doğrulama Maili Gönderildi',
        description: 'Email adresinizi kontrol edin.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mail gönderme başarısız';
      toast({
        title: 'Hata',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [apiCall, toast]);

  // 2FA doğrulama
  const verifyTwoFactor = useCallback(async (tempToken: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await apiCall('/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code }),
      });

      const token = response.data.accessToken;
      localStorage.setItem('accessToken', token);
      setAccessToken(token);
      setUser(response.data.user);

      toast({
        title: 'Giriş Başarılı',
        description: '2FA doğrulaması tamamlandı.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '2FA doğrulama başarısız';
      toast({
        title: '2FA Hatası',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // Şifre sıfırlama isteği
  const forgotPassword = useCallback(async (email: string) => {
    try {
      await apiCall('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      toast({
        title: 'Şifre Sıfırlama',
        description: 'Şifre sıfırlama bağlantısı email adresinize gönderildi.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem başarısız';
      toast({
        title: 'Hata',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [apiCall, toast]);

  // Şifre sıfırlama
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      await apiCall('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      toast({
        title: 'Şifre Güncellendi',
        description: 'Şifreniz başarıyla güncellendi.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şifre güncelleme başarısız';
      toast({
        title: 'Hata',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [apiCall, toast]);

  // Profil güncelleme
  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const response = await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      setUser(response.data.user);

      toast({
        title: 'Profil Güncellendi',
        description: 'Profil bilgileriniz başarıyla güncellendi.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profil güncelleme başarısız';
      toast({
        title: 'Hata',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [apiCall, toast]);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    verifyTwoFactor,
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshToken,
  };
}

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
