'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stockQuantity: number;
    images: Array<{
      imageUrl: string;
      isPrimary: boolean;
    }>;
    seller: {
      businessName: string;
      city: string;
    };
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
  };
}

interface CartSummary {
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  itemCount: number;
}

interface UseCartReturn {
  items: CartItem[];
  summary: CartSummary;
  isLoading: boolean;
  error: string | null;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate cart summary
  const summary: CartSummary = {
    subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    taxTotal: 0, // Will be calculated based on items
    shippingTotal: 0, // Will be calculated based on shipping method
    total: 0, // Will be calculated
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };

  // Calculate tax (18% VAT)
  summary.taxTotal = summary.subtotal * 0.18;
  
  // Calculate shipping (free over 500 TL)
  summary.shippingTotal = summary.subtotal >= 500 ? 0 : 15;
  
  // Calculate total
  summary.total = summary.subtotal + summary.taxTotal + summary.shippingTotal;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch cart items
  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ecommerce/cart', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart');
      }

      if (data.success) {
        setItems(data.data || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cart';
      setError(errorMessage);
      console.error('Cart fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add item to cart
  const addToCart = useCallback(async (
    productId: string,
    variantId?: string,
    quantity: number = 1
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ecommerce/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          productId,
          variantId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to cart');
      }

      if (data.success) {
        // Refresh cart to get updated items
        await refreshCart();
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to cart';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshCart]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ecommerce/cart/update/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update cart');
      }

      if (data.success) {
        // Update local state optimistically
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          )
        );
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart';
      setError(errorMessage);
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refresh cart to get correct state
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  }, [refreshCart, toast]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ecommerce/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove from cart');
      }

      if (data.success) {
        // Update local state optimistically
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        
        toast({
          title: 'Ürün sepetten çıkarıldı',
          description: 'Ürün başarıyla sepetinizden çıkarıldı.',
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from cart';
      setError(errorMessage);
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });

      // Refresh cart to get correct state
      await refreshCart();
    } finally {
      setIsLoading(false);
    }
  }, [refreshCart, toast]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ecommerce/cart/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear cart');
      }

      if (data.success) {
        setItems([]);
        
        toast({
          title: 'Sepet temizlendi',
          description: 'Tüm ürünler sepetinizden çıkarıldı.',
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(errorMessage);
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load cart on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshCart();
    }
  }, [refreshCart]);

  return {
    items,
    summary,
    isLoading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  };
}

// Hook for managing wishlist
export function useWishlist() {
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const toggleWishlist = useCallback(async (productId: string) => {
    setIsLoading(true);

    try {
      const isInWishlist = wishlistItems.includes(productId);
      const method = isInWishlist ? 'DELETE' : 'POST';
      const url = isInWishlist 
        ? `/api/ecommerce/wishlist/remove/${productId}`
        : '/api/ecommerce/wishlist/add';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: method === 'POST' ? JSON.stringify({ productId }) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update wishlist');
      }

      if (data.success) {
        setWishlistItems(prev => 
          isInWishlist 
            ? prev.filter(id => id !== productId)
            : [...prev, productId]
        );
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update wishlist';
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [wishlistItems, toast]);

  const isInWishlist = useCallback((productId: string) => {
    return wishlistItems.includes(productId);
  }, [wishlistItems]);

  return {
    wishlistItems,
    isLoading,
    toggleWishlist,
    isInWishlist,
  };
}
