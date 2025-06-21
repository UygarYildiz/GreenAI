import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { SecurityService } from '../services/securityService';
import { logger } from '../utils/logger';

// ==================== SECURITY HEADERS ====================

/**
 * Güvenlik header'larını ayarla
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.greenai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"]
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 yıl
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// ==================== CORS CONFIGURATION ====================

/**
 * CORS konfigürasyonu
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://greenai.com',
      'https://www.greenai.com',
      'https://app.greenai.com'
    ];
    
    // Development ortamında localhost'a izin ver
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 saat
});

// ==================== RATE LIMITING ====================

/**
 * Genel rate limiting
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // IP başına maksimum istek
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Authentication endpoint'leri için sıkı rate limiting
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // IP başına maksimum 5 deneme
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  }
});

/**
 * API endpoint'leri için rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 100, // IP başına maksimum 100 istek
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '1 minute'
  }
});

// ==================== INPUT VALIDATION ====================

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Body, query ve params'ları sanitize et
    if (req.body) {
      req.body = SecurityService.sanitizeInput(req.body);
    }
    
    if (req.query) {
      req.query = SecurityService.sanitizeInput(req.query);
    }
    
    if (req.params) {
      req.params = SecurityService.sanitizeInput(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization failed:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input format'
    });
  }
};

/**
 * File upload güvenlik kontrolü
 */
export const secureFileUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file];
    
    for (const file of files) {
      if (file) {
        const scanResult = await SecurityService.scanUploadedFile(file);
        
        if (!scanResult.safe) {
          return res.status(400).json({
            success: false,
            error: 'File security check failed',
            threats: scanResult.threats
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('File security check failed:', error);
    res.status(500).json({
      success: false,
      error: 'File security check failed'
    });
  }
};

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * JWT token doğrulama
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }
    
    // Token'ı doğrula
    const decoded = SecurityService.verifyToken(token, 'access');
    
    // Kullanıcı bilgilerini req'e ekle
    req.user = decoded;
    
    // Aktiviteyi logla
    await SecurityService.logSecurityEvent({
      userId: decoded.userId,
      activity: 'api_access',
      metadata: {
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      severity: 'low',
      timestamp: new Date()
    });
    
    next();
  } catch (error) {
    logger.warn('Token authentication failed:', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Role-based authorization
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (!allowedRoles.includes(user.role)) {
        // Yetkisiz erişim denemesini logla
        SecurityService.logSecurityEvent({
          userId: user.userId,
          activity: 'unauthorized_access_attempt',
          metadata: {
            requiredRoles: allowedRoles,
            userRole: user.role,
            path: req.path,
            ipAddress: req.ip
          },
          severity: 'medium',
          timestamp: new Date()
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Role authorization failed:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

// ==================== SECURITY MONITORING ====================

/**
 * Şüpheli aktivite tespiti
 */
export const detectSuspiciousActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const activity = `${req.method}_${req.path}`;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date()
    };
    
    if (userId) {
      const isSuspicious = await SecurityService.detectSuspiciousActivity(
        userId,
        activity,
        metadata
      );
      
      if (isSuspicious) {
        // Şüpheli aktivite tespit edildi, ek güvenlik önlemleri al
        logger.warn('Suspicious activity detected', {
          userId,
          activity,
          metadata
        });
        
        // Kritik durumlarda isteği blokla
        const criticalActivities = [
          'bulk_data_download',
          'privilege_escalation_attempt',
          'suspicious_file_upload'
        ];
        
        if (criticalActivities.includes(activity)) {
          return res.status(403).json({
            success: false,
            error: 'Suspicious activity detected. Access temporarily restricted.'
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Suspicious activity detection failed:', error);
    next(); // Güvenlik kontrolü başarısız olsa bile isteği devam ettir
  }
};

// ==================== ERROR HANDLING ====================

/**
 * Güvenlik hata handler'ı
 */
export const securityErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Güvenlik hatalarını logla
  logger.error('Security error:', {
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    path: req.path,
    userAgent: req.get('User-Agent')
  });
  
  // Hassas bilgileri gizle
  const safeError = process.env.NODE_ENV === 'production' 
    ? 'Security error occurred'
    : error.message;
  
  res.status(500).json({
    success: false,
    error: safeError
  });
};

// ==================== SECURITY AUDIT ====================

/**
 * API çağrılarını audit için logla
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Response'u intercept et
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Audit log kaydet
    logger.info('API Audit', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};
