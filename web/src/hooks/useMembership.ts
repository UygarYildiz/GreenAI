'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MembershipPlan {
  id: string;
  name: 'free' | 'premium' | 'pro' | 'corporate';
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any>;
  limits: Record<string, number | null>;
}

interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  membershipPlan?: MembershipPlan;
}

interface UsageStats {
  resourceType: string;
  usageCount: number;
  limit: number | null;
  percentage: number;
}

interface FeatureAccess {
  hasAccess: boolean;
  limit?: number;
  upgradeRequired?: boolean;
  suggestedPlan?: MembershipPlan;
}

interface UseMembershipReturn {
  // Plans
  plans: MembershipPlan[];
  isLoadingPlans: boolean;
  
  // Current subscription
  subscription: UserSubscription | null;
  isLoadingSubscription: boolean;
  
  // Usage tracking
  usageStats: UsageStats[];
  isLoadingUsage: boolean;
  
  // Actions
  subscribe: (planId: string, billingCycle: 'monthly' | 'yearly') => Promise<void>;
  cancelSubscription: (immediate?: boolean) => Promise<void>;
  checkFeatureAccess: (featureKey: string) => Promise<FeatureAccess>;
  checkUsageLimit: (resourceType: string) => Promise<{ allowed: boolean; current: number; limit: number | null }>;
  trackUsage: (resourceType: string, incrementBy?: number) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Helpers
  hasFeature: (featureKey: string) => boolean;
  canUseResource: (resourceType: string) => boolean;
  getCurrentPlan: () => MembershipPlan | null;
  getUpgradeRecommendation: () => MembershipPlan | null;
}

export function useMembership(): UseMembershipReturn {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch all plans
  const fetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/plans');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch plans');
      }

      if (data.success) {
        setPlans(data.data || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plans';
      setError(errorMessage);
      console.error('Plans fetch error:', err);
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  // Fetch current subscription
  const fetchSubscription = useCallback(async () => {
    setIsLoadingSubscription(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/subscription', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription');
      }

      if (data.success) {
        setSubscription(data.data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      console.error('Subscription fetch error:', err);
    } finally {
      setIsLoadingSubscription(false);
    }
  }, []);

  // Fetch usage stats
  const fetchUsageStats = useCallback(async () => {
    setIsLoadingUsage(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage stats');
      }

      if (data.success) {
        setUsageStats(data.data || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch usage stats';
      setError(errorMessage);
      console.error('Usage stats fetch error:', err);
    } finally {
      setIsLoadingUsage(false);
    }
  }, []);

  // Subscribe to a plan
  const subscribe = useCallback(async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod: 'credit_card', // Default payment method
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      if (data.success) {
        setSubscription(data.data);
        toast({
          title: 'Abonelik Başarılı',
          description: 'Planınız başarıyla aktifleştirildi.',
        });
        
        // Refresh data
        await fetchSubscription();
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(errorMessage);
      
      toast({
        title: 'Abonelik Hatası',
        description: errorMessage,
        variant: 'destructive',
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscription, toast]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (immediate: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/membership/subscription?immediate=${immediate}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      if (data.success) {
        setSubscription(data.data);
        toast({
          title: 'Abonelik İptal Edildi',
          description: immediate 
            ? 'Aboneliğiniz hemen iptal edildi.'
            : 'Aboneliğiniz dönem sonunda iptal edilecek.',
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      
      toast({
        title: 'İptal Hatası',
        description: errorMessage,
        variant: 'destructive',
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check feature access
  const checkFeatureAccess = useCallback(async (featureKey: string): Promise<FeatureAccess> => {
    try {
      const response = await fetch('/api/membership/features/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ featureKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check feature access');
      }

      return data.data || { hasAccess: false };

    } catch (err) {
      console.error('Feature access check error:', err);
      return { hasAccess: false };
    }
  }, []);

  // Check usage limit
  const checkUsageLimit = useCallback(async (resourceType: string) => {
    try {
      const response = await fetch('/api/membership/usage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ resourceType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check usage limit');
      }

      return data.data || { allowed: false, current: 0, limit: 0 };

    } catch (err) {
      console.error('Usage limit check error:', err);
      return { allowed: false, current: 0, limit: 0 };
    }
  }, []);

  // Track usage
  const trackUsage = useCallback(async (resourceType: string, incrementBy: number = 1) => {
    try {
      const response = await fetch('/api/membership/usage/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ resourceType, incrementBy }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track usage');
      }

      // Refresh usage stats
      await fetchUsageStats();

    } catch (err) {
      console.error('Usage tracking error:', err);
    }
  }, [fetchUsageStats]);

  // Helper functions
  const hasFeature = useCallback((featureKey: string): boolean => {
    if (!subscription?.membershipPlan) return false;
    
    const features = subscription.membershipPlan.features || {};
    return getNestedValue(features, featureKey) === true;
  }, [subscription]);

  const canUseResource = useCallback((resourceType: string): boolean => {
    if (!subscription?.membershipPlan) return false;
    
    const limits = subscription.membershipPlan.limits || {};
    const limit = limits[resourceType];
    
    // Unlimited if null
    if (limit === null || limit === undefined) return true;
    
    // Check current usage
    const usage = usageStats.find(stat => stat.resourceType === resourceType);
    const currentUsage = usage?.usageCount || 0;
    
    return currentUsage < limit;
  }, [subscription, usageStats]);

  const getCurrentPlan = useCallback((): MembershipPlan | null => {
    return subscription?.membershipPlan || null;
  }, [subscription]);

  const getUpgradeRecommendation = useCallback((): MembershipPlan | null => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) return plans.find(p => p.name === 'premium') || null;
    
    // Simple upgrade logic
    const planOrder = ['free', 'premium', 'pro', 'corporate'];
    const currentIndex = planOrder.indexOf(currentPlan.name);
    const nextPlanName = planOrder[currentIndex + 1];
    
    return plans.find(p => p.name === nextPlanName) || null;
  }, [getCurrentPlan, plans]);

  // Load data on mount
  useEffect(() => {
    fetchPlans();
    
    const token = localStorage.getItem('token');
    if (token) {
      fetchSubscription();
      fetchUsageStats();
    }
  }, [fetchPlans, fetchSubscription, fetchUsageStats]);

  return {
    // Plans
    plans,
    isLoadingPlans,
    
    // Current subscription
    subscription,
    isLoadingSubscription,
    
    // Usage tracking
    usageStats,
    isLoadingUsage,
    
    // Actions
    subscribe,
    cancelSubscription,
    checkFeatureAccess,
    checkUsageLimit,
    trackUsage,
    
    // State
    isLoading,
    error,
    
    // Helpers
    hasFeature,
    canUseResource,
    getCurrentPlan,
    getUpgradeRecommendation,
  };
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
