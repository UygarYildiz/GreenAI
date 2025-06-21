import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { EcommerceService } from '../services/ecommerceService';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductFilters,
  AddToCartRequest,
  CreateOrderRequest
} from '../types/ecommerce';

const router = Router();
const ecommerceService = new EcommerceService();

// Rate limiting for e-commerce endpoints
const ecommerceRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per user
  message: 'Too many e-commerce requests, please try again later',
});

// ==================== PRODUCT ROUTES ====================

/**
 * GET /api/ecommerce/products
 * Ürün listesi getir (filtreleme ve arama ile)
 */
router.get(
  '/products',
  [
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('sellerId').optional().isUUID(),
    query('city').optional().isString(),
    query('featured').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const filters: ProductFilters = req.query as any;
      const result = await ecommerceService.getProducts(filters);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
          page: filters.page || 1,
          limit: filters.limit || 20
        }
      });

    } catch (error) {
      logger.error('Failed to get products:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ecommerce/products/:id
 * Ürün detayı getir
 */
router.get(
  '/products/:id',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await ecommerceService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Failed to get product:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/ecommerce/products
 * Yeni ürün oluştur (satıcı)
 */
router.post(
  '/products',
  ecommerceRateLimit,
  authenticateToken,
  requireRole(['seller', 'admin']),
  [
    body('name').isString().isLength({ min: 3, max: 255 }),
    body('categoryId').isUUID(),
    body('description').isString().isLength({ min: 10 }),
    body('shortDescription').optional().isString().isLength({ max: 500 }),
    body('price').isFloat({ min: 0 }),
    body('comparePrice').optional().isFloat({ min: 0 }),
    body('stockQuantity').isInt({ min: 0 }),
    body('weight').optional().isFloat({ min: 0 }),
    body('tags').optional().isArray(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const productData: CreateProductRequest = req.body;
      const sellerId = req.user!.sellerId; // Assuming user has sellerId

      if (!sellerId) {
        return res.status(403).json({
          success: false,
          error: 'Seller profile required'
        });
      }

      const product = await ecommerceService.createProduct(sellerId, productData);

      res.status(201).json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Failed to create product:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// ==================== CART ROUTES ====================

/**
 * GET /api/ecommerce/cart
 * Sepet içeriğini getir
 */
router.get(
  '/cart',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const cartItems = await ecommerceService.getCart(userId);

      res.json({
        success: true,
        data: cartItems
      });

    } catch (error) {
      logger.error('Failed to get cart:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/ecommerce/cart/add
 * Sepete ürün ekle
 */
router.post(
  '/cart/add',
  ecommerceRateLimit,
  authenticateToken,
  [
    body('productId').isUUID(),
    body('variantId').optional().isUUID(),
    body('quantity').isInt({ min: 1 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { productId, variantId, quantity }: AddToCartRequest = req.body;
      const userId = req.user!.id;

      const cartItem = await ecommerceService.addToCart(
        userId,
        productId,
        variantId,
        quantity
      );

      res.json({
        success: true,
        data: cartItem,
        message: 'Product added to cart'
      });

    } catch (error) {
      logger.error('Failed to add to cart:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add to cart'
      });
    }
  }
);

/**
 * DELETE /api/ecommerce/cart/remove/:itemId
 * Sepetten ürün çıkar
 */
router.delete(
  '/cart/remove/:itemId',
  authenticateToken,
  [
    param('itemId').isUUID(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user!.id;

      // Implementation needed in service
      // await ecommerceService.removeFromCart(userId, itemId);

      res.json({
        success: true,
        message: 'Product removed from cart'
      });

    } catch (error) {
      logger.error('Failed to remove from cart:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== ORDER ROUTES ====================

/**
 * POST /api/ecommerce/orders
 * Sipariş oluştur
 */
router.post(
  '/orders',
  ecommerceRateLimit,
  authenticateToken,
  [
    body('billingAddress.firstName').isString().isLength({ min: 2 }),
    body('billingAddress.lastName').isString().isLength({ min: 2 }),
    body('billingAddress.address1').isString().isLength({ min: 5 }),
    body('billingAddress.city').isString().isLength({ min: 2 }),
    body('billingAddress.postalCode').isString().isLength({ min: 5 }),
    body('billingAddress.phone').isString(),
    body('billingAddress.email').isEmail(),
    body('paymentMethod').isString(),
    body('shippingMethod').isString(),
    body('customerNote').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const orderData: CreateOrderRequest = req.body;
      const userId = req.user!.id;

      const order = await ecommerceService.createOrder(userId, orderData);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });

    } catch (error) {
      logger.error('Failed to create order:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order'
      });
    }
  }
);

/**
 * GET /api/ecommerce/orders
 * Kullanıcı siparişleri
 */
router.get(
  '/orders',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10, status } = req.query;

      // Implementation needed in service
      // const orders = await ecommerceService.getUserOrders(userId, { page, limit, status });

      res.json({
        success: true,
        data: [], // orders
        pagination: {
          page: Number(page),
          limit: Number(limit)
        }
      });

    } catch (error) {
      logger.error('Failed to get orders:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ecommerce/orders/:id
 * Sipariş detayı
 */
router.get(
  '/orders/:id',
  authenticateToken,
  [
    param('id').isUUID(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Implementation needed in service
      // const order = await ecommerceService.getOrderById(id, userId);

      res.json({
        success: true,
        data: null // order
      });

    } catch (error) {
      logger.error('Failed to get order:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ==================== SELLER ROUTES ====================

/**
 * GET /api/ecommerce/seller/profile
 * Satıcı profili getir
 */
router.get(
  '/seller/profile',
  authenticateToken,
  requireRole(['seller', 'admin']),
  async (req, res) => {
    try {
      const sellerId = req.user!.sellerId;

      if (!sellerId) {
        return res.status(404).json({
          success: false,
          error: 'Seller profile not found'
        });
      }

      const profile = await ecommerceService.getSellerProfile(sellerId);

      res.json({
        success: true,
        data: profile
      });

    } catch (error) {
      logger.error('Failed to get seller profile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/ecommerce/seller/products
 * Satıcının ürünleri
 */
router.get(
  '/seller/products',
  authenticateToken,
  requireRole(['seller', 'admin']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const sellerId = req.user!.sellerId;
      const filters: ProductFilters = {
        ...req.query as any,
        sellerId
      };

      const result = await ecommerceService.getProducts(filters);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
          page: filters.page || 1,
          limit: filters.limit || 20
        }
      });

    } catch (error) {
      logger.error('Failed to get seller products:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
