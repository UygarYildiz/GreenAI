import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { 
  MembershipPlan, 
  UserSubscription, 
  SubscriptionStatus,
  BillingCycle,
  UsageTracking,
  FeatureAccess 
} from '../types/membership';

export class MembershipService {

  // ==================== PLAN MANAGEMENT ====================

  /**
   * Tüm üyelik planlarını getir
   */
  async getAllPlans(): Promise<MembershipPlan[]> {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select(`
          *,
          feature_access(
            feature_key,
            is_enabled,
            limit_value
          )
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('Failed to get membership plans:', error);
      throw error;
    }
  }

  /**
   * Plan detayını getir
   */
  async getPlanById(planId: string): Promise<MembershipPlan | null> {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select(`
          *,
          feature_access(
            feature_key,
            is_enabled,
            limit_value
          )
        `)
        .eq('id', planId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Failed to get plan:', error);
      throw error;
    }
  }

  /**
   * Plan adına göre plan getir
   */
  async getPlanByName(planName: string): Promise<MembershipPlan | null> {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('name', planName)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Failed to get plan by name:', error);
      throw error;
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Kullanıcının aktif aboneliğini getir
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          membership_plans!inner(
            name,
            display_name,
            features,
            limits
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Kullanıcının aktif aboneliği yok, ücretsiz plan döndür
          const freePlan = await this.getPlanByName('free');
          if (freePlan) {
            return {
              id: 'free-subscription',
              userId,
              planId: freePlan.id,
              status: 'active' as SubscriptionStatus,
              billingCycle: 'monthly' as BillingCycle,
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl
              cancelAtPeriodEnd: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              membershipPlan: freePlan
            };
          }
          return null;
        }
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Failed to get user subscription:', error);
      throw error;
    }
  }

  /**
   * Yeni abonelik oluştur
   */
  async createSubscription(
    userId: string,
    planId: string,
    billingCycle: BillingCycle = 'monthly',
    paymentData?: any
  ): Promise<UserSubscription> {
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Mevcut aktif aboneliği kontrol et
      const existingSubscription = await this.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.id !== 'free-subscription') {
        throw new Error('User already has an active subscription');
      }

      // Dönem hesapla
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const subscriptionData = {
        user_id: userId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_method: paymentData?.paymentMethod,
        payment_provider: paymentData?.provider,
        subscription_id: paymentData?.subscriptionId,
        payment_amount: billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly,
        next_payment_date: periodEnd.toISOString()
      };

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select(`
          *,
          membership_plans!inner(
            name,
            display_name,
            features,
            limits
          )
        `)
        .single();

      if (error) throw error;

      logger.info(`Subscription created: ${data.id} for user: ${userId}`);
      return data;

    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Abonelik iptal et
   */
  async cancelSubscription(
    userId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<UserSubscription> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || subscription.id === 'free-subscription') {
        throw new Error('No active subscription found');
      }

      const updateData: any = {
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString()
      };

      if (!cancelAtPeriodEnd) {
        updateData.status = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscription.id)
        .select(`
          *,
          membership_plans!inner(
            name,
            display_name,
            features,
            limits
          )
        `)
        .single();

      if (error) throw error;

      logger.info(`Subscription cancelled: ${subscription.id} for user: ${userId}`);
      return data;

    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Kullanım takibi kaydet
   */
  async trackUsage(
    userId: string,
    resourceType: string,
    incrementBy: number = 1
  ): Promise<void> {
    try {
      // Mevcut dönem için kullanım kaydını bul veya oluştur
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Ayın başı
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ayın sonu

      const { data: existingUsage } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('period_start', periodStart.toISOString())
        .single();

      if (existingUsage) {
        // Mevcut kaydı güncelle
        const { error } = await supabase
          .from('usage_tracking')
          .update({
            usage_count: existingUsage.usage_count + incrementBy,
            updated_at: now.toISOString()
          })
          .eq('id', existingUsage.id);

        if (error) throw error;
      } else {
        // Yeni kayıt oluştur
        const { error } = await supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            resource_type: resourceType,
            usage_count: incrementBy,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString()
          });

        if (error) throw error;
      }

    } catch (error) {
      logger.error('Failed to track usage:', error);
      throw error;
    }
  }

  /**
   * Kullanım limitini kontrol et
   */
  async checkUsageLimit(
    userId: string,
    resourceType: string
  ): Promise<{ allowed: boolean; current: number; limit: number | null }> {
    try {
      // Kullanıcının planını getir
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { allowed: false, current: 0, limit: 0 };
      }

      // Plan limitlerini kontrol et
      const limits = subscription.membershipPlan?.limits || {};
      const limit = limits[resourceType];

      // Sınırsız ise
      if (limit === null || limit === undefined) {
        return { allowed: true, current: 0, limit: null };
      }

      // Mevcut kullanımı getir
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('period_start', periodStart.toISOString())
        .single();

      const currentUsage = usage?.usage_count || 0;
      const allowed = currentUsage < limit;

      return { allowed, current: currentUsage, limit };

    } catch (error) {
      logger.error('Failed to check usage limit:', error);
      return { allowed: false, current: 0, limit: 0 };
    }
  }

  /**
   * Kullanıcının kullanım istatistiklerini getir
   */
  async getUserUsageStats(userId: string): Promise<UsageTracking[]> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', periodStart.toISOString());

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }

  // ==================== FEATURE ACCESS ====================

  /**
   * Özellik erişimini kontrol et
   */
  async checkFeatureAccess(
    userId: string,
    featureKey: string
  ): Promise<{ hasAccess: boolean; limit?: number }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return { hasAccess: false };
      }

      // Plan özelliklerini kontrol et
      const features = subscription.membershipPlan?.features || {};
      const hasFeature = features[featureKey] === true;

      if (!hasFeature) {
        return { hasAccess: false };
      }

      // Limit kontrolü
      const limits = subscription.membershipPlan?.limits || {};
      const limit = limits[featureKey];

      return { hasAccess: true, limit };

    } catch (error) {
      logger.error('Failed to check feature access:', error);
      return { hasAccess: false };
    }
  }

  /**
   * Kullanıcının erişebileceği tüm özellikleri getir
   */
  async getUserFeatures(userId: string): Promise<Record<string, any>> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return {};
      }

      return subscription.membershipPlan?.features || {};

    } catch (error) {
      logger.error('Failed to get user features:', error);
      return {};
    }
  }

  // ==================== SUBSCRIPTION LIFECYCLE ====================

  /**
   * Süresi dolan abonelikleri kontrol et ve güncelle
   */
  async processExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();

      // Süresi dolan abonelikleri bul
      const { data: expiredSubscriptions, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active')
        .lt('current_period_end', now.toISOString());

      if (error) throw error;

      for (const subscription of expiredSubscriptions || []) {
        if (subscription.cancel_at_period_end) {
          // Aboneliği iptal et
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: now.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id);

          logger.info(`Subscription expired and cancelled: ${subscription.id}`);
        } else {
          // Aboneliği yenile (ödeme başarılı ise)
          const nextPeriodEnd = new Date(subscription.current_period_end);
          if (subscription.billing_cycle === 'yearly') {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
          } else {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
          }

          await supabase
            .from('user_subscriptions')
            .update({
              current_period_start: subscription.current_period_end,
              current_period_end: nextPeriodEnd.toISOString(),
              next_payment_date: nextPeriodEnd.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id);

          logger.info(`Subscription renewed: ${subscription.id}`);
        }
      }

    } catch (error) {
      logger.error('Failed to process expired subscriptions:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Abonelik analitiklerini getir
   */
  async getSubscriptionAnalytics(): Promise<any> {
    try {
      // Aktif abonelik sayıları
      const { data: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          membership_plans!inner(name),
          count
        `)
        .eq('status', 'active');

      // Aylık gelir
      const { data: monthlyRevenue } = await supabase
        .from('subscription_invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Churn rate hesaplama
      const { data: cancelledThisMonth } = await supabase
        .from('user_subscriptions')
        .select('count')
        .eq('status', 'cancelled')
        .gte('cancelled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        activeSubscriptions: activeSubscriptions || [],
        monthlyRevenue: monthlyRevenue?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0,
        churnRate: cancelledThisMonth?.[0]?.count || 0
      };

    } catch (error) {
      logger.error('Failed to get subscription analytics:', error);
      throw error;
    }
  }
}
