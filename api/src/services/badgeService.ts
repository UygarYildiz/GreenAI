import { supabase } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { SecurityService } from './securityService';

export interface Badge {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  earnedAt: string;
  awardedBy?: string;
  metadata: Record<string, any>;
}

export interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  iconUrl: string;
  color: string;
  criteria: BadgeCriteria;
  isActive: boolean;
}

export interface BadgeCriteria {
  type: 'automatic' | 'manual';
  conditions?: {
    topicCount?: number;
    replyCount?: number;
    likeCount?: number;
    solutionCount?: number;
    reputationScore?: number;
    daysActive?: number;
    consecutiveDays?: number;
    categoryExpertise?: string[];
  };
}

export interface UserStats {
  userId: string;
  topicCount: number;
  replyCount: number;
  likeCount: number;
  solutionCount: number;
  reputationScore: number;
  daysActive: number;
  consecutiveDays: number;
  joinedAt: string;
  lastActiveAt: string;
}

export class BadgeService {

  // ==================== BADGE DEFINITIONS ====================

  private static readonly BADGE_DEFINITIONS: BadgeDefinition[] = [
    // Başlangıç rozetleri
    {
      type: 'welcome',
      name: 'Hoş Geldin',
      description: 'Platforma katıldığın için teşekkürler!',
      iconUrl: '/badges/welcome.svg',
      color: '#3B82F6',
      criteria: { type: 'automatic' },
      isActive: true
    },
    {
      type: 'first_topic',
      name: 'İlk Konu',
      description: 'İlk konunu oluşturdun',
      iconUrl: '/badges/first-topic.svg',
      color: '#10B981',
      criteria: { 
        type: 'automatic',
        conditions: { topicCount: 1 }
      },
      isActive: true
    },
    {
      type: 'first_reply',
      name: 'İlk Yorum',
      description: 'İlk yorumunu yaptın',
      iconUrl: '/badges/first-reply.svg',
      color: '#8B5CF6',
      criteria: { 
        type: 'automatic',
        conditions: { replyCount: 1 }
      },
      isActive: true
    },

    // Aktivite rozetleri
    {
      type: 'active_member',
      name: 'Aktif Üye',
      description: '10 konu oluşturdun',
      iconUrl: '/badges/active-member.svg',
      color: '#F59E0B',
      criteria: { 
        type: 'automatic',
        conditions: { topicCount: 10 }
      },
      isActive: true
    },
    {
      type: 'helpful',
      name: 'Yardımsever',
      description: '50 yorum yaptın',
      iconUrl: '/badges/helpful.svg',
      color: '#06B6D4',
      criteria: { 
        type: 'automatic',
        conditions: { replyCount: 50 }
      },
      isActive: true
    },
    {
      type: 'problem_solver',
      name: 'Problem Çözücü',
      description: '10 çözüm işaretledin',
      iconUrl: '/badges/problem-solver.svg',
      color: '#059669',
      criteria: { 
        type: 'automatic',
        conditions: { solutionCount: 10 }
      },
      isActive: true
    },

    // Popülerlik rozetleri
    {
      type: 'popular',
      name: 'Popüler',
      description: '100 beğeni aldın',
      iconUrl: '/badges/popular.svg',
      color: '#DC2626',
      criteria: { 
        type: 'automatic',
        conditions: { likeCount: 100 }
      },
      isActive: true
    },
    {
      type: 'influencer',
      name: 'Etkileyici',
      description: '500 beğeni aldın',
      iconUrl: '/badges/influencer.svg',
      color: '#7C2D12',
      criteria: { 
        type: 'automatic',
        conditions: { likeCount: 500 }
      },
      isActive: true
    },

    // Uzmanlık rozetleri
    {
      type: 'vegetable_expert',
      name: 'Sebze Uzmanı',
      description: 'Sebze yetiştiriciliğinde uzman',
      iconUrl: '/badges/vegetable-expert.svg',
      color: '#16A34A',
      criteria: { 
        type: 'automatic',
        conditions: { 
          categoryExpertise: ['sebze-yetistiriciligi'],
          topicCount: 20,
          solutionCount: 5
        }
      },
      isActive: true
    },
    {
      type: 'fruit_expert',
      name: 'Meyve Uzmanı',
      description: 'Meyve yetiştiriciliğinde uzman',
      iconUrl: '/badges/fruit-expert.svg',
      color: '#EA580C',
      criteria: { 
        type: 'automatic',
        conditions: { 
          categoryExpertise: ['meyve-yetistiriciligi'],
          topicCount: 20,
          solutionCount: 5
        }
      },
      isActive: true
    },

    // Sadakat rozetleri
    {
      type: 'loyal_member',
      name: 'Sadık Üye',
      description: '30 gün aktif oldun',
      iconUrl: '/badges/loyal-member.svg',
      color: '#7C3AED',
      criteria: { 
        type: 'automatic',
        conditions: { daysActive: 30 }
      },
      isActive: true
    },
    {
      type: 'veteran',
      name: 'Veteran',
      description: '365 gün aktif oldun',
      iconUrl: '/badges/veteran.svg',
      color: '#92400E',
      criteria: { 
        type: 'automatic',
        conditions: { daysActive: 365 }
      },
      isActive: true
    },

    // Özel rozetler (manuel)
    {
      type: 'moderator',
      name: 'Moderatör',
      description: 'Forum moderatörü',
      iconUrl: '/badges/moderator.svg',
      color: '#1F2937',
      criteria: { type: 'manual' },
      isActive: true
    },
    {
      type: 'expert_verified',
      name: 'Doğrulanmış Uzman',
      description: 'Tarım uzmanı olarak doğrulandı',
      iconUrl: '/badges/expert-verified.svg',
      color: '#059669',
      criteria: { type: 'manual' },
      isActive: true
    }
  ];

  // ==================== BADGE MANAGEMENT ====================

  /**
   * Kullanıcının rozetlerini getir
   */
  async getUserBadges(userId: string): Promise<Badge[]> {
    try {
      const { data: badges, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return badges || [];
    } catch (error) {
      logger.error('Failed to get user badges:', error);
      throw error;
    }
  }

  /**
   * Rozet tanımlarını getir
   */
  getBadgeDefinitions(): BadgeDefinition[] {
    return BadgeService.BADGE_DEFINITIONS.filter(badge => badge.isActive);
  }

  /**
   * Kullanıcıya rozet ver
   */
  async awardBadge(
    userId: string, 
    badgeType: string, 
    awardedBy?: string,
    metadata: Record<string, any> = {}
  ): Promise<Badge | null> {
    try {
      // Rozet tanımını bul
      const badgeDefinition = BadgeService.BADGE_DEFINITIONS.find(b => b.type === badgeType);
      if (!badgeDefinition) {
        throw new Error(`Badge definition not found: ${badgeType}`);
      }

      // Kullanıcının bu rozeti zaten var mı kontrol et
      const existingBadge = await this.checkExistingBadge(userId, badgeType);
      if (existingBadge) {
        return existingBadge;
      }

      // Rozeti ver
      const { data: badge, error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_type: badgeType,
          badge_name: badgeDefinition.name,
          description: badgeDefinition.description,
          icon_url: badgeDefinition.iconUrl,
          color: badgeDefinition.color,
          awarded_by: awardedBy,
          metadata
        })
        .select()
        .single();

      if (error) throw error;

      // Aktiviteyi logla
      await SecurityService.logSecurityEvent({
        userId,
        activity: 'badge_awarded',
        metadata: {
          badgeType,
          badgeName: badgeDefinition.name,
          awardedBy
        },
        severity: 'low',
        timestamp: new Date()
      });

      logger.info('Badge awarded', { userId, badgeType, awardedBy });

      return this.formatBadge(badge);
    } catch (error) {
      logger.error('Failed to award badge:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı istatistiklerini kontrol et ve otomatik rozetleri ver
   */
  async checkAndAwardAutomaticBadges(userId: string): Promise<Badge[]> {
    try {
      const userStats = await this.getUserStats(userId);
      const awardedBadges: Badge[] = [];

      // Otomatik rozetleri kontrol et
      for (const badgeDefinition of BadgeService.BADGE_DEFINITIONS) {
        if (badgeDefinition.criteria.type !== 'automatic' || !badgeDefinition.criteria.conditions) {
          continue;
        }

        const conditions = badgeDefinition.criteria.conditions;
        let shouldAward = true;

        // Koşulları kontrol et
        if (conditions.topicCount && userStats.topicCount < conditions.topicCount) {
          shouldAward = false;
        }
        if (conditions.replyCount && userStats.replyCount < conditions.replyCount) {
          shouldAward = false;
        }
        if (conditions.likeCount && userStats.likeCount < conditions.likeCount) {
          shouldAward = false;
        }
        if (conditions.solutionCount && userStats.solutionCount < conditions.solutionCount) {
          shouldAward = false;
        }
        if (conditions.reputationScore && userStats.reputationScore < conditions.reputationScore) {
          shouldAward = false;
        }
        if (conditions.daysActive && userStats.daysActive < conditions.daysActive) {
          shouldAward = false;
        }

        // Kategori uzmanlığı kontrolü
        if (conditions.categoryExpertise && conditions.categoryExpertise.length > 0) {
          const categoryStats = await this.getUserCategoryStats(userId);
          const hasExpertise = conditions.categoryExpertise.some(category => {
            const stats = categoryStats[category];
            return stats && 
                   stats.topicCount >= (conditions.topicCount || 0) &&
                   stats.solutionCount >= (conditions.solutionCount || 0);
          });
          if (!hasExpertise) {
            shouldAward = false;
          }
        }

        // Rozeti ver
        if (shouldAward) {
          const badge = await this.awardBadge(userId, badgeDefinition.type, undefined, {
            autoAwarded: true,
            userStats
          });
          if (badge) {
            awardedBadges.push(badge);
          }
        }
      }

      return awardedBadges;
    } catch (error) {
      logger.error('Failed to check automatic badges:', error);
      return [];
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Kullanıcı istatistiklerini getir
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Cache'den kontrol et
      const cacheKey = `user_stats:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Kullanıcı bilgilerini getir
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('created_at, last_login_at, reputation_score')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // İstatistikleri hesapla
      const [topicStats, replyStats, likeStats, solutionStats] = await Promise.all([
        this.getTopicStats(userId),
        this.getReplyStats(userId),
        this.getLikeStats(userId),
        this.getSolutionStats(userId)
      ]);

      const daysActive = this.calculateDaysActive(user.created_at, user.last_login_at);

      const stats: UserStats = {
        userId,
        topicCount: topicStats.count,
        replyCount: replyStats.count,
        likeCount: likeStats.received,
        solutionCount: solutionStats.count,
        reputationScore: user.reputation_score || 0,
        daysActive,
        consecutiveDays: await this.calculateConsecutiveDays(userId),
        joinedAt: user.created_at,
        lastActiveAt: user.last_login_at
      };

      // Cache'e kaydet (1 saat)
      await redis.setex(cacheKey, 3600, JSON.stringify(stats));

      return stats;
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının kategori bazlı istatistiklerini getir
   */
  async getUserCategoryStats(userId: string): Promise<Record<string, any>> {
    try {
      const { data: categoryStats, error } = await supabase
        .from('topics')
        .select(`
          category_id,
          categories!inner(slug),
          replies!inner(is_solution)
        `)
        .eq('author_id', userId);

      if (error) throw error;

      const stats: Record<string, any> = {};

      categoryStats?.forEach(topic => {
        const categorySlug = topic.categories.slug;
        if (!stats[categorySlug]) {
          stats[categorySlug] = {
            topicCount: 0,
            solutionCount: 0
          };
        }
        
        stats[categorySlug].topicCount++;
        
        // Çözüm sayısını hesapla
        const solutionCount = topic.replies?.filter(reply => reply.is_solution).length || 0;
        stats[categorySlug].solutionCount += solutionCount;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get user category stats:', error);
      return {};
    }
  }

  // ==================== HELPER METHODS ====================

  private async checkExistingBadge(userId: string, badgeType: string): Promise<Badge | null> {
    try {
      const { data: badge, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_type', badgeType)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return badge ? this.formatBadge(badge) : null;
    } catch (error) {
      return null;
    }
  }

  private async getTopicStats(userId: string) {
    const { count, error } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (error) throw error;
    return { count: count || 0 };
  }

  private async getReplyStats(userId: string) {
    const { count, error } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (error) throw error;
    return { count: count || 0 };
  }

  private async getLikeStats(userId: string) {
    // Alınan beğenileri hesapla
    const { data: topicLikes, error: topicError } = await supabase
      .from('likes')
      .select('target_id')
      .eq('target_type', 'topic')
      .in('target_id', 
        supabase.from('topics').select('id').eq('author_id', userId)
      );

    const { data: replyLikes, error: replyError } = await supabase
      .from('likes')
      .select('target_id')
      .eq('target_type', 'reply')
      .in('target_id', 
        supabase.from('replies').select('id').eq('author_id', userId)
      );

    if (topicError || replyError) throw topicError || replyError;

    return { 
      received: (topicLikes?.length || 0) + (replyLikes?.length || 0)
    };
  }

  private async getSolutionStats(userId: string) {
    const { count, error } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_solution', true);

    if (error) throw error;
    return { count: count || 0 };
  }

  private calculateDaysActive(joinedAt: string, lastActiveAt?: string): number {
    const joined = new Date(joinedAt);
    const lastActive = lastActiveAt ? new Date(lastActiveAt) : new Date();
    const diffTime = Math.abs(lastActive.getTime() - joined.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async calculateConsecutiveDays(userId: string): Promise<number> {
    // Bu implementasyon user activity tracking gerektirir
    // Şimdilik basit bir hesaplama yapıyoruz
    return 1;
  }

  private formatBadge(badge: any): Badge {
    return {
      id: badge.id,
      userId: badge.user_id,
      badgeType: badge.badge_type,
      badgeName: badge.badge_name,
      description: badge.description,
      iconUrl: badge.icon_url,
      color: badge.color,
      earnedAt: badge.earned_at,
      awardedBy: badge.awarded_by,
      metadata: badge.metadata || {}
    };
  }
}
