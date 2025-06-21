import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { SecurityService } from './securityService';

export interface SocketUser {
  id: string;
  username: string;
  userType: string;
  isVerified: boolean;
  socketId: string;
  joinedAt: Date;
  lastActivity: Date;
}

export interface NotificationData {
  id: string;
  type: 'reply' | 'like' | 'mention' | 'solution' | 'badge' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  createdAt: Date;
  isRead: boolean;
}

export interface TypingData {
  userId: string;
  username: string;
  topicId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

export class RealtimeService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private typingUsers: Map<string, Set<string>> = new Map(); // topicId -> userIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  // ==================== MIDDLEWARE ====================

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Token blacklist kontrolü
        const isBlacklisted = await this.checkTokenBlacklist(token);
        if (isBlacklisted) {
          return next(new Error('Token is blacklisted'));
        }

        socket.data.user = {
          id: decoded.userId,
          username: decoded.username,
          userType: decoded.role,
          isVerified: decoded.isVerified
        };

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      const userId = socket.data.user?.id;
      if (userId) {
        const rateLimitKey = `socket_rate_limit:${userId}`;
        const currentCount = await redis.incr(rateLimitKey);
        
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, 60); // 1 dakika
        }
        
        if (currentCount > 100) { // Dakikada 100 event
          return next(new Error('Rate limit exceeded'));
        }
      }
      next();
    });
  }

  // ==================== EVENT HANDLERS ====================

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      // User events
      socket.on('join_topic', (data) => this.handleJoinTopic(socket, data));
      socket.on('leave_topic', (data) => this.handleLeaveTopic(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      
      // Notification events
      socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data));
      socket.on('get_notifications', (data) => this.handleGetNotifications(socket, data));
      
      // Status events
      socket.on('update_status', (data) => this.handleUpdateStatus(socket, data));
      
      // Disconnect
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  // ==================== CONNECTION MANAGEMENT ====================

  private async handleConnection(socket: any) {
    try {
      const user = socket.data.user;
      if (!user) return;

      const socketUser: SocketUser = {
        id: user.id,
        username: user.username,
        userType: user.userType,
        isVerified: user.isVerified,
        socketId: socket.id,
        joinedAt: new Date(),
        lastActivity: new Date()
      };

      // Kullanıcıyı kaydet
      this.connectedUsers.set(socket.id, socketUser);
      
      // User socket mapping
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      // Online status güncelle
      await this.updateUserOnlineStatus(user.id, 'online');

      // Kullanıcıya hoş geldin mesajı
      socket.emit('connected', {
        message: 'Successfully connected to real-time service',
        onlineUsers: await this.getOnlineUsersCount()
      });

      // Okunmamış bildirimleri gönder
      const unreadNotifications = await this.getUnreadNotifications(user.id);
      if (unreadNotifications.length > 0) {
        socket.emit('unread_notifications', unreadNotifications);
      }

      logger.info('User connected to socket', { 
        userId: user.id, 
        socketId: socket.id,
        totalConnections: this.connectedUsers.size
      });

    } catch (error) {
      logger.error('Failed to handle connection:', error);
    }
  }

  private async handleDisconnection(socket: any) {
    try {
      const socketUser = this.connectedUsers.get(socket.id);
      if (!socketUser) return;

      // Kullanıcıyı kaldır
      this.connectedUsers.delete(socket.id);
      
      // User socket mapping güncelle
      const userSockets = this.userSockets.get(socketUser.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(socketUser.id);
          // Son socket kapandıysa offline yap
          await this.updateUserOnlineStatus(socketUser.id, 'offline');
        }
      }

      // Typing durumunu temizle
      this.clearUserTyping(socketUser.id);

      logger.info('User disconnected from socket', { 
        userId: socketUser.id, 
        socketId: socket.id,
        totalConnections: this.connectedUsers.size
      });

    } catch (error) {
      logger.error('Failed to handle disconnection:', error);
    }
  }

  // ==================== TOPIC EVENTS ====================

  private async handleJoinTopic(socket: any, data: { topicId: string }) {
    try {
      const user = socket.data.user;
      if (!user || !data.topicId) return;

      // Topic room'una katıl
      socket.join(`topic:${data.topicId}`);

      // Diğer kullanıcılara bildir
      socket.to(`topic:${data.topicId}`).emit('user_joined_topic', {
        userId: user.id,
        username: user.username,
        topicId: data.topicId
      });

      logger.debug('User joined topic', { userId: user.id, topicId: data.topicId });

    } catch (error) {
      logger.error('Failed to handle join topic:', error);
    }
  }

  private async handleLeaveTopic(socket: any, data: { topicId: string }) {
    try {
      const user = socket.data.user;
      if (!user || !data.topicId) return;

      // Topic room'undan ayrıl
      socket.leave(`topic:${data.topicId}`);

      // Typing durumunu temizle
      this.stopTyping(user.id, data.topicId);

      // Diğer kullanıcılara bildir
      socket.to(`topic:${data.topicId}`).emit('user_left_topic', {
        userId: user.id,
        username: user.username,
        topicId: data.topicId
      });

      logger.debug('User left topic', { userId: user.id, topicId: data.topicId });

    } catch (error) {
      logger.error('Failed to handle leave topic:', error);
    }
  }

  // ==================== TYPING INDICATORS ====================

  private async handleTypingStart(socket: any, data: { topicId: string }) {
    try {
      const user = socket.data.user;
      if (!user || !data.topicId) return;

      this.startTyping(user.id, user.username, data.topicId);

      // Diğer kullanıcılara bildir
      socket.to(`topic:${data.topicId}`).emit('user_typing', {
        userId: user.id,
        username: user.username,
        topicId: data.topicId,
        isTyping: true
      });

    } catch (error) {
      logger.error('Failed to handle typing start:', error);
    }
  }

  private async handleTypingStop(socket: any, data: { topicId: string }) {
    try {
      const user = socket.data.user;
      if (!user || !data.topicId) return;

      this.stopTyping(user.id, data.topicId);

      // Diğer kullanıcılara bildir
      socket.to(`topic:${data.topicId}`).emit('user_typing', {
        userId: user.id,
        username: user.username,
        topicId: data.topicId,
        isTyping: false
      });

    } catch (error) {
      logger.error('Failed to handle typing stop:', error);
    }
  }

  private startTyping(userId: string, username: string, topicId: string) {
    if (!this.typingUsers.has(topicId)) {
      this.typingUsers.set(topicId, new Set());
    }
    this.typingUsers.get(topicId)!.add(userId);

    // 5 saniye sonra otomatik olarak durdur
    setTimeout(() => {
      this.stopTyping(userId, topicId);
    }, 5000);
  }

  private stopTyping(userId: string, topicId: string) {
    const typingInTopic = this.typingUsers.get(topicId);
    if (typingInTopic) {
      typingInTopic.delete(userId);
      if (typingInTopic.size === 0) {
        this.typingUsers.delete(topicId);
      }
    }
  }

  private clearUserTyping(userId: string) {
    for (const [topicId, typingUsers] of this.typingUsers.entries()) {
      typingUsers.delete(userId);
      if (typingUsers.size === 0) {
        this.typingUsers.delete(topicId);
      }
    }
  }

  // ==================== NOTIFICATIONS ====================

  async sendNotification(notification: NotificationData) {
    try {
      // Veritabanına kaydet
      await this.saveNotification(notification);

      // Kullanıcının socket'larına gönder
      const userSockets = this.userSockets.get(notification.userId);
      if (userSockets && userSockets.size > 0) {
        userSockets.forEach(socketId => {
          this.io.to(socketId).emit('notification', notification);
        });
      }

      // Push notification gönder (offline kullanıcılar için)
      if (!userSockets || userSockets.size === 0) {
        await this.sendPushNotification(notification);
      }

    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  async broadcastToTopic(topicId: string, event: string, data: any) {
    try {
      this.io.to(`topic:${topicId}`).emit(event, data);
    } catch (error) {
      logger.error('Failed to broadcast to topic:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private async checkTokenBlacklist(token: string): Promise<boolean> {
    try {
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const result = await redis.get(`blacklist:${tokenHash}`);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  private async updateUserOnlineStatus(userId: string, status: 'online' | 'offline') {
    try {
      const statusData = {
        userId,
        status,
        lastSeen: new Date().toISOString()
      };

      await redis.setex(`user_status:${userId}`, 300, JSON.stringify(statusData)); // 5 dakika

      // Diğer kullanıcılara bildir
      this.io.emit('user_status_changed', statusData);

    } catch (error) {
      logger.error('Failed to update user online status:', error);
    }
  }

  private async getOnlineUsersCount(): Promise<number> {
    return this.userSockets.size;
  }

  private async getUnreadNotifications(userId: string): Promise<NotificationData[]> {
    try {
      // Bu implementasyon notification service gerektirir
      // Şimdilik boş array döndürüyoruz
      return [];
    } catch (error) {
      logger.error('Failed to get unread notifications:', error);
      return [];
    }
  }

  private async saveNotification(notification: NotificationData) {
    try {
      // Notification'ı veritabanına kaydet
      // Bu implementasyon notification table gerektirir
    } catch (error) {
      logger.error('Failed to save notification:', error);
    }
  }

  private async sendPushNotification(notification: NotificationData) {
    try {
      // Push notification gönder (FCM, APNS, etc.)
      // Bu implementasyon push notification service gerektirir
    } catch (error) {
      logger.error('Failed to send push notification:', error);
    }
  }

  private async handleMarkNotificationRead(socket: any, data: { notificationId: string }) {
    // Notification'ı okundu olarak işaretle
  }

  private async handleGetNotifications(socket: any, data: { page?: number; limit?: number }) {
    // Kullanıcının notification'larını getir
  }

  private async handleUpdateStatus(socket: any, data: { status: 'online' | 'away' }) {
    const user = socket.data.user;
    if (user) {
      await this.updateUserOnlineStatus(user.id, data.status);
    }
  }

  // ==================== CLEANUP ====================

  private startCleanupInterval() {
    // Her 5 dakikada bir temizlik yap
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);
  }

  private cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 dakika

    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (now.getTime() - user.lastActivity.getTime() > inactiveThreshold) {
        // Inactive connection'ı kapat
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }

  // ==================== PUBLIC METHODS ====================

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getOnlineUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  async getIO(): Promise<SocketIOServer> {
    return this.io;
  }
}
