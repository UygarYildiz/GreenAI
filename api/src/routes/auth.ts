import { Router } from 'express';
import { body, query } from 'express-validator';
import { AuthService, RegisterData, LoginCredentials } from '../services/authService';
import { EmailService } from '../services/emailService';
import { authenticateToken, authRateLimit } from '../middleware/security';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();
const emailService = new EmailService();

// ==================== REGISTRATION ====================

/**
 * POST /api/auth/register
 * Kullanıcı kaydı
 */
router.post(
  '/register',
  authRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be 2-100 characters'),
    body('userType')
      .optional()
      .isIn(['farmer', 'expert'])
      .withMessage('User type must be farmer or expert'),
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location must be less than 100 characters'),
    body('expertiseAreas')
      .optional()
      .isArray()
      .withMessage('Expertise areas must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const registerData: RegisterData = req.body;

      // Kullanıcıyı kaydet
      const { user, verificationToken } = await authService.register(registerData);

      // Email doğrulama maili gönder
      await emailService.sendEmailVerification(user.email, user.fullName || user.username, verificationToken);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            userType: user.userType
          }
        }
      });

    } catch (error) {
      logger.error('Registration failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = errorMessage.includes('already exists') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Email doğrulama
 */
router.post(
  '/verify-email',
  [
    body('token')
      .isLength({ min: 32, max: 64 })
      .withMessage('Invalid verification token')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { token } = req.body;

      const user = await authService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: { user }
      });

    } catch (error) {
      logger.error('Email verification failed:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      });
    }
  }
);

/**
 * POST /api/auth/resend-verification
 * Email doğrulama mailini tekrar gönder
 */
router.post(
  '/resend-verification',
  authRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Kullanıcıyı bul
      const user = await authService.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Yeni doğrulama token'ı oluştur ve gönder
      const verificationToken = await authService.generateEmailVerificationToken(user.id);
      await emailService.sendEmailVerification(user.email, user.fullName || user.username, verificationToken);

      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      logger.error('Resend verification failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }
  }
);

// ==================== LOGIN ====================

/**
 * POST /api/auth/login
 * Kullanıcı girişi
 */
router.post(
  '/login',
  authRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const credentials: LoginCredentials = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || '';

      const result = await authService.login(credentials, ipAddress, userAgent);

      if (result.requiresTwoFactor) {
        res.json({
          success: true,
          requiresTwoFactor: true,
          tempToken: result.tempToken,
          message: 'Two-factor authentication required'
        });
      } else {
        // Refresh token'ı httpOnly cookie olarak ayarla
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: credentials.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 30 gün veya 7 gün
        });

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: result.user,
            accessToken: result.tokens.accessToken
          }
        });
      }

    } catch (error) {
      logger.error('Login failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const statusCode = errorMessage.includes('Too many') ? 429 : 401;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * POST /api/auth/verify-2fa
 * 2FA doğrulama
 */
router.post(
  '/verify-2fa',
  authRateLimit,
  [
    body('tempToken')
      .notEmpty()
      .withMessage('Temporary token is required'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('2FA code must be 6 digits')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { tempToken, code } = req.body;
      const ipAddress = req.ip;

      const result = await authService.verifyTwoFactor(tempToken, code, ipAddress);

      // Refresh token'ı cookie olarak ayarla
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
      });

      res.json({
        success: true,
        message: 'Two-factor authentication successful',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken
        }
      });

    } catch (error) {
      logger.error('2FA verification failed:', error);
      
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : '2FA verification failed'
      });
    }
  }
);

// ==================== TOKEN MANAGEMENT ====================

/**
 * POST /api/auth/refresh
 * Access token yenileme
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    // Yeni refresh token'ı cookie olarak ayarla
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    logger.error('Token refresh failed:', error);
    
    // Geçersiz refresh token'ı temizle
    res.clearCookie('refreshToken');
    
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Kullanıcı çıkışı
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const userId = req.user!.userId;

    // Refresh token'ı deaktive et
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    // Access token'ı blacklist'e ekle
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (accessToken) {
      await authService.blacklistAccessToken(accessToken);
    }

    // Cookie'yi temizle
    res.clearCookie('refreshToken');

    // Güvenlik olayını logla
    await SecurityService.logSecurityEvent({
      userId,
      activity: 'user_logout',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      severity: 'low',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ==================== USER PROFILE ====================

/**
 * GET /api/auth/me
 * Mevcut kullanıcı bilgilerini getir
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('Get current user failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Kullanıcı profili güncelleme
 */
router.put(
  '/profile',
  authenticateToken,
  [
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be 2-100 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location must be less than 100 characters'),
    body('expertiseAreas')
      .optional()
      .isArray()
      .withMessage('Expertise areas must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;

      const updatedUser = await authService.updateUserProfile(userId, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Profile update failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

// ==================== PASSWORD MANAGEMENT ====================

/**
 * POST /api/auth/forgot-password
 * Şifre sıfırlama isteği
 */
router.post(
  '/forgot-password',
  authRateLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { email } = req.body;

      await authService.initiatePasswordReset(email);

      // Güvenlik için her zaman başarılı mesaj döndür
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

    } catch (error) {
      logger.error('Password reset initiation failed:', error);
      
      // Güvenlik için hata detayını gösterme
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Şifre sıfırlama
 */
router.post(
  '/reset-password',
  authRateLimit,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (error) {
      logger.error('Password reset failed:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      });
    }
  }
);

export default router;
