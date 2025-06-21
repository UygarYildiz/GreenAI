import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { MembershipService } from '../services/membershipService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import {
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  BillingCycle,
  MembershipPlanType
} from '../types/membership';

const router = Router();
const membershipService = new MembershipService();

// Rate limiting for membership endpoints
const membershipRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per user
  message: 'Too many membership requests, please try again later',
});

// ==================== PLAN ROUTES ====================

/**
 * GET /api/membership/plans
 * Tüm üyelik planlarını getir
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await membershipService.getAllPlans();

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    logger.error('Failed to get membership plans:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/membership/plans/:id
 * Plan detayını getir
 */
router.get(
  '/plans/:id',
  [
    param('id').isUUID().withMessage('Invalid plan ID'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await membershipService.getPlanById(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        data: plan
      });

    } catch (error) {
      logger.error('Failed to get plan:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== SUBSCRIPTION ROUTES ====================

/**
 * GET /api/membership/subscription
 * Kullanıcının mevcut aboneliğini getir
 */
router.get(
  '/subscription',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const subscription = await membershipService.getUserSubscription(userId);

      res.json({
        success: true,
        data: subscription
      });

    } catch (error) {
      logger.error('Failed to get user subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/membership/subscribe
 * Yeni abonelik başlat
 */
router.post(
  '/subscribe',
  membershipRateLimit,
  authenticateToken,
  [
    body('planId').isUUID().withMessage('Invalid plan ID'),
    body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle'),
    body('paymentMethod').isString().withMessage('Payment method required'),
    body('promotionCode').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { planId, billingCycle, paymentMethod, promotionCode }: CreateSubscriptionRequest = req.body;

      // Plan kontrolü
      const plan = await membershipService.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Ücretsiz plan için özel işlem
      if (plan.name === 'free') {
        return res.status(400).json({
          success: false,
          error: 'Cannot subscribe to free plan'
        });
      }

      // Mevcut abonelik kontrolü
      const existingSubscription = await membershipService.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.id !== 'free-subscription') {
        return res.status(400).json({
          success: false,
          error: 'User already has an active subscription'
        });
      }

      // Ödeme işlemi başlat (burada payment service entegrasyonu olacak)
      const paymentData = {
        paymentMethod,
        provider: 'iyzico', // Default provider
        subscriptionId: `temp-${Date.now()}` // Temporary ID
      };

      const subscription = await membershipService.createSubscription(
        userId,
        planId,
        billingCycle as BillingCycle,
        paymentData
      );

      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Subscription created successfully'
      });

    } catch (error) {
      logger.error('Failed to create subscription:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      });
    }
  }
);

/**
 * PUT /api/membership/subscription
 * Abonelik güncelle
 */
router.put(
  '/subscription',
  membershipRateLimit,
  authenticateToken,
  [
    body('planId').optional().isUUID(),
    body('billingCycle').optional().isIn(['monthly', 'yearly']),
    body('cancelAtPeriodEnd').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const updateData: UpdateSubscriptionRequest = req.body;

      // Mevcut abonelik kontrolü
      const subscription = await membershipService.getUserSubscription(userId);
      if (!subscription || subscription.id === 'free-subscription') {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Plan değişikliği varsa
      if (updateData.planId) {
        const newPlan = await membershipService.getPlanById(updateData.planId);
        if (!newPlan) {
          return res.status(404).json({
            success: false,
            error: 'New plan not found'
          });
        }
        // Plan değişikliği için ek ödeme hesaplaması yapılabilir
      }

      // İptal işlemi
      if (updateData.cancelAtPeriodEnd !== undefined) {
        const updatedSubscription = await membershipService.cancelSubscription(
          userId,
          updateData.cancelAtPeriodEnd
        );

        return res.json({
          success: true,
          data: updatedSubscription,
          message: updateData.cancelAtPeriodEnd 
            ? 'Subscription will be cancelled at period end'
            : 'Subscription cancelled immediately'
        });
      }

      // Diğer güncellemeler için implementation gerekli
      res.json({
        success: true,
        message: 'Subscription update not implemented yet'
      });

    } catch (error) {
      logger.error('Failed to update subscription:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription'
      });
    }
  }
);

/**
 * DELETE /api/membership/subscription
 * Abonelik iptal et
 */
router.delete(
  '/subscription',
  authenticateToken,
  [
    query('immediate').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const immediate = req.query.immediate === 'true';

      const subscription = await membershipService.cancelSubscription(userId, !immediate);

      res.json({
        success: true,
        data: subscription,
        message: immediate 
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at period end'
      });

    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      });
    }
  }
);

// ==================== USAGE TRACKING ROUTES ====================

/**
 * GET /api/membership/usage
 * Kullanıcının kullanım istatistiklerini getir
 */
router.get(
  '/usage',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const usageStats = await membershipService.getUserUsageStats(userId);

      res.json({
        success: true,
        data: usageStats
      });

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/membership/usage/track
 * Kullanım takibi kaydet
 */
router.post(
  '/usage/track',
  authenticateToken,
  [
    body('resourceType').isString().withMessage('Resource type required'),
    body('incrementBy').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { resourceType, incrementBy = 1 } = req.body;

      await membershipService.trackUsage(userId, resourceType, incrementBy);

      res.json({
        success: true,
        message: 'Usage tracked successfully'
      });

    } catch (error) {
      logger.error('Failed to track usage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== FEATURE ACCESS ROUTES ====================

/**
 * GET /api/membership/features
 * Kullanıcının erişebileceği özellikleri getir
 */
router.get(
  '/features',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const features = await membershipService.getUserFeatures(userId);

      res.json({
        success: true,
        data: features
      });

    } catch (error) {
      logger.error('Failed to get user features:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/membership/features/check
 * Özellik erişim kontrolü
 */
router.post(
  '/features/check',
  authenticateToken,
  [
    body('featureKey').isString().withMessage('Feature key required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { featureKey } = req.body;

      const access = await membershipService.checkFeatureAccess(userId, featureKey);

      res.json({
        success: true,
        data: access
      });

    } catch (error) {
      logger.error('Failed to check feature access:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/membership/usage/check
 * Kullanım limiti kontrolü
 */
router.post(
  '/usage/check',
  authenticateToken,
  [
    body('resourceType').isString().withMessage('Resource type required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { resourceType } = req.body;

      const limitCheck = await membershipService.checkUsageLimit(userId, resourceType);

      res.json({
        success: true,
        data: limitCheck
      });

    } catch (error) {
      logger.error('Failed to check usage limit:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/membership/analytics
 * Abonelik analitikleri (admin)
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const analytics = await membershipService.getSubscriptionAnalytics();

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to get subscription analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
