import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';

export class SecurityService {

  // ==================== ENCRYPTION SERVICES ====================

  /**
   * Hassas verileri şifrele (AES-256-GCM)
   */
  static encryptSensitiveData(data: string): { encrypted: string; iv: string; tag: string } {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('GreenAI-Forum', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Şifrelenmiş veriyi çöz
   */
  static decryptSensitiveData(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('GreenAI-Forum', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Şifre hash'leme (bcrypt)
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Şifre doğrulama
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // ==================== AUTHENTICATION SERVICES ====================

  /**
   * JWT token oluştur
   */
  static generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
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
   * Token doğrulama
   */
  static verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
    const secret = type === 'access' ? process.env.JWT_SECRET! : process.env.JWT_REFRESH_SECRET!;
    
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // ==================== RATE LIMITING ====================

  /**
   * Rate limiting kontrolü
   */
  static async checkRateLimit(
    identifier: string,
    windowMs: number = 15 * 60 * 1000, // 15 dakika
    maxRequests: number = 100
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Eski kayıtları temizle
    await redis.zremrangebyscore(key, 0, windowStart);

    // Mevcut istek sayısını al
    const requestCount = await redis.zcard(key);

    if (requestCount >= maxRequests) {
      const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestRequest.length > 0 ? parseInt(oldestRequest[1]) + windowMs : now + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }

    // Yeni isteği kaydet
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(windowMs / 1000));

    return {
      allowed: true,
      remaining: maxRequests - requestCount - 1,
      resetTime: now + windowMs
    };
  }

  // ==================== INPUT VALIDATION ====================

  /**
   * SQL injection koruması
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Tehlikeli karakterleri temizle
      return input
        .replace(/['"\\;]/g, '') // SQL injection karakterleri
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // XSS script tagları
        .replace(/javascript:/gi, '') // JavaScript protokolü
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * XSS koruması
   */
  static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // ==================== SECURITY MONITORING ====================

  /**
   * Şüpheli aktivite tespiti
   */
  static async detectSuspiciousActivity(
    userId: string,
    activity: string,
    metadata: any
  ): Promise<boolean> {
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_data_access',
      'privilege_escalation_attempt',
      'bulk_data_download',
      'suspicious_file_upload'
    ];

    // Aktivite geçmişini kontrol et
    const recentActivities = await this.getRecentActivities(userId, '1h');
    
    // Anomali tespiti
    const isAnomaly = await this.detectAnomaly(userId, activity, recentActivities);
    
    if (isAnomaly) {
      await this.logSecurityEvent({
        userId,
        activity,
        metadata,
        severity: 'medium',
        timestamp: new Date()
      });

      // Kritik aktiviteler için anında uyarı
      if (suspiciousPatterns.includes(activity)) {
        await this.alertSecurityTeam({
          userId,
          activity,
          metadata,
          severity: 'high'
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Güvenlik olayı loglama
   */
  static async logSecurityEvent(event: {
    userId?: string;
    activity: string;
    metadata: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        user_id: event.userId,
        activity: event.activity,
        metadata: event.metadata,
        severity: event.severity,
        ip_address: event.metadata.ipAddress,
        user_agent: event.metadata.userAgent,
        created_at: event.timestamp.toISOString()
      });

      // Kritik olayları ayrıca logla
      if (event.severity === 'critical') {
        logger.error('Critical security event', event);
      }

    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  // ==================== CONTENT SECURITY ====================

  /**
   * Dosya güvenlik taraması
   */
  static async scanUploadedFile(file: Express.Multer.File): Promise<{
    safe: boolean;
    threats: string[];
    fileType: string;
  }> {
    const threats: string[] = [];
    
    // Dosya türü kontrolü
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      threats.push('Unsupported file type');
    }

    // Dosya boyutu kontrolü
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      threats.push('File too large');
    }

    // Dosya içeriği taraması
    const content = file.buffer.toString();
    
    // Malicious script tespiti
    if (/<script[^>]*>.*?<\/script>/gi.test(content)) {
      threats.push('Malicious script detected');
    }

    // Executable dosya tespiti
    if (content.includes('MZ') || content.includes('#!/bin/')) {
      threats.push('Executable file detected');
    }

    return {
      safe: threats.length === 0,
      threats,
      fileType: file.mimetype
    };
  }

  // ==================== HELPER METHODS ====================

  private static async getRecentActivities(userId: string, timeWindow: string): Promise<any[]> {
    // Son aktiviteleri getir
    const { data } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - this.parseTimeWindow(timeWindow)).toISOString())
      .order('created_at', { ascending: false });

    return data || [];
  }

  private static async detectAnomaly(userId: string, activity: string, recentActivities: any[]): Promise<boolean> {
    // Basit anomali tespiti
    const activityCount = recentActivities.filter(a => a.activity === activity).length;
    
    // Aynı aktiviteden 10'dan fazla varsa anomali
    return activityCount > 10;
  }

  private static async alertSecurityTeam(alert: any): Promise<void> {
    // Güvenlik ekibini bilgilendir
    logger.warn('Security alert', alert);
    
    // Email/SMS bildirimi gönder
    // Bu kısım notification service ile entegre edilecek
  }

  private static parseTimeWindow(timeWindow: string): number {
    const unit = timeWindow.slice(-1);
    const value = parseInt(timeWindow.slice(0, -1));
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return 60 * 60 * 1000; // 1 saat default
    }
  }
}
