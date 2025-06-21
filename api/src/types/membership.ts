// ==================== ENUMS ====================

export enum MembershipPlanType {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro',
  CORPORATE = 'corporate'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum PaymentProvider {
  IYZICO = 'iyzico',
  PAYTR = 'paytr',
  STRIPE = 'stripe'
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount'
}

// ==================== INTERFACES ====================

export interface MembershipPlan {
  id: string;
  name: MembershipPlanType;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any>;
  limits: Record<string, number | null>; // null = unlimited
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  
  // Relations
  featureAccess?: FeatureAccess[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  
  // Payment info
  paymentMethod?: string;
  paymentProvider?: PaymentProvider;
  subscriptionId?: string; // Provider subscription ID
  
  // Billing info
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  paymentAmount?: number;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  membershipPlan?: MembershipPlan;
  invoices?: SubscriptionInvoice[];
}

export interface FeatureAccess {
  id: string;
  planId: string;
  featureKey: string;
  isEnabled: boolean;
  limitValue?: number; // null = unlimited
  createdAt: string;
}

export interface UsageTracking {
  id: string;
  userId: string;
  resourceType: string; // ai_queries, forum_posts, products_listed, etc.
  usageCount: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  createdAt: string;
}

export interface PromotionCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number; // null = unlimited
  usedCount: number;
  validFrom: string;
  validUntil: string;
  applicablePlans: MembershipPlanType[];
  isActive: boolean;
  createdAt: string;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  userId: string;
  subscriptionId: string;
  discountAmount: number;
  usedAt: string;
}

// ==================== FEATURE DEFINITIONS ====================

export interface PlanFeatures {
  // Forum features
  forum: {
    unlimitedPosts: boolean;
    unlimitedComments: boolean;
    advancedSearch: boolean;
    adFree: boolean;
    prioritySupport: boolean;
    premiumCategories: boolean;
    moderatorPrivileges: boolean;
    analytics: boolean;
    customBadge: boolean;
  };
  
  // E-commerce features
  ecommerce: {
    sellerAccount: boolean;
    productListingLimit: number | null;
    commissionRate: number; // percentage
    featuredProductsDaily: number;
    advancedAnalytics: boolean;
    bulkUpload: boolean;
    customStorePage: boolean;
    priorityListing: boolean;
    apiAccess: boolean;
  };
  
  // AI features
  ai: {
    dailyQueries: number | null;
    priorityResponse: boolean;
    advancedModel: boolean;
    customizedRecommendations: boolean;
    visualAnalysis: boolean;
    marketAnalysis: boolean;
    unlimitedQueries: boolean;
    apiAccess: boolean;
  };
  
  // Additional features
  additional: {
    newsletter: boolean;
    webinars: boolean;
    networking: boolean;
    customSupport: boolean;
    multiUser: number; // number of sub-accounts
    whiteLabel: boolean;
  };
}

export interface PlanLimits {
  // Daily/Monthly limits
  aiQueriesDaily?: number;
  forumPostsDaily?: number;
  forumCommentsDaily?: number;
  productsListed?: number;
  featuredProductsDaily?: number;
  
  // Storage limits
  storageGB?: number;
  mediaUploadsDaily?: number;
  
  // API limits
  apiCallsDaily?: number;
  
  // Support limits
  supportTicketsMonthly?: number;
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface CreateSubscriptionRequest {
  planId: string;
  billingCycle: BillingCycle;
  paymentMethod: string;
  promotionCode?: string;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  billingCycle?: BillingCycle;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionResponse {
  subscription: UserSubscription;
  paymentUrl?: string; // For payment gateway redirect
  message?: string;
}

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number | null;
  resetDate?: string;
}

export interface FeatureAccessCheck {
  hasAccess: boolean;
  limit?: number;
  upgradeRequired?: boolean;
  suggestedPlan?: MembershipPlan;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  churnRate: number;
  planDistribution: Array<{
    planName: string;
    count: number;
    percentage: number;
  }>;
  revenueByPlan: Array<{
    planName: string;
    revenue: number;
    percentage: number;
  }>;
  growthMetrics: {
    newSubscriptionsThisMonth: number;
    cancellationsThisMonth: number;
    netGrowth: number;
  };
}

export interface UserUsageReport {
  userId: string;
  currentPlan: MembershipPlan;
  usageStats: Array<{
    resourceType: string;
    current: number;
    limit: number | null;
    percentage: number;
  }>;
  recommendations?: Array<{
    type: 'upgrade' | 'optimize';
    message: string;
    suggestedPlan?: MembershipPlan;
  }>;
}

// ==================== PAYMENT INTEGRATION TYPES ====================

export interface PaymentInitializationData {
  subscriptionId: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  userInfo: {
    email: string;
    name: string;
    phone?: string;
  };
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentCallbackData {
  provider: PaymentProvider;
  transactionId: string;
  status: 'success' | 'failed' | 'cancelled';
  amount: number;
  subscriptionId: string;
  providerData: any; // Provider-specific data
}

// ==================== ERROR TYPES ====================

export class MembershipError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'MembershipError';
  }
}

export class SubscriptionNotFoundError extends MembershipError {
  constructor(userId: string) {
    super(
      `No active subscription found for user: ${userId}`,
      'SUBSCRIPTION_NOT_FOUND',
      404
    );
  }
}

export class UsageLimitExceededError extends MembershipError {
  constructor(resourceType: string, limit: number) {
    super(
      `Usage limit exceeded for ${resourceType}. Limit: ${limit}`,
      'USAGE_LIMIT_EXCEEDED',
      429
    );
  }
}

export class FeatureNotAvailableError extends MembershipError {
  constructor(featureKey: string, requiredPlan: string) {
    super(
      `Feature '${featureKey}' not available. Upgrade to ${requiredPlan} required.`,
      'FEATURE_NOT_AVAILABLE',
      403
    );
  }
}

export class InvalidPromotionCodeError extends MembershipError {
  constructor(code: string) {
    super(
      `Invalid or expired promotion code: ${code}`,
      'INVALID_PROMOTION_CODE',
      400
    );
  }
}

export class PaymentFailedError extends MembershipError {
  constructor(reason: string) {
    super(
      `Payment failed: ${reason}`,
      'PAYMENT_FAILED',
      402
    );
  }
}

// ==================== UTILITY TYPES ====================

export type PlanComparison = {
  feature: string;
  free: boolean | number | string;
  premium: boolean | number | string;
  pro: boolean | number | string;
  corporate: boolean | number | string;
};

export type UpgradeRecommendation = {
  currentPlan: MembershipPlanType;
  suggestedPlan: MembershipPlanType;
  reason: string;
  benefits: string[];
  estimatedSavings?: number;
};
