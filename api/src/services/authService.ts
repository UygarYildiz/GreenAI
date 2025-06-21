import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { SecurityService } from './securityService';
import { EmailService } from './emailService';

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

export interface AuthResult {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export class AuthService {

  // ==================== REGISTRATION ====================

  /**
   * Kullanıcı kaydı
   */
  async register(registerData: RegisterData): Promise<{ user: User; verificationToken: string }> {
    try {
      // Email ve username benzersizlik kontrolü
      await this.checkEmailAndUsernameUniqueness(registerData.email, registerData.username);

      // Şifre güçlülük kontrolü
      this.validatePasswordStrength(registerData.password);

      // Şifreyi hash'le
      const passwordHash = await SecurityService.hashPassword(registerData.password);

      // Email doğrulama token'ı oluştur
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

      // Kullanıcıyı veritabanına kaydet
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: registerData.email.toLowerCase(),
          username: registerData.username.toLowerCase(),
          password_hash: passwordHash,
          full_name: registerData.fullName,
          user_type: registerData.userType || 'farmer',
          location: registerData.location,
          expertise_areas: registerData.expertiseAreas || [],
          email_verification_token: verificationToken,
          email_verification_expires: verificationExpiry.toISOString(),
          is_active: true,
          email_verified: false,
          two_factor_enabled: false,
          reputation_score: 0
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      // Güvenlik olayını logla
      await SecurityService.logSecurityEvent({
        userId: user.id,
        activity: 'user_registration',
        metadata: {
          email: registerData.email,
          userType: registerData.userType,
          location: registerData.location
        },
        severity: 'low',
        timestamp: new Date()
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: registerData.email,
        userType: registerData.userType
      });

      return { user: this.sanitizeUser(user), verificationToken };

    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Email doğrulama
   */
  async verifyEmail(token: string): Promise<User> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email_verification_token', token)
        .gt('email_verification_expires', new Date().toISOString())
        .single();

      if (error || !user) {
        throw new Error('Invalid or expired verification token');
      }

      // Email'i doğrulanmış olarak işaretle
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to verify email');
      }

      // Güvenlik olayını logla
      await SecurityService.logSecurityEvent({
        userId: user.id,
        activity: 'email_verification',
        metadata: { email: user.email },
        severity: 'low',
        timestamp: new Date()
      });

      logger.info('Email verified successfully', { userId: user.id, email: user.email });

      return this.sanitizeUser(updatedUser);

    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  // ==================== LOGIN ====================

  /**
   * Kullanıcı girişi
   */
  async login(credentials: LoginCredentials, ipAddress: string, userAgent: string): Promise<AuthResult> {
    try {
      // Rate limiting kontrolü
      await this.checkLoginRateLimit(credentials.email, ipAddress);

      // Kullanıcıyı bul
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error || !user) {
        await this.logFailedLoginAttempt(credentials.email, ipAddress, userAgent);
        throw new Error('Invalid email or password');
      }

      // Şifre doğrulama
      const isPasswordValid = await SecurityService.verifyPassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        await this.logFailedLoginAttempt(credentials.email, ipAddress, userAgent);
        throw new Error('Invalid email or password');
      }

      // Email doğrulama kontrolü
      if (!user.email_verified) {
        throw new Error('Please verify your email before logging in');
      }

      // 2FA kontrolü
      if (user.two_factor_enabled) {
        const tempToken = this.generateTempToken(user.id);
        await this.storeTempToken(user.id, tempToken);
        
        return {
          user: this.sanitizeUser(user),
          tokens: { accessToken: '', refreshToken: '' },
          requiresTwoFactor: true,
          tempToken
        };
      }

      // Token'ları oluştur
      const tokens = this.generateTokens(user);

      // Refresh token'ı veritabanına kaydet
      await this.storeRefreshToken(user.id, tokens.refreshToken, credentials.rememberMe);

      // Son giriş zamanını güncelle
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Başarılı giriş olayını logla
      await SecurityService.logSecurityEvent({
        userId: user.id,
        activity: 'successful_login',
        metadata: {
          ipAddress,
          userAgent,
          rememberMe: credentials.rememberMe
        },
        severity: 'low',
        timestamp: new Date()
      });

      // Başarısız giriş denemelerini temizle
      await this.clearFailedLoginAttempts(credentials.email, ipAddress);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: credentials.email,
        ipAddress
      });

      return {
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * 2FA doğrulama
   */
  async verifyTwoFactor(tempToken: string, code: string, ipAddress: string): Promise<AuthResult> {
    try {
      // Temp token'ı doğrula
      const userId = await this.validateTempToken(tempToken);
      if (!userId) {
        throw new Error('Invalid or expired temporary token');
      }

      // Kullanıcıyı getir
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // 2FA kodu doğrula
      const isCodeValid = await this.validateTwoFactorCode(userId, code);
      if (!isCodeValid) {
        throw new Error('Invalid 2FA code');
      }

      // Token'ları oluştur
      const tokens = this.generateTokens(user);

      // Refresh token'ı kaydet
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Temp token'ı sil
      await this.deleteTempToken(tempToken);

      // Son giriş zamanını güncelle
      await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Güvenlik olayını logla
      await SecurityService.logSecurityEvent({
        userId: user.id,
        activity: 'two_factor_login',
        metadata: { ipAddress },
        severity: 'low',
        timestamp: new Date()
      });

      return {
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      logger.error('2FA verification failed:', error);
      throw error;
    }
  }

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * JWT token'ları oluştur
   */
  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.userType,
      permissions: this.getUserPermissions(user),
      isVerified: user.isVerified
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '15m',
      issuer: 'greenai-forum',
      audience: 'greenai-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh token ile yeni access token al
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Refresh token'ı doğrula
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Token'ın veritabanında olup olmadığını kontrol et
      const { data: tokenRecord, error } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('user_id', decoded.userId)
        .eq('token_hash', this.hashToken(refreshToken))
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Kullanıcıyı getir
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        throw new Error('User not found or inactive');
      }

      // Yeni token'ları oluştur
      const newTokens = this.generateTokens(user);

      // Eski refresh token'ı deaktive et
      await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('id', tokenRecord.id);

      // Yeni refresh token'ı kaydet
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      return newTokens;

    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  // ==================== HELPER METHODS ====================

  private async checkEmailAndUsernameUniqueness(email: string, username: string): Promise<void> {
    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email.toLowerCase()},username.eq.${username.toLowerCase()}`);

    if (error) {
      throw new Error('Database error during uniqueness check');
    }

    if (existingUsers && existingUsers.length > 0) {
      const emailExists = existingUsers.some(u => u.email === email.toLowerCase());
      const usernameExists = existingUsers.some(u => u.username === username.toLowerCase());

      if (emailExists) {
        throw new Error('Email already exists');
      }
      if (usernameExists) {
        throw new Error('Username already exists');
      }
    }
  }

  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      throw new Error('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private sanitizeUser(user: any): User {
    const { password_hash, email_verification_token, two_factor_secret, ...sanitized } = user;
    return {
      ...sanitized,
      expertiseAreas: sanitized.expertise_areas || [],
      userType: sanitized.user_type,
      reputationScore: sanitized.reputation_score,
      isVerified: sanitized.is_verified,
      isActive: sanitized.is_active,
      emailVerified: sanitized.email_verified,
      twoFactorEnabled: sanitized.two_factor_enabled,
      lastLoginAt: sanitized.last_login_at,
      createdAt: sanitized.created_at,
      updatedAt: sanitized.updated_at
    };
  }

  private getUserPermissions(user: User): string[] {
    const basePermissions = ['read'];
    
    switch (user.userType) {
      case 'admin':
        return [...basePermissions, 'write', 'delete', 'admin', 'moderate'];
      case 'moderator':
        return [...basePermissions, 'write', 'moderate'];
      case 'expert':
        return [...basePermissions, 'write', 'expert_answer'];
      default:
        return [...basePermissions, 'write'];
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateTempToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'temp' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    );
  }

  private async storeRefreshToken(userId: string, refreshToken: string, rememberMe: boolean = false): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7)); // 30 gün veya 7 gün

    await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: expiresAt.toISOString(),
        is_active: true
      });
  }

  private async checkLoginRateLimit(email: string, ipAddress: string): Promise<void> {
    const emailKey = `login_attempts:email:${email}`;
    const ipKey = `login_attempts:ip:${ipAddress}`;

    const [emailAttempts, ipAttempts] = await Promise.all([
      redis.get(emailKey),
      redis.get(ipKey)
    ]);

    if (emailAttempts && parseInt(emailAttempts) >= 5) {
      throw new Error('Too many login attempts for this email. Please try again later.');
    }

    if (ipAttempts && parseInt(ipAttempts) >= 10) {
      throw new Error('Too many login attempts from this IP. Please try again later.');
    }
  }

  private async logFailedLoginAttempt(email: string, ipAddress: string, userAgent: string): Promise<void> {
    // Redis'te sayaçları artır
    const emailKey = `login_attempts:email:${email}`;
    const ipKey = `login_attempts:ip:${ipAddress}`;

    await Promise.all([
      redis.incr(emailKey),
      redis.expire(emailKey, 900), // 15 dakika
      redis.incr(ipKey),
      redis.expire(ipKey, 900)
    ]);

    // Veritabanına kaydet
    await supabase
      .from('failed_login_attempts')
      .insert({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        attempt_count: 1,
        last_attempt: new Date().toISOString()
      });

    // Güvenlik olayını logla
    await SecurityService.logSecurityEvent({
      activity: 'failed_login_attempt',
      metadata: { email, ipAddress, userAgent },
      severity: 'medium',
      timestamp: new Date()
    });
  }

  private async clearFailedLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const emailKey = `login_attempts:email:${email}`;
    const ipKey = `login_attempts:ip:${ipAddress}`;

    await Promise.all([
      redis.del(emailKey),
      redis.del(ipKey)
    ]);
  }

  private async storeTempToken(userId: string, tempToken: string): Promise<void> {
    await redis.setex(`temp_token:${tempToken}`, 600, userId); // 10 dakika
  }

  private async validateTempToken(tempToken: string): Promise<string | null> {
    return await redis.get(`temp_token:${tempToken}`);
  }

  private async deleteTempToken(tempToken: string): Promise<void> {
    await redis.del(`temp_token:${tempToken}`);
  }

  private async validateTwoFactorCode(userId: string, code: string): Promise<boolean> {
    // Bu kısım 2FA implementasyonuna göre değişecek
    // TOTP, SMS veya email kodu doğrulama
    return true; // Placeholder
  }

  // ==================== ADDITIONAL METHODS ====================

  /**
   * Email ile kullanıcı getir
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Failed to get user by email:', error);
      return null;
    }
  }

  /**
   * ID ile kullanıcı getir
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      return null;
    }
  }

  /**
   * Email doğrulama token'ı oluştur
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

      const { error } = await supabase
        .from('users')
        .update({
          email_verification_token: verificationToken,
          email_verification_expires: verificationExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      return verificationToken;
    } catch (error) {
      logger.error('Failed to generate email verification token:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı profili güncelle
   */
  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          full_name: updateData.fullName,
          bio: updateData.bio,
          location: updateData.location,
          expertise_areas: updateData.expertiseAreas,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Şifre sıfırlama başlat
   */
  async initiatePasswordReset(email: string): Promise<void> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        // Güvenlik için kullanıcı bulunamasa bile başarılı mesaj döndür
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

      const { error } = await supabase
        .from('users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: resetExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Email gönder (EmailService ile)
      // await emailService.sendPasswordReset(user.email, user.fullName || user.username, resetToken);

      logger.info('Password reset initiated', { userId: user.id, email });
    } catch (error) {
      logger.error('Failed to initiate password reset:', error);
      throw error;
    }
  }

  /**
   * Şifre sıfırla
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Token'ı doğrula
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('password_reset_token', token)
        .gt('password_reset_expires', new Date().toISOString())
        .single();

      if (error || !user) {
        throw new Error('Invalid or expired reset token');
      }

      // Şifre güçlülük kontrolü
      this.validatePasswordStrength(newPassword);

      // Yeni şifreyi hash'le
      const passwordHash = await SecurityService.hashPassword(newPassword);

      // Şifreyi güncelle ve token'ı temizle
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Tüm refresh token'ları iptal et
      await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Güvenlik olayını logla
      await SecurityService.logSecurityEvent({
        userId: user.id,
        activity: 'password_reset',
        metadata: { email: user.email },
        severity: 'medium',
        timestamp: new Date()
      });

      logger.info('Password reset completed', { userId: user.id });
    } catch (error) {
      logger.error('Failed to reset password:', error);
      throw error;
    }
  }

  /**
   * Refresh token'ı iptal et
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);

      const { error } = await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('token_hash', tokenHash);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
      throw error;
    }
  }

  /**
   * Access token'ı blacklist'e ekle
   */
  async blacklistAccessToken(accessToken: string): Promise<void> {
    try {
      const decoded = jwt.decode(accessToken) as any;
      if (!decoded || !decoded.exp) return;

      const tokenHash = this.hashToken(accessToken);
      const expiresAt = new Date(decoded.exp * 1000);

      const { error } = await supabase
        .from('token_blacklist')
        .insert({
          token_hash: tokenHash,
          user_id: decoded.userId,
          reason: 'logout',
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to blacklist access token:', error);
      throw error;
    }
  }
}
