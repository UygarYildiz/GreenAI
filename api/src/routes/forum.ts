import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ForumService } from '../services/forumService';
import { authenticateToken, requireRole } from '../middleware/security';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTopicRequest,
  UpdateTopicRequest,
  CreateReplyRequest,
  UpdateReplyRequest,
  TopicFilters,
  ReplyFilters,
  PaginationParams
} from '../types/forum';

const router = Router();
const forumService = new ForumService();

// Rate limiting for forum endpoints
const forumRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per user
  message: 'Too many forum requests, please try again later',
});

// ==================== CATEGORY ROUTES ====================

/**
 * GET /api/forum/categories
 * Tüm kategorileri getir
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await forumService.getCategories();

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Failed to get categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/forum/categories/:id
 * Kategori detayını getir
 */
router.get('/categories/:id', [
  param('id').isUUID().withMessage('Invalid category ID')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await forumService.getCategoryById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    logger.error('Failed to get category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/forum/categories
 * Yeni kategori oluştur (admin only)
 */
router.post('/categories',
  authenticateToken,
  requireRole(['admin']),
  [
    body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('icon').optional().isLength({ max: 50 }).withMessage('Icon must be less than 50 characters'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('parentId').optional().isUUID().withMessage('Invalid parent ID'),
    body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a positive integer')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const categoryData: CreateCategoryRequest = req.body;

      const category = await forumService.createCategory(categoryData, userId);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } catch (error) {
      logger.error('Failed to create category:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== TOPIC ROUTES ====================

/**
 * GET /api/forum/topics
 * Konuları getir (filtreleme ve sayfalama ile)
 */
router.get('/topics', [
  query('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  query('authorId').optional().isUUID().withMessage('Invalid author ID'),
  query('tags').optional().isArray().withMessage('Tags must be an array'),
  query('isPinned').optional().isBoolean().withMessage('isPinned must be boolean'),
  query('isLocked').optional().isBoolean().withMessage('isLocked must be boolean'),
  query('isSolved').optional().isBoolean().withMessage('isSolved must be boolean'),
  query('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
  query('search').optional().isLength({ min: 2, max: 100 }).withMessage('Search must be 2-100 characters'),
  query('sortBy').optional().isIn(['latest', 'oldest', 'popular', 'most_replies', 'most_likes']).withMessage('Invalid sort option'),
  query('timeRange').optional().isIn(['today', 'week', 'month', 'year', 'all']).withMessage('Invalid time range'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], validateRequest, async (req, res) => {
  try {
    const filters: TopicFilters = {
      categoryId: req.query.categoryId as string,
      authorId: req.query.authorId as string,
      tags: req.query.tags as string[],
      isPinned: req.query.isPinned === 'true',
      isLocked: req.query.isLocked === 'true',
      isSolved: req.query.isSolved === 'true',
      isFeatured: req.query.isFeatured === 'true',
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      timeRange: req.query.timeRange as any
    };

    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await forumService.getTopics(filters, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    logger.error('Failed to get topics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/forum/topics/:slug
 * Konu detayını getir
 */
router.get('/topics/:slug', [
  param('slug').isLength({ min: 1, max: 255 }).withMessage('Invalid topic slug')
], validateRequest, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;

    const topic = await forumService.getTopicBySlug(slug, userId);

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    res.json({
      success: true,
      data: topic
    });

  } catch (error) {
    logger.error('Failed to get topic:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/forum/topics
 * Yeni konu oluştur
 */
router.post('/topics',
  forumRateLimit,
  authenticateToken,
  [
    body('title').isLength({ min: 5, max: 255 }).withMessage('Title must be 5-255 characters'),
    body('content').isLength({ min: 10, max: 50000 }).withMessage('Content must be 10-50000 characters'),
    body('categoryId').isUUID().withMessage('Invalid category ID'),
    body('tags').optional().isArray({ max: 10 }).withMessage('Maximum 10 tags allowed'),
    body('metaTitle').optional().isLength({ max: 255 }).withMessage('Meta title must be less than 255 characters'),
    body('metaDescription').optional().isLength({ max: 500 }).withMessage('Meta description must be less than 500 characters'),
    body('mediaFiles').optional().isArray().withMessage('Media files must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const topicData: CreateTopicRequest = req.body;

      const topic = await forumService.createTopic(topicData, userId);

      res.status(201).json({
        success: true,
        message: 'Topic created successfully',
        data: topic
      });

    } catch (error) {
      logger.error('Failed to create topic:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create topic';
      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * PUT /api/forum/topics/:id
 * Konuyu güncelle
 */
router.put('/topics/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid topic ID'),
    body('title').optional().isLength({ min: 5, max: 255 }).withMessage('Title must be 5-255 characters'),
    body('content').optional().isLength({ min: 10, max: 50000 }).withMessage('Content must be 10-50000 characters'),
    body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
    body('tags').optional().isArray({ max: 10 }).withMessage('Maximum 10 tags allowed'),
    body('isPinned').optional().isBoolean().withMessage('isPinned must be boolean'),
    body('isLocked').optional().isBoolean().withMessage('isLocked must be boolean'),
    body('isSolved').optional().isBoolean().withMessage('isSolved must be boolean'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData: UpdateTopicRequest = req.body;

      const topic = await forumService.updateTopic(id, updateData, userId);

      res.json({
        success: true,
        message: 'Topic updated successfully',
        data: topic
      });

    } catch (error) {
      logger.error('Failed to update topic:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update topic';
      const statusCode = errorMessage.includes('not found') ? 404 : 
                        errorMessage.includes('Unauthorized') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

// ==================== REPLY ROUTES ====================

/**
 * GET /api/forum/topics/:topicId/replies
 * Konunun yorumlarını getir
 */
router.get('/topics/:topicId/replies', [
  param('topicId').isUUID().withMessage('Invalid topic ID'),
  query('parentId').optional().isUUID().withMessage('Invalid parent ID'),
  query('sortBy').optional().isIn(['oldest', 'newest', 'most_likes']).withMessage('Invalid sort option'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], validateRequest, async (req, res) => {
  try {
    const { topicId } = req.params;
    
    const filters: ReplyFilters = {
      topicId,
      parentId: req.query.parentId as string,
      sortBy: req.query.sortBy as any
    };

    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await forumService.getReplies(topicId, filters, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    logger.error('Failed to get replies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/forum/topics/:topicId/replies
 * Yeni yorum oluştur
 */
router.post('/topics/:topicId/replies',
  forumRateLimit,
  authenticateToken,
  [
    param('topicId').isUUID().withMessage('Invalid topic ID'),
    body('content').isLength({ min: 5, max: 10000 }).withMessage('Content must be 5-10000 characters'),
    body('parentId').optional().isUUID().withMessage('Invalid parent ID'),
    body('mediaFiles').optional().isArray().withMessage('Media files must be an array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { topicId } = req.params;
      const userId = req.user!.userId;
      
      const replyData: CreateReplyRequest = {
        ...req.body,
        topicId
      };

      const reply = await forumService.createReply(replyData, userId);

      res.status(201).json({
        success: true,
        message: 'Reply created successfully',
        data: reply
      });

    } catch (error) {
      logger.error('Failed to create reply:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reply';
      const statusCode = errorMessage.includes('not found') ? 404 : 
                        errorMessage.includes('locked') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

/**
 * PUT /api/forum/replies/:id
 * Yorumu güncelle
 */
router.put('/replies/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid reply ID'),
    body('content').optional().isLength({ min: 5, max: 10000 }).withMessage('Content must be 5-10000 characters'),
    body('editReason').optional().isLength({ max: 200 }).withMessage('Edit reason must be less than 200 characters'),
    body('isSolution').optional().isBoolean().withMessage('isSolution must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const updateData: UpdateReplyRequest = req.body;

      const reply = await forumService.updateReply(id, updateData, userId);

      res.json({
        success: true,
        message: 'Reply updated successfully',
        data: reply
      });

    } catch (error) {
      logger.error('Failed to update reply:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to update reply';
      const statusCode = errorMessage.includes('not found') ? 404 :
                        errorMessage.includes('Unauthorized') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: errorMessage
      });
    }
  }
);

// ==================== INTERACTION ROUTES ====================

/**
 * POST /api/forum/like
 * Beğeni ekle/kaldır
 */
router.post('/like',
  forumRateLimit,
  authenticateToken,
  [
    body('targetType').isIn(['topic', 'reply']).withMessage('Target type must be topic or reply'),
    body('targetId').isUUID().withMessage('Invalid target ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { targetType, targetId } = req.body;

      const isLiked = await forumService.toggleLike(userId, targetType, targetId);

      res.json({
        success: true,
        message: isLiked ? 'Like added' : 'Like removed',
        data: { isLiked }
      });

    } catch (error) {
      logger.error('Failed to toggle like:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/forum/bookmark
 * Yer imi ekle/kaldır
 */
router.post('/bookmark',
  forumRateLimit,
  authenticateToken,
  [
    body('topicId').isUUID().withMessage('Invalid topic ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { topicId } = req.body;

      const isBookmarked = await forumService.toggleBookmark(userId, topicId);

      res.json({
        success: true,
        message: isBookmarked ? 'Bookmark added' : 'Bookmark removed',
        data: { isBookmarked }
      });

    } catch (error) {
      logger.error('Failed to toggle bookmark:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/forum/subscribe
 * Konu takibi ekle/kaldır
 */
router.post('/subscribe',
  forumRateLimit,
  authenticateToken,
  [
    body('topicId').isUUID().withMessage('Invalid topic ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { topicId } = req.body;

      const isSubscribed = await forumService.toggleSubscription(userId, topicId);

      res.json({
        success: true,
        message: isSubscribed ? 'Subscription added' : 'Subscription removed',
        data: { isSubscribed }
      });

    } catch (error) {
      logger.error('Failed to toggle subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/forum/search
 * Forum içeriği arama
 */
router.get('/search', [
  query('q').isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters'),
  query('type').optional().isIn(['topics', 'replies', 'all']).withMessage('Invalid search type'),
  query('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], validateRequest, async (req, res) => {
  try {
    const searchQuery = req.query.q as string;
    const searchType = req.query.type as string || 'all';
    const categoryId = req.query.categoryId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const results = await forumService.searchContent(searchQuery, {
      type: searchType,
      categoryId,
      page,
      limit
    });

    res.json({
      success: true,
      data: results.data,
      pagination: results.pagination
    });

  } catch (error) {
    logger.error('Failed to search forum content:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/forum/stats
 * Forum istatistikleri
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await forumService.getForumStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get forum stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/forum/categories/:id/stats
 * Kategori istatistikleri
 */
router.get('/categories/:id/stats', [
  param('id').isUUID().withMessage('Invalid category ID')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await forumService.getCategoryStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get category stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/forum/users/:id/stats
 * Kullanıcı forum istatistikleri
 */
router.get('/users/:id/stats', [
  param('id').isUUID().withMessage('Invalid user ID')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await forumService.getUserForumStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get user forum stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
