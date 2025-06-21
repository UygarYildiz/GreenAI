import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  productService, 
  categoryService, 
  cartService, 
  orderService, 
  reviewService, 
  sellerService,
  wishlistService 
} from '@/services/marketplace-service';
import { ProductFilters } from '@/types/marketplace.types';

// Product Hooks
export const useProducts = (filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productService.getProduct(slug),
    enabled: !!slug,
  });
};

export const useFeaturedProducts = (limit: number = 8) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProductsByCategory = (categorySlug: string, filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ['products', 'category', categorySlug, filters],
    queryFn: () => productService.getProductsByCategory(categorySlug, filters),
    enabled: !!categorySlug,
  });
};

export const useProductsBySeller = (sellerId: string, filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ['products', 'seller', sellerId, filters],
    queryFn: () => productService.getProductsBySeller(sellerId, filters),
    enabled: !!sellerId,
  });
};

export const useSearchProducts = (query: string, filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ['products', 'search', query, filters],
    queryFn: () => productService.searchProducts(query, filters),
    enabled: !!query && query.length > 2,
  });
};

// Category Hooks
export const useCategories = () => {
  return useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: categoryService.getCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useCategory = (slug: string) => {
  return useQuery({
    queryKey: ['marketplace-category', slug],
    queryFn: () => categoryService.getCategory(slug),
    enabled: !!slug,
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: ['marketplace-categories', 'tree'],
    queryFn: categoryService.getCategoryTree,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Cart Hooks
export const useCart = () => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
    staleTime: 0, // Always fresh
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, quantity, shippingOptionId, notes }: {
      productId: string;
      quantity: number;
      shippingOptionId: string;
      notes?: string;
    }) => cartService.addToCart(productId, quantity, shippingOptionId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, quantity, shippingOptionId, notes }: {
      itemId: string;
      quantity: number;
      shippingOptionId?: string;
      notes?: string;
    }) => cartService.updateCartItem(itemId, quantity, shippingOptionId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemId: string) => cartService.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cartService.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

// Order Hooks
export const useOrders = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: () => orderService.getOrders(page, limit),
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => 
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// Review Hooks
export const useProductReviews = (productId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['product-reviews', productId, page, limit],
    queryFn: () => reviewService.getProductReviews(productId, page, limit),
    enabled: !!productId,
  });
};

export const useAddProductReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, reviewData }: {
      productId: string;
      reviewData: {
        rating: number;
        title: string;
        comment: string;
        images?: string[];
      };
    }) => reviewService.addProductReview(productId, reviewData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
    },
  });
};

export const useMarkReviewHelpful = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reviewId: string) => reviewService.markReviewHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    },
  });
};

// Seller Hooks
export const useSeller = (sellerId: string) => {
  return useQuery({
    queryKey: ['seller', sellerId],
    queryFn: () => sellerService.getSeller(sellerId),
    enabled: !!sellerId,
  });
};

export const useSellerReviews = (sellerId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['seller-reviews', sellerId, page, limit],
    queryFn: () => sellerService.getSellerReviews(sellerId, page, limit),
    enabled: !!sellerId,
  });
};

export const useTopSellers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['sellers', 'top', limit],
    queryFn: () => sellerService.getTopSellers(limit),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Wishlist Hooks
export const useWishlist = () => {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistService.getWishlist,
  });
};

export const useAddToWishlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: string) => wishlistService.addToWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: string) => wishlistService.removeFromWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

export const useIsInWishlist = (productId: string) => {
  return useQuery({
    queryKey: ['wishlist', 'check', productId],
    queryFn: () => wishlistService.isInWishlist(productId),
    enabled: !!productId,
  });
};
