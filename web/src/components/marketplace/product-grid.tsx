import { Product } from '@/types/marketplace.types';
import ProductCard from './product-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, RefreshCw } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  showWishlist?: boolean;
  onAddToCart?: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  wishlistItems?: string[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

export default function ProductGrid({
  products,
  loading = false,
  variant = 'default',
  showWishlist = true,
  onAddToCart,
  onToggleWishlist,
  wishlistItems = [],
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  emptyMessage = "Ürün bulunamadı",
  emptyDescription = "Aradığınız kriterlere uygun ürün bulunmuyor. Filtrelerinizi değiştirmeyi deneyin."
}: ProductGridProps) {
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} variant={variant} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {emptyMessage}
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {emptyDescription}
          </p>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Filtreleri Temizle
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Grid */}
      <div className={`grid gap-6 ${
        variant === 'compact' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            variant={variant}
            showWishlist={showWishlist}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            isInWishlist={wishlistItems.includes(product.id)}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            disabled={loadingMore}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Daha Fazla Ürün
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Product Card Skeleton Component
function ProductCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'featured' }) {
  const isCompact = variant === 'compact';
  
  return (
    <Card className="overflow-hidden">
      <div className="animate-pulse">
        {/* Image Skeleton */}
        <div className={`bg-gray-200 ${isCompact ? 'h-40' : 'h-48'}`} />
        
        <div className={`${isCompact ? 'p-3' : 'p-4'} space-y-3`}>
          {/* Seller Info Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
          
          {/* Title Skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
          
          {/* Description Skeleton (only for non-compact) */}
          {!isCompact && (
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          )}
          
          {/* Price Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-8" />
          </div>
          
          {/* Stats Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 bg-gray-200 rounded w-8" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          
          {/* Shipping Skeleton */}
          <div className="h-3 bg-gray-200 rounded w-24" />
          
          {/* Button Skeleton */}
          <div className={`h-${isCompact ? '8' : '10'} bg-gray-200 rounded w-full`} />
        </div>
      </div>
    </Card>
  );
}
