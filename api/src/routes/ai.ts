import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AIService } from '../services/aiService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import {
  GenerateAIResponseRequest,
  UpdateAIConfigRequest,
  SubmitFeedbackRequest,
  AIAnalyticsRequest,
  FeedbackType
} from '../types/ai';

const router = Router();
const aiService = new AIService();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per user
  message: 'Too many AI requests, please try again later',
});

/**
 * POST /api/ai/generate-response/:topicId
 * Forum sorusu için AI cevabı oluştur
 */
router.post(
  '/generate-response/:topicId',
  aiRateLimit,
  authenticateToken,
  [
    param('topicId').isUUID().withMessage('Invalid topic ID'),
    body('forceGenerate').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { topicId } = req.params;
      const { forceGenerate = false }: GenerateAIResponseRequest = req.body;

      // Topic bilgilerini getir
      const topic = await getTopicDetails(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
      }

      // Mevcut AI cevabı var mı kontrol et
      if (!forceGenerate) {
        const existingResponse = await getExistingAIResponse(topicId);
        if (existingResponse) {
          return res.json({
            success: true,
            response: existingResponse,
            cached: true
          });
        }
      }

      // AI cevabı oluştur
      const aiResponse = await aiService.generateResponse(
        topicId,
        topic.title + '\n\n' + topic.content,
        topic.category.slug,
        {
          hasImages: topic.mediaCount > 0,
          userLocation: topic.author.location,
        }
      );

      if (!aiResponse) {
        return res.status(422).json({
          success: false,
          error: 'AI response could not be generated',
          reason: 'low_confidence_or_disabled'
        });
      }

      res.json({
        success: true,
        response: aiResponse
      });

    } catch (error) {
      logger.error('AI response generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ai/responses/:topicId
 * Topic için AI cevaplarını getir
 */
router.get(
  '/responses/:topicId',
  [
    param('topicId').isUUID().withMessage('Invalid topic ID'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { topicId } = req.params;

      const responses = await getAIResponsesForTopic(topicId);

      res.json({
        success: true,
        responses
      });

    } catch (error) {
      logger.error('Failed to get AI responses:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/ai/responses/:responseId/feedback
 * AI cevabına feedback ver
 */
router.put(
  '/responses/:responseId/feedback',
  authenticateToken,
  [
    param('responseId').isUUID().withMessage('Invalid response ID'),
    body('feedbackType')
      .isIn(['helpful', 'not_helpful', 'incorrect', 'spam', 'inappropriate'])
      .withMessage('Invalid feedback type'),
    body('feedbackText').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { responseId } = req.params;
      const { feedbackType, feedbackText }: SubmitFeedbackRequest = req.body;
      const userId = req.user!.id;

      await aiService.submitFeedback(
        responseId,
        userId,
        feedbackType as FeedbackType,
        feedbackText
      );

      res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      logger.error('Failed to submit feedback:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/ai/responses/:responseId
 * AI cevabını sil (moderatör/admin)
 */
router.delete(
  '/responses/:responseId',
  authenticateToken,
  requireRole(['moderator', 'admin']),
  [
    param('responseId').isUUID().withMessage('Invalid response ID'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { responseId } = req.params;

      await deactivateAIResponse(responseId);

      res.json({
        success: true,
        message: 'AI response deactivated successfully'
      });

    } catch (error) {
      logger.error('Failed to deactivate AI response:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ai/config/categories
 * Tüm kategoriler için AI konfigürasyonunu getir
 */
router.get(
  '/config/categories',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const configs = await getAllAIConfigs();

      res.json({
        success: true,
        configs
      });

    } catch (error) {
      logger.error('Failed to get AI configs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/ai/config/categories/:categoryId
 * Kategori AI konfigürasyonunu güncelle
 */
router.put(
  '/config/categories/:categoryId',
  authenticateToken,
  requireRole(['admin']),
  [
    param('categoryId').isUUID().withMessage('Invalid category ID'),
    body('aiEnabled').isBoolean(),
    body('autoResponse').optional().isBoolean(),
    body('confidenceThreshold').optional().isFloat({ min: 0, max: 1 }),
    body('maxTokens').optional().isInt({ min: 100, max: 4000 }),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const configData: UpdateAIConfigRequest = req.body;

      const config = await updateAIConfig(categoryId, configData);

      res.json({
        success: true,
        config
      });

    } catch (error) {
      logger.error('Failed to update AI config:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ai/analytics
 * AI kullanım analitikleri
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole(['admin']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('category').optional().isString(),
    query('groupBy').optional().isIn(['day', 'week', 'month']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        category,
        groupBy = 'day'
      }: AIAnalyticsRequest = req.query as any;

      const analytics = await getAIAnalytics({
        startDate,
        endDate,
        category,
        groupBy
      });

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      logger.error('Failed to get AI analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ai/health
 * AI servis sağlık durumu
 */
router.get('/health', async (req, res) => {
  try {
    const health = await checkAIServiceHealth();

    res.json({
      success: true,
      health
    });

  } catch (error) {
    logger.error('Failed to check AI service health:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper functions (bu fonksiyonlar ayrı service dosyalarında implement edilecek)
async function getTopicDetails(topicId: string) {
  // Topic detaylarını getir
  // Bu fonksiyon forum service'de implement edilecek
  return null;
}

async function getExistingAIResponse(topicId: string) {
  // Mevcut AI cevabını getir
  return null;
}

async function getAIResponsesForTopic(topicId: string) {
  // Topic için tüm AI cevaplarını getir
  return [];
}

async function deactivateAIResponse(responseId: string) {
  // AI cevabını deaktive et
}

async function getAllAIConfigs() {
  // Tüm AI konfigürasyonlarını getir
  return [];
}

async function updateAIConfig(categoryId: string, configData: UpdateAIConfigRequest) {
  // AI konfigürasyonunu güncelle
  return null;
}

async function getAIAnalytics(params: AIAnalyticsRequest) {
  // AI analitiklerini getir
  return null;
}

async function checkAIServiceHealth() {
  // AI servis sağlığını kontrol et
  return {
    status: 'healthy',
    responseTime: 150,
    errorRate: 0.01,
    lastCheck: new Date().toISOString(),
    services: {
      geminiAPI: 'up',
      database: 'up',
      vectorDB: 'up'
    }
  };
}

export default router;
