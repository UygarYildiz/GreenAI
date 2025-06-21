import { apiClient } from '@/lib/api-client';
import { 
  Product, 
  ProductCategory, 
  ProductSearchResult, 
  ProductFilters,
  Cart,
  CartItem,
  Order,
  ProductReview,
  Seller
} from '@/types/marketplace.types';

// Product Services
export const productService = {
  // Get all products with filters
  getProducts: async (filters: ProductFilters = {}): Promise<ProductSearchResult> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/products?${params.toString()}`);
    return response.data;
  },

  // Get single product by slug
  getProduct: async (slug: string): Promise<Product> => {
    const response = await apiClient.get(`/marketplace/products/${slug}`);
    return response.data;
  },

  // Get featured products
  getFeaturedProducts: async (limit: number = 8): Promise<Product[]> => {
    const response = await apiClient.get(`/marketplace/products/featured?limit=${limit}`);
    return response.data;
  },

  // Get products by category
  getProductsByCategory: async (categorySlug: string, filters: ProductFilters = {}): Promise<ProductSearchResult> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/categories/${categorySlug}/products?${params.toString()}`);
    return response.data;
  },

  // Get products by seller
  getProductsBySeller: async (sellerId: string, filters: ProductFilters = {}): Promise<ProductSearchResult> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/sellers/${sellerId}/products?${params.toString()}`);
    return response.data;
  },

  // Search products
  searchProducts: async (query: string, filters: ProductFilters = {}): Promise<ProductSearchResult> => {
    const params = new URLSearchParams({ q: query });
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/marketplace/products/search?${params.toString()}`);
    return response.data;
  },
};

// Category Services
export const categoryService = {
  // Get all categories
  getCategories: async (): Promise<ProductCategory[]> => {
    const response = await apiClient.get('/marketplace/categories');
    return response.data;
  },

  // Get category by slug
  getCategory: async (slug: string): Promise<ProductCategory> => {
    const response = await apiClient.get(`/marketplace/categories/${slug}`);
    return response.data;
  },

  // Get category tree
  getCategoryTree: async (): Promise<ProductCategory[]> => {
    const response = await apiClient.get('/marketplace/categories/tree');
    return response.data;
  },
};

// Cart Services
export const cartService = {
  // Get user's cart
  getCart: async (): Promise<Cart> => {
    const response = await apiClient.get('/marketplace/cart');
    return response.data;
  },

  // Add item to cart
  addToCart: async (productId: string, quantity: number, shippingOptionId: string, notes?: string): Promise<Cart> => {
    const response = await apiClient.post('/marketplace/cart/items', {
      productId,
      quantity,
      shippingOptionId,
      notes,
    });
    return response.data;
  },

  // Update cart item
  updateCartItem: async (itemId: string, quantity: number, shippingOptionId?: string, notes?: string): Promise<Cart> => {
    const response = await apiClient.put(`/marketplace/cart/items/${itemId}`, {
      quantity,
      shippingOptionId,
      notes,
    });
    return response.data;
  },

  // Remove item from cart
  removeFromCart: async (itemId: string): Promise<Cart> => {
    const response = await apiClient.delete(`/marketplace/cart/items/${itemId}`);
    return response.data;
  },

  // Clear cart
  clearCart: async (): Promise<void> => {
    await apiClient.delete('/marketplace/cart');
  },
};

// Order Services
export const orderService = {
  // Get user's orders
  getOrders: async (page: number = 1, limit: number = 10): Promise<{ data: Order[]; total: number; page: number; totalPages: number }> => {
    const response = await apiClient.get(`/marketplace/orders?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get single order
  getOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(`/marketplace/orders/${orderId}`);
    return response.data;
  },

  // Create order from cart
  createOrder: async (orderData: {
    shippingAddress: any;
    billingAddress: any;
    paymentMethod: any;
    notes?: string;
  }): Promise<Order> => {
    const response = await apiClient.post('/marketplace/orders', orderData);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId: string, reason: string): Promise<Order> => {
    const response = await apiClient.post(`/marketplace/orders/${orderId}/cancel`, { reason });
    return response.data;
  },
};

// Review Services
export const reviewService = {
  // Get product reviews
  getProductReviews: async (productId: string, page: number = 1, limit: number = 10): Promise<{ data: ProductReview[]; total: number; page: number; totalPages: number }> => {
    const response = await apiClient.get(`/marketplace/products/${productId}/reviews?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Add product review
  addProductReview: async (productId: string, reviewData: {
    rating: number;
    title: string;
    comment: string;
    images?: string[];
  }): Promise<ProductReview> => {
    const response = await apiClient.post(`/marketplace/products/${productId}/reviews`, reviewData);
    return response.data;
  },

  // Update review helpful count
  markReviewHelpful: async (reviewId: string): Promise<void> => {
    await apiClient.post(`/marketplace/reviews/${reviewId}/helpful`);
  },
};

// Seller Services
export const sellerService = {
  // Get seller profile
  getSeller: async (sellerId: string): Promise<Seller> => {
    const response = await apiClient.get(`/marketplace/sellers/${sellerId}`);
    return response.data;
  },

  // Get seller reviews
  getSellerReviews: async (sellerId: string, page: number = 1, limit: number = 10): Promise<{ data: ProductReview[]; total: number; page: number; totalPages: number }> => {
    const response = await apiClient.get(`/marketplace/sellers/${sellerId}/reviews?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get top sellers
  getTopSellers: async (limit: number = 10): Promise<Seller[]> => {
    const response = await apiClient.get(`/marketplace/sellers/top?limit=${limit}`);
    return response.data;
  },
};

// Wishlist Services
export const wishlistService = {
  // Get user's wishlist
  getWishlist: async (): Promise<Product[]> => {
    const response = await apiClient.get('/marketplace/wishlist');
    return response.data;
  },

  // Add to wishlist
  addToWishlist: async (productId: string): Promise<void> => {
    await apiClient.post('/marketplace/wishlist', { productId });
  },

  // Remove from wishlist
  removeFromWishlist: async (productId: string): Promise<void> => {
    await apiClient.delete(`/marketplace/wishlist/${productId}`);
  },

  // Check if product is in wishlist
  isInWishlist: async (productId: string): Promise<boolean> => {
    const response = await apiClient.get(`/marketplace/wishlist/check/${productId}`);
    return response.data.isInWishlist;
  },
};
